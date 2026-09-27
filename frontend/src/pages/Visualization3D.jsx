import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { fromBlob } from "geotiff";

const DEFAULT_DTM = "/data/mckinley/dtm_I_11.tif";

const defaultInputs = {
  mineDepth: 120,
  seamDepth: 80,
  seamThickness: 4.5,
  benchHeight: 10,
  benchWidth: 25,
  benchFaceAngle: 60,
  pitLength: 800,
  pitWidth: 800,
  verticalExaggeration: 1.0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function makeGrid(values, width, height) {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const v = Number(values[i]);
    out[i] = Number.isFinite(v) ? v : NaN;
  }
  return out;
}

function stats(values) {
  const valid = [];
  for (const v of values) if (Number.isFinite(v)) valid.push(v);
  if (!valid.length) return { min: 0, max: 0, mean: 0, count: 0 };
  let min = valid[0], max = valid[0], sum = 0;
  for (const v of valid) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, mean: sum / valid.length, count: valid.length };
}

function makeHillshade(grid, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);
  const s = stats(grid);
  const range = Math.max(0.001, s.max - s.min);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const z = grid[i];
      if (!Number.isFinite(z)) {
        out[i * 4] = 235;
        out[i * 4 + 1] = 235;
        out[i * 4 + 2] = 235;
        out[i * 4 + 3] = 255;
        continue;
      }

      const xm = grid[y * width + Math.max(0, x - 1)];
      const xp = grid[y * width + Math.min(width - 1, x + 1)];
      const ym = grid[Math.max(0, y - 1) * width + x];
      const yp = grid[Math.min(height - 1, y + 1) * width + x];

      const dx = (Number.isFinite(xp) ? xp : z) - (Number.isFinite(xm) ? xm : z);
      const dy = (Number.isFinite(yp) ? yp : z) - (Number.isFinite(ym) ? ym : z);

      const slope = Math.atan(Math.sqrt(dx * dx + dy * dy) / Math.max(1, range / Math.max(width, height)));
      const aspect = Math.atan2(dy, -dx);

      const azimuth = 315 * Math.PI / 180;
      const altitude = 45 * Math.PI / 180;

      const illumination =
        Math.sin(altitude) * Math.cos(slope) +
        Math.cos(altitude) * Math.sin(slope) * Math.cos(azimuth - aspect);

      const normalized = clamp(0.45 + illumination * 0.55, 0, 1);
      const elev = (z - s.min) / range;

      const r = Math.round(55 + 155 * normalized * (0.7 + 0.3 * elev));
      const g = Math.round(75 + 150 * normalized * (0.7 + 0.3 * elev));
      const b = Math.round(85 + 130 * normalized * (0.75 + 0.25 * elev));

      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = 255;
    }
  }
  return out;
}

function lerpPoint(x1, y1, z1, x2, y2, z2, level) {
  const d = z2 - z1;
  const t = Math.abs(d) < 1e-12 ? 0.5 : (level - z1) / d;
  return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
}

function addSegment(segments, p1, p2) {
  if (p1 && p2) segments.push([p1, p2]);
}

function contourSegments(grid, width, height, level) {
  const segments = [];
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = grid[y * width + x];
      const b = grid[y * width + x + 1];
      const c = grid[(y + 1) * width + x + 1];
      const d = grid[(y + 1) * width + x];
      if (![a, b, c, d].every(Number.isFinite)) continue;

      const index =
        (a >= level ? 8 : 0) |
        (b >= level ? 4 : 0) |
        (c >= level ? 2 : 0) |
        (d >= level ? 1 : 0);

      if (index === 0 || index === 15) continue;

      const top = () => lerpPoint(x, y, a, x + 1, y, b, level);
      const right = () => lerpPoint(x + 1, y, b, x + 1, y + 1, c, level);
      const bottom = () => lerpPoint(x + 1, y + 1, c, x, y + 1, d, level);
      const left = () => lerpPoint(x, y + 1, d, x, y, a, level);

      const T = top(), R = right(), B = bottom(), L = left();

      const table = {
        1: [[L, B]], 2: [[B, R]], 3: [[L, R]],
        4: [[T, R]], 5: [[T, L], [B, R]],
        6: [[T, B]], 7: [[T, L]],
        8: [[T, L]], 9: [[T, B]], 10: [[T, R], [L, B]],
        11: [[T, R]], 12: [[L, R]], 13: [[B, R]],
        14: [[L, B]],
      };

      for (const pair of table[index] || []) addSegment(segments, pair[0], pair[1]);
    }
  }
  return segments;
}

function createDesignRings(inputs, terrain) {
  const rings = [];
  const depth = Math.max(1, Number(inputs.mineDepth));
  const benchH = Math.max(0.5, Number(inputs.benchHeight));
  const benchW = Math.max(0.5, Number(inputs.benchWidth));
  const levels = Math.max(1, Math.ceil(depth / benchH));

  const maxHalfX = terrain.widthMeters / 2;
  const maxHalfY = terrain.heightMeters / 2;

  const topHalfX = Math.min(Number(inputs.pitLength) / 2, maxHalfX * 0.85);
  const topHalfY = Math.min(Number(inputs.pitWidth) / 2, maxHalfY * 0.85);

  for (let level = 0; level <= levels; level++) {
    const zDepth = Math.min(depth, level * benchH);
    const inset = level * benchW;
    const hx = Math.max(2, topHalfX - inset);
    const hy = Math.max(2, topHalfY - inset);
    rings.push({
      depth: zDepth,
      hx: Math.min(hx, maxHalfX),
      hy: Math.min(hy, maxHalfY),
    });
  }
  return rings;
}

function addRectRing(group, ring, z, scale = 1) {
  const pts = [
    [-ring.hx * scale, -ring.hy * scale, z],
    [ ring.hx * scale, -ring.hy * scale, z],
    [ ring.hx * scale,  ring.hy * scale, z],
    [-ring.hx * scale,  ring.hy * scale, z],
    [-ring.hx * scale, -ring.hy * scale, z],
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3));
  const material = new THREE.LineBasicMaterial({ color: 0x202020 });
  group.add(new THREE.Line(geometry, material));
}

function buildPitModel(terrain, inputs, verticalExaggeration) {
  const group = new THREE.Group();
  const rings = createDesignRings(inputs, terrain);

  const baseZ = terrain.max - Number(inputs.mineDepth);

  rings.forEach((ring, index) => {
    const z = (terrain.max - ring.depth - terrain.min) * verticalExaggeration;
    addRectRing(group, ring, z);

    if (index > 0) {
      const prev = rings[index - 1];
      const prevZ = (terrain.max - prev.depth - terrain.min) * verticalExaggeration;

      const verts = [];
      const corners = [
        [-1, -1], [1, -1], [1, 1], [-1, 1],
      ];
      for (let i = 0; i < 4; i++) {
        const [sx, sy] = corners[i];
        const [px, py] = corners[i];
        verts.push(
          px * prev.hx, py * prev.hy, prevZ,
          sx * ring.hx, sy * ring.hy, z
        );
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
      const material = new THREE.LineBasicMaterial({ color: 0x555555 });
      group.add(new THREE.LineSegments(geometry, material));
    }
  });

  // Bottom design plane.
  const last = rings[rings.length - 1];
  const bottomZ = (terrain.max - last.depth - terrain.min) * verticalExaggeration;
  const planeGeo = new THREE.PlaneGeometry(last.hx * 2, last.hy * 2);
  const planeMat = new THREE.MeshBasicMaterial({
    color: 0x9b9b9b,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = bottomZ;
  plane.position.z = 0;
  // In our terrain coordinate system Y is vertical, so PlaneGeometry lies in X/Y.
  // Rotate it around X so it becomes X/Z.
  plane.position.y = bottomZ;
  group.add(plane);

  group.userData.baseZ = baseZ;
  group.userData.ringCount = rings.length;
  return group;
}

async function readDTM(fileOrUrl, maxSize = 220) {
  let tiff;
  if (fileOrUrl instanceof File) {
    tiff = await fromBlob(fileOrUrl);
  } else {
    const response = await fetch(fileOrUrl);
    if (!response.ok) throw new Error(`DTM file could not be loaded (${response.status}).`);
    const blob = await response.blob();
    tiff = await fromBlob(blob);
  }

  const image = await tiff.getImage();
  const srcWidth = image.getWidth();
  const srcHeight = image.getHeight();

  const scale = Math.min(1, maxSize / Math.max(srcWidth, srcHeight));
  const width = Math.max(2, Math.round(srcWidth * scale));
  const height = Math.max(2, Math.round(srcHeight * scale));

  const raster = await image.readRasters({
    samples: [0],
    width,
    height,
    interleave: true,
  });

  const grid = makeGrid(raster, width, height);
  const bbox = image.getBoundingBox();

  let validCount = 0;
  for (const v of grid) if (Number.isFinite(v)) validCount++;

  if (!validCount) throw new Error("The selected DTM contains no valid elevation cells.");

  return {
    grid,
    width,
    height,
    sourceWidth: srcWidth,
    sourceHeight: srcHeight,
    bbox: {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
    },
    ...stats(grid),
  };
}

function draw2DMap(canvas, terrain, inputs, showContours = true) {
  if (!canvas || !terrain) return;

  const ctx = canvas.getContext("2d");
  const cssWidth = canvas.clientWidth || 900;
  const cssHeight = canvas.clientHeight || 560;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const margin = 52;
  const mapW = cssWidth - margin * 2;
  const mapH = cssHeight - margin * 2;

  const shade = makeHillshade(terrain.grid, terrain.width, terrain.height);
  const image = ctx.createImageData(terrain.width, terrain.height);
  image.data.set(shade);

  const tmp = document.createElement("canvas");
  tmp.width = terrain.width;
  tmp.height = terrain.height;
  tmp.getContext("2d").putImageData(image, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tmp, margin, margin, mapW, mapH);

  const pxX = (x) => margin + ((x + terrain.widthMeters / 2) / terrain.widthMeters) * mapW;
  const pxY = (y) => margin + ((terrain.heightMeters / 2 - y) / terrain.heightMeters) * mapH;

  if (showContours) {
    const interval = Math.max(2, Math.round((terrain.max - terrain.min) / 12));
    const first = Math.ceil(terrain.min / interval) * interval;

    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(20,20,20,0.62)";
    ctx.font = "10px Arial";

    for (let level = first; level <= terrain.max; level += interval) {
      const segments = contourSegments(terrain.grid, terrain.width, terrain.height, level);

      ctx.beginPath();

      for (const [[x1, y1], [x2, y2]] of segments) {
        const mx1 = (x1 / Math.max(1, terrain.width - 1) - 0.5) * terrain.widthMeters;
        const my1 = (0.5 - y1 / Math.max(1, terrain.height - 1)) * terrain.heightMeters;
        const mx2 = (x2 / Math.max(1, terrain.width - 1) - 0.5) * terrain.widthMeters;
        const my2 = (0.5 - y2 / Math.max(1, terrain.height - 1)) * terrain.heightMeters;

        ctx.moveTo(pxX(mx1), pxY(my1));
        ctx.lineTo(pxX(mx2), pxY(my2));
      }

      ctx.stroke();
    }
  }

  // The pit geometry is calculated from exactly the same parameters used by
  // the 3D design model. This keeps the 2D plan and 3D model synchronized.
  const geom = getPitGeometry(terrain, inputs);
  const hx = geom.pitLength / 2;
  const hz = geom.pitWidth / 2;

  const drawRect = (halfX, halfZ, lineWidth = 2, dash = []) => {
    ctx.save();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.rect(pxX(-halfX), pxY(halfZ), pxX(halfX) - pxX(-halfX), pxY(-halfZ) - pxY(halfZ));
    ctx.stroke();
    ctx.restore();
  };

  // Pit rim.
  drawRect(hx, hz, 2.5, [10, 7]);

  // Bench breaklines. Each ring uses face run + berm width, matching the
  // stepped design calculation used by the 3D model.
  const stepRun = geom.faceRun + geom.benchW;

  for (let level = 1; level <= geom.modeledLevels; level++) {
    const inset = level * stepRun;
    const innerX = hx - inset;
    const innerZ = hz - inset;

    if (innerX <= 2 || innerZ <= 2) continue;

    drawRect(innerX, innerZ, 1.5, []);

    // Place each label beside the right-hand bench edge so labels do not
    // stack on top of one another in the center of the mine plan.
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(
      pxX(innerX) + 5,
      pxY(innerZ) - 1,
      92,
      18
    );
    ctx.fillStyle = "#111";
    ctx.font = "bold 10px Arial";
    ctx.fillText(
      `L${level} • ${Math.min(geom.modeledDepth, level * geom.benchH).toFixed(0)} m`,
      pxX(innerX) + 9,
      pxY(innerZ) + 12
    );
    ctx.restore();
  }

  // Pit floor: after the final completed berms, the last face reaches the
  // modeled bottom. This outline is therefore derived from the same profile.
  const floorInset = Math.max(
    0,
    (geom.modeledLevels - 1) * stepRun + geom.faceRun
  );
  const floorHx = Math.max(2, hx - floorInset);
  const floorHz = Math.max(2, hz - floorInset);

  if (floorHx > 2 && floorHz > 2) {
    drawRect(floorHx, floorHz, 2, []);
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.fillRect(
      pxX(-floorHx) + 1,
      pxY(floorHz) + 1,
      Math.max(0, pxX(floorHx) - pxX(-floorHx) - 2),
      Math.max(0, pxY(-floorHz) - pxY(floorHz) - 2)
    );
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      pxX(-floorHx),
      pxY(floorHz),
      pxX(floorHx) - pxX(-floorHx),
      pxY(-floorHz) - pxY(floorHz)
    );
    ctx.fillStyle = "#111";
    ctx.font = "bold 11px Arial";
    const floorLabel = `PIT FLOOR • ${geom.modeledDepth.toFixed(1)} m depth`;
    const floorLabelWidth = ctx.measureText(floorLabel).width;
    ctx.fillText(
      floorLabel,
      (pxX(-floorHx) + pxX(floorHx)) / 2 - floorLabelWidth / 2,
      (pxY(floorHz) + pxY(-floorHz)) / 2
    );
    ctx.restore();
  }

  // A–B centerline used by the cross-section below.
  ctx.save();
  ctx.strokeStyle = "rgba(20,20,20,0.55)";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(pxX(-terrain.widthMeters / 2), pxY(0));
  ctx.lineTo(pxX(terrain.widthMeters / 2), pxY(0));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#111";
  ctx.font = "bold 11px Arial";
  ctx.fillText("A", margin + 5, pxY(0) - 7);
  ctx.fillText("B", cssWidth - margin - 14, pxY(0) - 7);
  ctx.restore();

  // North arrow.
  ctx.save();
  const nx = cssWidth - margin - 22;
  const ny = margin + 34;
  ctx.strokeStyle = "#111";
  ctx.fillStyle = "#111";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(nx, ny + 24);
  ctx.lineTo(nx, ny - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nx, ny - 7);
  ctx.lineTo(nx - 5, ny + 2);
  ctx.lineTo(nx + 5, ny + 2);
  ctx.closePath();
  ctx.fill();
  ctx.font = "bold 11px Arial";
  ctx.fillText("N", nx - 4, ny - 12);
  ctx.restore();

  // Title / legend.
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillRect(margin, 8, 440, 42);
  ctx.fillStyle = "#111";
  ctx.font = "bold 12px Arial";
  ctx.fillText("REAL DTM • CONTOURS • CALCULATED PIT / BENCH PLAN", margin + 8, 25);
  ctx.font = "10px Arial";
  ctx.fillText(
    `${geom.pitLength.toFixed(0)} × ${geom.pitWidth.toFixed(0)} m • ${geom.modeledLevels} modeled levels • ${geom.modeledDepth.toFixed(1)} m depth`,
    margin + 8,
    40
  );
  ctx.restore();

  // Actual coordinate bounds.
  ctx.fillStyle = "#111";
  ctx.font = "10px Arial";
  ctx.fillText(`${terrain.bbox.minX.toFixed(0)} E`, margin, cssHeight - 12);
  ctx.fillText(`${terrain.bbox.maxX.toFixed(0)} E`, cssWidth - margin - 75, cssHeight - 12);
  ctx.fillText(`${terrain.bbox.maxY.toFixed(0)} N`, 4, margin + 4);
  ctx.fillText(`${terrain.bbox.minY.toFixed(0)} N`, 4, cssHeight - margin);

  // Small engineering status note.
  ctx.font = "10px Arial";
  ctx.fillStyle = "#333";
  ctx.fillText(
    "Pit/bench outlines are calculated design geometry; terrain is real surveyed DTM.",
    margin,
    cssHeight - 28
  );
}

function getPitGeometry(terrain, inputs) {
  const widthMeters = Math.max(1, terrain.bbox.maxX - terrain.bbox.minX);
  const heightMeters = Math.max(1, terrain.bbox.maxY - terrain.bbox.minY);
  const pitLength = Math.min(Math.max(20, Number(inputs.pitLength) || 20), widthMeters * 0.90);
  const pitWidth = Math.min(Math.max(20, Number(inputs.pitWidth) || 20), heightMeters * 0.90);
  const requestedDepth = Math.max(0.1, Number(inputs.mineDepth) || 0);
  const benchH = Math.max(0.5, Number(inputs.benchHeight) || 0.5);
  const benchW = Math.max(0.5, Number(inputs.benchWidth) || 0.5);
  const faceAngle = clamp(Number(inputs.benchFaceAngle) || 60, 20, 80);
  const faceRun = benchH / Math.tan(faceAngle * Math.PI / 180);
  const requestedLevels = Math.max(1, Math.ceil(requestedDepth / benchH));
  const maxHalfX = pitLength / 2;
  const maxHalfZ = pitWidth / 2;
  const maxHorizontalRun = Math.min(maxHalfX, maxHalfZ) - 2;
  const stepRun = faceRun + benchW;
  const maxLevels = Math.max(1, Math.floor(Math.max(0, maxHorizontalRun - faceRun) / Math.max(0.1, stepRun)) + 1);
  const modeledLevels = Math.min(requestedLevels, maxLevels);
  const modeledDepth = Math.min(requestedDepth, modeledLevels * benchH);
  const requiredHalfExtent = faceRun + Math.max(0, requestedLevels - 1) * stepRun;
  const requiredPitDimension = requiredHalfExtent * 2;
  const availableDesignDimension = Math.min(pitLength, pitWidth);
  const depthFeasible =
    modeledLevels >= requestedLevels &&
    availableDesignDimension + 1e-9 >= requiredPitDimension;

  return {
    widthMeters,
    heightMeters,
    pitLength,
    pitWidth,
    requestedDepth,
    benchH,
    benchW,
    faceAngle,
    faceRun,
    requestedLevels,
    modeledLevels,
    modeledDepth,
    stepRun,
    requiredPitDimension,
    availableDesignDimension,
    depthFeasible,
  };
}

function sampleDTMAt(terrain, mx, mz) {
  const width = terrain.width;
  const height = terrain.height;
  const gx = ((mx / terrain.widthMeters) + 0.5) * (width - 1);
  const gy = ((mz / terrain.heightMeters) + 0.5) * (height - 1);
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(gy)));
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const v00 = Number(terrain.grid[y0 * width + x0]);
  const v10 = Number(terrain.grid[y0 * width + x1]);
  const v01 = Number(terrain.grid[y1 * width + x0]);
  const v11 = Number(terrain.grid[y1 * width + x1]);
  const a = Number.isFinite(v00) ? v00 : terrain.mean;
  const b = Number.isFinite(v10) ? v10 : a;
  const c = Number.isFinite(v01) ? v01 : a;
  const d = Number.isFinite(v11) ? v11 : c;
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

function pitRimElevation(terrain, geom, mx, mz) {
  const ax = Math.abs(mx);
  const az = Math.abs(mz);
  const hx = geom.pitLength / 2;
  const hz = geom.pitWidth / 2;
  if (hx - ax <= hz - az) {
    return sampleDTMAt(terrain, mx >= 0 ? hx : -hx, clamp(mz, -hz, hz));
  }
  return sampleDTMAt(terrain, clamp(mx, -hx, hx), mz >= 0 ? hz : -hz);
}

function pitDepthAt(terrain, geom, mx, mz) {
  const hx = geom.pitLength / 2;
  const hz = geom.pitWidth / 2;
  if (Math.abs(mx) > hx || Math.abs(mz) > hz) return 0;
  const edgeDistance = Math.min(hx - Math.abs(mx), hz - Math.abs(mz));
  let remaining = Math.max(0, edgeDistance);
  let depth = 0;
  const stepRun = geom.faceRun + geom.benchW;

  for (let level = 0; level < geom.modeledLevels && remaining > 0; level++) {
    const face = Math.min(geom.faceRun, remaining);
    depth = Math.min(geom.modeledDepth, level * geom.benchH + (face / Math.max(0.001, geom.faceRun)) * geom.benchH);
    remaining -= face;
    if (remaining <= 0 || depth >= geom.modeledDepth) break;
    const berm = Math.min(geom.benchW, remaining);
    depth = Math.min(geom.modeledDepth, (level + 1) * geom.benchH);
    remaining -= berm;
    if (remaining > 0 && stepRun > 0) {
      // Continue into the next face on the next loop iteration.
    }
  }
  return Math.min(geom.modeledDepth, depth);
}

function buildBenchSchedule(terrain, geom) {
  const rows = [];
  const maxLevels = Math.max(0, geom.modeledLevels);

  for (let level = 1; level <= maxLevels; level++) {
    const depth = Math.min(geom.modeledDepth, level * geom.benchH);
    rows.push({
      level,
      depth,
      elevation: terrain.max - depth,
      faceRun: geom.faceRun,
      bermWidth: geom.benchW,
      cumulativeStep: Math.min(
        geom.availableDesignDimension / 2,
        geom.faceRun + Math.max(0, level - 1) * geom.stepRun
      ),
    });
  }

  return rows;
}

function downloadCsv(filename, rows) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key];
          const text = value == null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function calculateCutVolume(terrain, inputs) {
  const geom = getPitGeometry(terrain, inputs);
  const nx = 90;
  const ny = 90;
  const dx = geom.pitLength / nx;
  const dy = geom.pitWidth / ny;
  let volume = 0;
  let cells = 0;
  for (let j = 0; j < ny; j++) {
    const mz = -geom.pitWidth / 2 + (j + 0.5) * dy;
    for (let i = 0; i < nx; i++) {
      const mx = -geom.pitLength / 2 + (i + 0.5) * dx;
      const depth = pitDepthAt(terrain, geom, mx, mz);
      if (depth <= 0) continue;
      const rim = pitRimElevation(terrain, geom, mx, mz);
      const existing = sampleDTMAt(terrain, mx, mz);
      const design = rim - depth;
      const cut = Math.max(0, existing - design);
      volume += cut * dx * dy;
      cells++;
    }
  }
  return { volume, cells, resolution: `${nx} × ${ny}` };
}

function drawCrossSection(canvas, terrain, inputs) {
  if (!canvas || !terrain) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.clientWidth || 900;
  const H = canvas.clientHeight || 360;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const geom = getPitGeometry(terrain, inputs);
  const margin = { left: 58, right: 24, top: 28, bottom: 42 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;
  const samples = 180;
  const half = Math.max(geom.pitLength / 2 + 150, terrain.widthMeters * 0.22);
  const xs = [];
  const existing = [];
  const design = [];
  for (let i = 0; i < samples; i++) {
    const x = -half + (2 * half * i) / (samples - 1);
    xs.push(x);
    const z0 = sampleDTMAt(terrain, x, 0);
    const depth = pitDepthAt(terrain, geom, x, 0);
    const zd = depth > 0 ? pitRimElevation(terrain, geom, x, 0) - depth : z0;
    existing.push(z0);
    design.push(zd);
  }

  const minZ = Math.min(...existing, ...design) - 5;
  const maxZ = Math.max(...existing, ...design) + 5;
  const xToPx = (x) => margin.left + ((x + half) / (2 * half)) * plotW;
  const zToPy = (z) => margin.top + ((maxZ - z) / Math.max(1, maxZ - minZ)) * plotH;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#d0d4d8";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin.left, margin.top, plotW, plotH);

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  existing.forEach((z, i) => {
    const px = xToPx(xs[i]), py = zToPy(z);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.strokeStyle = "#666";
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  design.forEach((z, i) => {
    const px = xToPx(xs[i]), py = zToPy(z);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const floorZ = terrain.max - geom.modeledDepth;
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xToPx(-geom.pitLength / 2), zToPy(floorZ));
  ctx.lineTo(xToPx(geom.pitLength / 2), zToPy(floorZ));
  ctx.stroke();

  ctx.fillStyle = "#111";
  ctx.font = "bold 12px Arial";
  ctx.fillText("A–B CENTERLINE CROSS-SECTION", margin.left + 8, 17);
  ctx.font = "11px Arial";
  ctx.fillText("REAL DTM", W - 145, 17);
  ctx.fillText("DESIGN SURFACE", W - 145, 33);
  ctx.fillText(`${minZ.toFixed(0)} m`, 8, H - margin.bottom);
  ctx.fillText(`${maxZ.toFixed(0)} m`, 8, margin.top + 5);
  ctx.fillText(`A  ${(-half).toFixed(0)} m`, margin.left, H - 14);
  ctx.fillText(`B  ${half.toFixed(0)} m`, W - 80, H - 14);
  ctx.font = "bold 11px Arial";
  ctx.fillText(`Depth ${geom.modeledDepth.toFixed(1)} m • ${geom.modeledLevels} levels • ${geom.faceAngle.toFixed(0)}° face`, margin.left + 8, H - 14);
}


function createTerrainAndDesignMesh(terrain, inputs, verticalExaggeration, showDesign) {
  const group = new THREE.Group();
  const width = terrain.width;
  const height = terrain.height;
  const widthMeters = Math.max(1, terrain.bbox.maxX - terrain.bbox.minX);
  const heightMeters = Math.max(1, terrain.bbox.maxY - terrain.bbox.minY);
  const ex = Math.max(0.25, Number(verticalExaggeration) || 1);
  const range = Math.max(1, terrain.max - terrain.min);

  const pitLength = Math.min(Math.max(20, Number(inputs.pitLength) || 20), widthMeters * 0.90);
  const pitWidth = Math.min(Math.max(20, Number(inputs.pitWidth) || 20), heightMeters * 0.90);
  const requestedDepth = Math.max(0.1, Number(inputs.mineDepth) || 0);
  const benchH = Math.max(0.5, Number(inputs.benchHeight) || 0.5);
  const benchW = Math.max(0.5, Number(inputs.benchWidth) || 0.5);
  const faceAngle = clamp(Number(inputs.benchFaceAngle) || 60, 20, 80);
  const angleRad = faceAngle * Math.PI / 180;
  const faceRun = benchH / Math.tan(angleRad);

  const requestedLevels = Math.max(1, Math.ceil(requestedDepth / benchH));
  const maxHalfX = pitLength / 2;
  const maxHalfZ = pitWidth / 2;
  const maxHorizontalRun = Math.min(maxHalfX, maxHalfZ) - 2;
  const horizontalPerLevel = faceRun + benchW;
  const maxLevelsByWidth = Math.max(
    1,
    Math.floor(Math.max(0, maxHorizontalRun - faceRun) / Math.max(0.1, horizontalPerLevel)) + 1
  );
  const feasibleLevels = Math.min(requestedLevels, maxLevelsByWidth);
  const modeledDepth = Math.min(requestedDepth, feasibleLevels * benchH);

  const realX = (x) => ((x / Math.max(1, width - 1)) - 0.5) * widthMeters;
  const realZ = (y) => ((y / Math.max(1, height - 1)) - 0.5) * heightMeters;
  const worldX = (meters) => (meters / widthMeters) * 10;
  const worldZ = (meters) => (meters / heightMeters) * 10;
  const worldY = (elev) => ((elev - terrain.min) / range) * 4.2 * ex;

  const sampleDTM = (mx, mz) => {
    const gx = ((mx / widthMeters) + 0.5) * (width - 1);
    const gy = ((mz / heightMeters) + 0.5) * (height - 1);
    const x0 = Math.max(0, Math.min(width - 1, Math.floor(gx)));
    const y0 = Math.max(0, Math.min(height - 1, Math.floor(gy)));
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    const tx = gx - x0;
    const ty = gy - y0;
    const vals = [
      Number(terrain.grid[y0 * width + x0]),
      Number(terrain.grid[y0 * width + x1]),
      Number(terrain.grid[y1 * width + x0]),
      Number(terrain.grid[y1 * width + x1]),
    ];
    const valid = vals.filter(Number.isFinite);
    if (!valid.length) return terrain.mean;
    const a = Number.isFinite(vals[0]) ? vals[0] : terrain.mean;
    const b = Number.isFinite(vals[1]) ? vals[1] : a;
    const c = Number.isFinite(vals[2]) ? vals[2] : a;
    const d = Number.isFinite(vals[3]) ? vals[3] : c;
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  };

  // For a point inside the rectangular pit, find the closest point on the
  // actual DTM at the pit rim. This anchors the design to real surveyed terrain.
  const rimElevationAt = (mx, mz) => {
    const ax = Math.abs(mx);
    const az = Math.abs(mz);
    if (maxHalfX - ax <= maxHalfZ - az) {
      const bx = mx >= 0 ? maxHalfX : -maxHalfX;
      return sampleDTM(bx, clamp(mz, -maxHalfZ, maxHalfZ));
    }
    const bz = mz >= 0 ? maxHalfZ : -maxHalfZ;
    return sampleDTM(clamp(mx, -maxHalfX, maxHalfX), bz);
  };

  // A real design height field: outside = surveyed DTM; inside = stepped
  // excavation referenced to the surveyed rim.
  const designedElevationAt = (mx, mz) => {
    if (!showDesign || Math.abs(mx) > maxHalfX || Math.abs(mz) > maxHalfZ) {
      return sampleDTM(mx, mz);
    }

    const edgeDistance = Math.min(maxHalfX - Math.abs(mx), maxHalfZ - Math.abs(mz));

    // Build a stepped open-pit profile from the actual surveyed rim:
    // sloping bench face -> horizontal berm -> next sloping face -> ...
    // This makes Bench Height, Bench Width and Face Angle physically affect
    // the design surface instead of drawing a separate box over the DTM.
    let depth = 0;
    let remaining = Math.max(0, edgeDistance);

    for (let level = 0; level < feasibleLevels && remaining > 0; level++) {
      const faceDistance = Math.min(faceRun, remaining);
      depth += (faceDistance / Math.max(0.001, faceRun)) * benchH;
      remaining -= faceDistance;

      if (remaining > 0 && depth < modeledDepth) {
        const bermDistance = Math.min(benchW, remaining);
        depth = Math.min(modeledDepth, (level + 1) * benchH);
        remaining -= bermDistance;
      }
    }

    depth = Math.min(modeledDepth, depth);
    return rimElevationAt(mx, mz) - depth;
  };

  // Build one terrain mesh. Outside the pit it is exactly the real DTM;
  // inside the pit it is replaced by the calculated stepped design surface.
  const terrainPositions = [];
  const terrainIndices = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const mx = realX(x);
      const mz = realZ(y);
      const elev = designedElevationAt(mx, mz);
      terrainPositions.push(worldX(mx), worldY(elev), worldZ(mz));
    }
  }

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = y * width + x;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      terrainIndices.push(a, c, b, b, c, d);
    }
  }

  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute("position", new THREE.Float32BufferAttribute(terrainPositions, 3));
  terrainGeometry.setIndex(terrainIndices);
  terrainGeometry.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x858585,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  group.add(terrainMesh);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(terrainGeometry),
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.10 })
  );
  group.add(wire);

  if (showDesign) {
    const designGroup = new THREE.Group();
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x111111 });

    // Draw calculated bench edges using the same stepped height field.
    const ringPointCount = 48;
    const makeRing = (halfX, halfZ, depth) => {
      const pts = [];
      const push = (x, z) => {
        const elev = depth <= 0 ? sampleDTM(x, z) : rimElevationAt(x, z) - depth;
        pts.push({ x, z, elevation: elev });
      };
      for (let i = 0; i <= ringPointCount; i++) {
        const t = i / ringPointCount;
        push(-halfX + 2 * halfX * t, -halfZ);
      }
      for (let i = 1; i <= ringPointCount; i++) {
        const t = i / ringPointCount;
        push(halfX, -halfZ + 2 * halfZ * t);
      }
      for (let i = 1; i <= ringPointCount; i++) {
        const t = i / ringPointCount;
        push(halfX - 2 * halfX * t, halfZ);
      }
      for (let i = 1; i < ringPointCount; i++) {
        const t = i / ringPointCount;
        push(-halfX, halfZ - 2 * halfZ * t);
      }
      return pts;
    };

    const toWorld = (p) => new THREE.Vector3(worldX(p.x), worldY(p.elevation), worldZ(p.z));

    // Pit rim.
    const rim = makeRing(maxHalfX, maxHalfZ, 0);
    const rimLinePoints = rim.map(toWorld);
    rimLinePoints.push(rimLinePoints[0].clone());
    designGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(rimLinePoints),
      lineMaterial
    ));

    // Each nested ring marks the next bench break.
    for (let level = 1; level <= feasibleLevels; level++) {
      const inset = Math.min(level * horizontalPerLevel, Math.min(maxHalfX, maxHalfZ) - 2);
      const hx = Math.max(2, maxHalfX - inset);
      const hz = Math.max(2, maxHalfZ - inset);
      const ring = makeRing(hx, hz, Math.min(modeledDepth, level * benchH));
      const points = ring.map(toWorld);
      points.push(points[0].clone());
      designGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        lineMaterial
      ));
    }

    // Add subtle bench/floor reference surfaces. These are clipped to the
    // nested rectangles and sit exactly on the calculated design levels.
    const surfaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x6f6f6f,
      roughness: 0.98,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    });

    const addRectSurface = (hx, hz, depth) => {
      const zLevel = Math.min(modeledDepth, depth);
      const corners = [
        { x: -hx, z: -hz },
        { x: hx, z: -hz },
        { x: hx, z: hz },
        { x: -hx, z: hz },
      ];
      const verts = corners.map((p) => {
        const elev = rimElevationAt(p.x, p.z) - zLevel;
        return toWorld({ ...p, elevation: elev });
      });
      const pos = [];
      verts.forEach((v) => pos.push(v.x, v.y, v.z));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      designGroup.add(new THREE.Mesh(geo, surfaceMaterial));
    };

    for (let level = 1; level <= feasibleLevels; level++) {
      const inset = Math.min(level * horizontalPerLevel, Math.min(maxHalfX, maxHalfZ) - 2);
      const hx = Math.max(2, maxHalfX - inset);
      const hz = Math.max(2, maxHalfZ - inset);
      addRectSurface(hx, hz, Math.min(modeledDepth, level * benchH));
    }

    group.add(designGroup);
    group.userData.designGroup = designGroup;
    group.userData.rimElevation = sampleDTM(0, -maxHalfZ);
    group.userData.ringCount = feasibleLevels + 1;
  }

  group.userData.terrainMesh = terrainMesh;
  group.userData.requestedLevels = requestedLevels;
  group.userData.feasibleLevels = feasibleLevels;
  group.userData.modeledDepth = modeledDepth;
  group.userData.widthMeters = widthMeters;
  group.userData.heightMeters = heightMeters;
  group.userData.pitLength = pitLength;
  group.userData.pitWidth = pitWidth;
  group.userData.benchFaceAngle = faceAngle;
  group.userData.faceRun = faceRun;
  return group;
}

function createTerrainMesh(terrain, verticalExaggeration) {
  const group = new THREE.Group();
  const width = terrain.width;
  const height = terrain.height;

  const positions = [];
  const indices = [];

  const widthMeters = Math.max(1, terrain.bbox.maxX - terrain.bbox.minX);
  const heightMeters = Math.max(1, terrain.bbox.maxY - terrain.bbox.minY);

  const xScale = 1;
  const zScale = heightMeters / widthMeters;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const z = Number.isFinite(terrain.grid[i]) ? terrain.grid[i] : terrain.mean;
      const px = ((x / (width - 1)) - 0.5) * 10;
      const pz = ((y / (height - 1)) - 0.5) * 10 * zScale;
      const py = (z - terrain.min) * verticalExaggeration / Math.max(1, terrain.max - terrain.min) * 4.2;
      positions.push(px, py, pz);
    }
  }

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = y * width + x;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x8b8b8b,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.16 })
  );
  group.add(wire);

  group.userData.widthMeters = widthMeters;
  group.userData.heightMeters = heightMeters;
  return group;
}

function createSeamPlane(terrain, inputs, verticalExaggeration) {
  const widthMeters = Math.max(1, terrain.bbox.maxX - terrain.bbox.minX);
  const heightMeters = Math.max(1, terrain.bbox.maxY - terrain.bbox.minY);
  const ratio = heightMeters / widthMeters;

  const geo = new THREE.PlaneGeometry(8.8, 8.8 * ratio);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x555555,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;

  const seamDepth = Number(inputs.seamDepth);
  const y = clamp(
    (terrain.max - seamDepth - terrain.min) * verticalExaggeration /
      Math.max(1, terrain.max - terrain.min) * 4.2,
    -4.5,
    4.5
  );
  plane.position.y = y;
  return plane;
}

function setupScene(container, terrain, inputs, viewMode) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f6f8);

  const camera = new THREE.PerspectiveCamera(
    45,
    Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
    0.01,
    5000
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.screenSpacePanning = true;

  scene.add(new THREE.AmbientLight(0xffffff, 1.7));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(5, 9, 5);
  scene.add(light);

  const terrainGroup = createTerrainAndDesignMesh(terrain, inputs, Number(inputs.verticalExaggeration), viewMode === "design");
  scene.add(terrainGroup);

  const seam = createSeamPlane(terrain, inputs, Number(inputs.verticalExaggeration));
  scene.add(seam);

  const gridSize = Math.max(
    12,
    Math.min(
      24,
      Math.max(
        12,
        Math.max(
          terrain.bbox.maxX - terrain.bbox.minX,
          terrain.bbox.maxY - terrain.bbox.minY
        ) / 80
      )
    )
  );
  const grid = new THREE.GridHelper(gridSize, 24, 0x555555, 0xb8b8b8);
  grid.position.y = -0.15;
  scene.add(grid);

  const axes = new THREE.AxesHelper(3);
  scene.add(axes);

  if (viewMode === "surface") {
    seam.visible = false;
  } else if (viewMode === "design") {
    seam.visible = true;
  } else {
    seam.visible = true;
  }

  // Automatically frame the complete real DTM/design model.
  // This prevents the terrain or pit from being cut off when the DTM
  // has a much larger footprint than the design geometry.
  const modelBox = new THREE.Box3().setFromObject(terrainGroup);
  const modelCenter = modelBox.getCenter(new THREE.Vector3());
  const modelSphere = modelBox.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(0.5, modelSphere.radius);

  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = (radius / Math.sin(fovRadians / 2)) * 1.18;

  let direction;
  if (viewMode === "depth") {
    direction = new THREE.Vector3(1, 0.72, 1);
  } else if (viewMode === "design") {
    direction = new THREE.Vector3(1, 0.62, 1);
  } else {
    direction = new THREE.Vector3(1, 0.68, 1);
  }
  direction.normalize();

  camera.position.copy(modelCenter).add(direction.multiplyScalar(fitDistance));
  camera.near = Math.max(0.01, radius / 1000);
  camera.far = Math.max(500, fitDistance + radius * 3);
  camera.updateProjectionMatrix();

  controls.target.copy(modelCenter);
  controls.minDistance = Math.max(0.1, radius * 0.08);
  controls.maxDistance = Math.max(100, radius * 5);
  controls.update();

  let animationId;
  const resize = () => {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener("resize", resize);
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(animationId);
    window.removeEventListener("resize", resize);
    controls.dispose();
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    container.innerHTML = "";
  };
}

export default function Visualization3D() {
  const [terrain, setTerrain] = useState(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Loading real mine DTM...");
  const [error, setError] = useState("");
  const [inputs, setInputs] = useState(defaultInputs);
  const [viewMode, setViewMode] = useState("surface");
  const [showContours, setShowContours] = useState(true);

  const mapRef = useRef(null);
  const crossSectionRef = useRef(null);
  const sceneRef = useRef(null);

  const loadDTM = async (source, name = "McKinley Mine DTM") => {
    try {
      setStatus("Reading real GeoTIFF DTM...");
      setError("");
      const result = await readDTM(source, 220);
      result.widthMeters = result.bbox.maxX - result.bbox.minX;
      result.heightMeters = result.bbox.maxY - result.bbox.minY;
      setTerrain(result);
      setFileName(name);
      setStatus("REAL DTM loaded");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not load DTM.");
      setStatus("DTM load failed");
    }
  };

  useEffect(() => {
    loadDTM(DEFAULT_DTM, "McKinley Mine • DTMdem_I_11.tif");
  }, []);

  useEffect(() => {
    if (!terrain || !mapRef.current) return;
    draw2DMap(mapRef.current, terrain, inputs, showContours);
    if (crossSectionRef.current) drawCrossSection(crossSectionRef.current, terrain, inputs);
  }, [terrain, inputs, showContours]);

  useEffect(() => {
    if (!terrain || !sceneRef.current) return;
    return setupScene(sceneRef.current, terrain, inputs, viewMode);
  }, [terrain, inputs, viewMode]);

  const setInput = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const designSummary = useMemo(() => {
    if (!terrain) return null;

    const geom = getPitGeometry(terrain, inputs);
    const cut = calculateCutVolume(terrain, inputs);

    return {
      requestedDepth: geom.requestedDepth,
      requestedBenches: geom.requestedLevels,
      modeledBenches: geom.modeledLevels,
      modeledDepth: geom.modeledDepth,
      depthFeasible: geom.depthFeasible,
      requiredPitDimension: geom.requiredPitDimension,
      selectedDimension: geom.availableDesignDimension,
      bottomElevation: terrain.max - geom.modeledDepth,
      requestedBottomElevation: terrain.max - geom.requestedDepth,
      terrainRelief: terrain.max - terrain.min,
      area: geom.pitLength * geom.pitWidth,
      seamTop: terrain.max - Number(inputs.seamDepth),
      seamBottom: terrain.max - Number(inputs.seamDepth) - Number(inputs.seamThickness),
      benchFaceAngle: geom.faceAngle,
      faceRun: geom.faceRun,
      stepRun: geom.stepRun,
      requiredPitDimension: geom.requiredPitDimension,
      selectedDimension: geom.availableDesignDimension,
      benchSchedule: buildBenchSchedule(terrain, geom),
      estimatedCutVolume: cut.volume,
      volumeGrid: cut.resolution,
    };
  }, [terrain, inputs]);

  return (
    <div style={{ padding: 24, background: "#f6f7f9", minHeight: "100%", color: "#111" }}>
      <div style={{ maxWidth: 1450, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.2 }}>PHASE 08</div>
          <h1 style={{ margin: "6px 0", fontSize: 32 }}>Visualization & Real 2D/3D Models</h1>
          <p style={{ margin: 0, color: "#555" }}>
            Real georeferenced mine DTM → 2D terrain/contours → interactive 3D terrain → design-driven pit/seam model.
          </p>
        </div>

        <section style={cardStyle}>
          <h2 style={h2Style}>1. Real Mine DTM Input</h2>
          <p style={mutedStyle}>
            This module uses an actual GeoTIFF DTM. No terrain elevations are fabricated by the application.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={buttonStyle}>
              Load another GeoTIFF DTM
              <input
                type="file"
                accept=".tif,.tiff"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadDTM(file, file.name);
                }}
              />
            </label>

            <div style={statusPill(status === "REAL DTM loaded")}>{status}</div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #b33", background: "#fff", borderRadius: 8 }}>
              <b>DTM error:</b> {error}
              <div style={{ marginTop: 6, color: "#555" }}>
                Put the downloaded file at <code>frontend/public/data/mckinley/dtm_I_11.tif</code> or use the upload button above.
              </div>
            </div>
          )}

          {terrain && (
            <div style={metricGrid}>
              <Metric label="Raster cells used" value={`${terrain.width} × ${terrain.height}`} />
              <Metric label="Source raster" value={`${terrain.sourceWidth} × ${terrain.sourceHeight}`} />
              <Metric label="Elevation minimum" value={`${terrain.min.toFixed(2)} m`} />
              <Metric label="Elevation maximum" value={`${terrain.max.toFixed(2)} m`} />
              <Metric label="Terrain relief" value={`${(terrain.max - terrain.min).toFixed(2)} m`} />
              <Metric label="Coverage width" value={`${terrain.widthMeters.toFixed(1)} m`} />
              <Metric label="Coverage height" value={`${terrain.heightMeters.toFixed(1)} m`} />
              <Metric label="Valid cells" value={terrain.count.toLocaleString()} />
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: "#555" }}>
            Dataset source: McKinley Mine, New Mexico, 2023 airborne LiDAR/DTM. The source dataset is published by the U.S.
            Office of Surface Mining Reclamation and Enforcement through OpenTopography under CC BY 4.0.
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={h2Style}>2. Mine / Design Inputs</h2>
          <div style={inputGrid}>
            <Input label="Mine depth (m)" value={inputs.mineDepth} onChange={(v) => setInput("mineDepth", v)} />
            <Input label="Seam depth (m)" value={inputs.seamDepth} onChange={(v) => setInput("seamDepth", v)} />
            <Input label="Seam thickness (m)" value={inputs.seamThickness} onChange={(v) => setInput("seamThickness", v)} />
            <Input label="Bench height (m)" value={inputs.benchHeight} onChange={(v) => setInput("benchHeight", v)} />
            <Input label="Bench width / berm (m)" value={inputs.benchWidth} onChange={(v) => setInput("benchWidth", v)} />
            <Input label="Bench face angle (°)" value={inputs.benchFaceAngle} onChange={(v) => setInput("benchFaceAngle", v)} step="1" />
            <Input label="Pit design length (m)" value={inputs.pitLength} onChange={(v) => setInput("pitLength", v)} />
            <Input label="Pit design width (m)" value={inputs.pitWidth} onChange={(v) => setInput("pitWidth", v)} />
            <Input label="Vertical exaggeration (1.0 = true scale)" value={inputs.verticalExaggeration} onChange={(v) => setInput("verticalExaggeration", v)} step="0.1" />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
            The terrain itself comes from the real DTM. Pit/bench/seam geometry is calculated from the inputs above and is
            explicitly shown as a <b>conceptual design overlay</b> unless a certified pit boundary and geological seam model are supplied.
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={h2Style}>3. Real 2D Mine Model</h2>
              <p style={mutedStyle}>Hillshade and contour lines are generated directly from the loaded DTM elevation grid.</p>
            </div>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              <input type="checkbox" checked={showContours} onChange={(e) => setShowContours(e.target.checked)} /> Contours
            </label>
          </div>

          <div style={{ border: "1px solid #c8cdd3", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
            <canvas ref={mapRef} style={{ width: "100%", height: 560, display: "block" }} />
          </div>

          <div style={{ marginTop: 16, border: "1px solid #c8cdd3", background: "#fff", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", fontWeight: 800 }}>A–B Terrain / Design Cross-Section</div>
            <canvas ref={crossSectionRef} style={{ width: "100%", height: 360, display: "block" }} />
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <ViewButton active={viewMode === "surface"} onClick={() => setViewMode("surface")}>3D SURFACE DTM</ViewButton>
            <ViewButton active={viewMode === "depth"} onClick={() => setViewMode("depth")}>DEPTH / SEAM VIEW</ViewButton>
            <ViewButton active={viewMode === "design"} onClick={() => setViewMode("design")}>3D DESIGN MODEL</ViewButton>
          </div>

          <h2 style={h2Style}>4. Interactive 3D Mine Model</h2>
          <p style={mutedStyle}>
            The surface mesh is generated from the actual DTM raster. The design view applies the entered pit depth, bench height and bench width to create a stepped excavation surface and bench geometry.
          </p>

          <div
            ref={sceneRef}
            style={{
              width: "100%",
              height: 650,
              minHeight: 450,
              border: "1px solid #c8cdd3",
              background: "#f4f6f8",
              borderRadius: 10,
              overflow: "hidden",
            }}
          />

          <div style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
            Mouse: rotate • wheel: zoom • right-drag: pan
          </div>
        </section>

        {designSummary && (
          <section style={cardStyle}>
            <h2 style={h2Style}>5. Design Feasibility & Engineering Check</h2>
            <div style={metricGrid}>
              <Metric label="Requested depth" value={`${designSummary.requestedDepth.toFixed(1)} m`} />
              <Metric label="Requested benches" value={`${designSummary.requestedBenches}`} />
              <Metric label="Modeled benches" value={`${designSummary.modeledBenches}`} />
              <Metric label="Modeled depth" value={`${designSummary.modeledDepth.toFixed(1)} m`} />
              <Metric label="Required pit dimension" value={`${designSummary.requiredPitDimension.toFixed(1)} m`} />
              <Metric label="Selected minimum dimension" value={`${designSummary.selectedDimension.toFixed(1)} m`} />
            </div>
            <div style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid #777",
              borderRadius: 8,
              background: "#fafafa",
              lineHeight: 1.5
            }}>
              <b>Geometry status:</b>{" "}
              {designSummary.depthFeasible
                ? `FULL REQUESTED DEPTH FEASIBLE — ${designSummary.requestedBenches} bench levels fit within the selected footprint.`
                : `REQUESTED DEPTH NOT FULLY FEASIBLE — only ${designSummary.modeledDepth.toFixed(1)} m is modeled. Increase pit length/width or change bench geometry.`}
            </div>
          </section>
        )}

        {designSummary && (
          <section style={cardStyle}>
            <h2 style={h2Style}>6. Calculated Model Outputs</h2>
            <div style={metricGrid}>
              <Metric label="Terrain relief" value={`${designSummary.terrainRelief.toFixed(2)} m`} />
              <Metric label="Design pit area" value={`${designSummary.area.toLocaleString()} m²`} />
              <Metric label="Requested bench levels" value={`${designSummary.requestedBenches}`} />
              <Metric label="Modeled bench levels" value={`${designSummary.modeledBenches}`} />
              <Metric label="Modeled depth" value={`${designSummary.modeledDepth.toFixed(2)} m`} />
              <Metric label="Design bottom elevation" value={`${designSummary.bottomElevation.toFixed(2)} m`} />
              <Metric label="Seam top reference" value={`${designSummary.seamTop.toFixed(2)} m`} />
              <Metric label="Seam bottom reference" value={`${designSummary.seamBottom.toFixed(2)} m`} />
              <Metric label="Estimated cut volume" value={`${(designSummary.estimatedCutVolume / 1e6).toFixed(2)} million m³`} />
            </div>
          {designSummary && !designSummary.depthFeasible && (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid #777", background: "#fafafa", borderRadius: 8, lineHeight: 1.5 }}>
              <b>Design geometry check:</b> the requested depth cannot fit inside the selected pit footprint with the current bench width.
              The model therefore stops at <b>{designSummary.modeledDepth.toFixed(1)} m</b> after <b>{designSummary.modeledBenches}</b> feasible bench levels.
              Increase pit length/width or reduce bench width if the full requested depth is required.
            </div>
          )}
          </section>
        )}

        {designSummary && (
          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={h2Style}>7. Bench-Level Engineering Schedule</h2>
                <p style={mutedStyle}>
                  Each level is calculated from the requested depth, bench height, berm width and face angle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadCsv("MINQORA_Phase08_Bench_Schedule.csv", designSummary.benchSchedule)}
                style={buttonStyle}
              >
                Export Bench Schedule CSV
              </button>
            </div>

            <div style={{ overflowX: "auto", border: "1px solid #d5d9de", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr>
                    {["Level", "Depth (m)", "Elevation (m)", "Face run (m)", "Berm width (m)", "Cumulative step (m)"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #d5d9de", background: "#f7f8fa", fontSize: 12 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {designSummary.benchSchedule.map((row) => (
                    <tr key={row.level}>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee", fontWeight: 800 }}>L{row.level}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.depth.toFixed(1)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.elevation.toFixed(2)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.faceRun.toFixed(2)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.bermWidth.toFixed(2)}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{row.cumulativeStep.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, padding: 12, border: "1px solid #d5d9de", borderRadius: 8, background: "#fafafa", lineHeight: 1.5 }}>
              <b>2D / 3D consistency:</b> both views use the same DTM, pit dimensions, bench height, berm width and face angle.
              The table above is the traceable level schedule used by the design calculations.
            </div>
          </section>
        )}

        <section style={cardStyle}>
          <h2 style={h2Style}>8. Data Integrity / Engineering Status</h2>
          <ul style={{ lineHeight: 1.8, color: "#333", marginBottom: 0 }}>
            <li><b>Terrain:</b> real surveyed LiDAR-derived DTM.</li>
            <li><b>2D model:</b> derived from actual DTM elevations; contours and the A–B cross-section are calculated from the same terrain grid.</li>
            <li><b>3D model:</b> actual DTM cells are converted into a 3D terrain mesh.</li>
            <li><b>Depth / benches:</b> calculated from mine depth, bench height, bench width and pit footprint; infeasible combinations are flagged.</li>
            <li><b>Geology:</b> seam plane is a reference geometry until real seam surface data is supplied.</li>
            <li><b>Mine planning:</b> the stepped pit, cross-section and cut-volume estimate are calculations driven by the supplied inputs and real terrain context; they are conceptual design outputs, not a certified final mine plan.</li>
          </ul>
        </section>

        <div style={{ fontSize: 12, color: "#666", padding: "4px 4px 24px" }}>
          Loaded source: {(fileName || "none").replace(/\.tif\.tif$/i, ".tif")}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ border: "1px solid #d5d9de", borderRadius: 8, padding: 12, background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 19, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Input({ label, value, onChange, step = "1" }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
      {label}
      <input
        type="number"
        min="0.1"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "10px 11px",
          border: "1px solid #c7ccd2",
          borderRadius: 7,
          background: "#fff",
          fontSize: 14,
        }}
      />
    </label>
  );
}

function ViewButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "11px 16px",
        borderRadius: 8,
        border: active ? "2px solid #111" : "1px solid #c7ccd2",
        background: active ? "#fff" : "#f8f9fa",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid #d5d9de",
  borderRadius: 12,
  padding: 18,
  marginBottom: 18,
};

const h2Style = { margin: "0 0 7px", fontSize: 21 };
const mutedStyle = { margin: "0 0 14px", color: "#666", lineHeight: 1.5 };
const inputGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const metricGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
  gap: 10,
  marginTop: 14,
};
const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 15px",
  border: "1px solid #111",
  borderRadius: 8,
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};
function statusPill(ok) {
  return {
    padding: "8px 11px",
    borderRadius: 999,
    border: "1px solid #bbb",
    background: ok ? "#f4f4f4" : "#fff",
    fontWeight: 800,
    fontSize: 12,
  };
}
