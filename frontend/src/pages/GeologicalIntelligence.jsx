import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const MINE_NAMES = ["Machhakata (Revised)"];

const na = (value) =>
  value === null || value === undefined || value === "" ? "N/A" : value;

const numberValue = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const displayNumber = (value, digits = 2) => {
  const n = numberValue(value);
  if (n === null) return "N/A";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const displayInteger = (value) => {
  const n = numberValue(value);
  if (n === null) return "N/A";
  return Math.round(n).toLocaleString();
};

const unwrap = (value) => {
  if (value && typeof value === "object") {
    if ("value" in value) return unwrap(value.value);
    if ("count" in value) return unwrap(value.count);
    if ("amount" in value) return unwrap(value.amount);
    if ("name" in value) return unwrap(value.name);
    if ("label" in value) return unwrap(value.label);
  }
  return value;
};

const getMineName = (mine = {}) =>
  unwrap(
    mine.mine_name ??
      mine.name ??
      mine.block_name ??
      mine.block ??
      mine.mine
  ) || "Unknown Mine";

const getSeams = (mine = {}) => {
  const candidates = [
    mine.seams,
    mine.seam_data,
    mine.geological_seams,
    mine.seam_records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && Array.isArray(candidate.seams)) return candidate.seams;
  }

  return [];
};

const getSnapshots = (mine = {}) => {
  const candidates = [
    mine.historical_snapshots,
    mine.snapshots,
    mine.history,
    mine.historical_data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && Array.isArray(candidate.snapshots)) return candidate.snapshots;
  }

  return [];
};

const getField = (object, keys) => {
  if (!object) return null;
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== "") {
      return unwrap(object[key]);
    }
  }
  return null;
};

const normalizeMine = (mine, index) => {
  const exploration = mine.exploration || mine.exploration_data || {};
  const spatial = mine.spatial || mine.spatial_data || {};
  const block = mine.block || mine.block_data || mine;

  const seams = getSeams(mine);
  const snapshots = getSnapshots(mine);

  return {
    ...mine,
    id: mine.id ?? mine.mine_id ?? index + 1,
    name: getMineName(mine),
    state: getField(block, ["state", "state_name", "location_state"]),
    coalfield: getField(block, ["coalfield", "coal_field"]),
    areaKm2: getField(block, [
      "area_km2",
      "area_sq_km",
      "tentative_area_km2",
      "block_area_km2",
    ]),
    resourceMt: getField(block, [
      "geological_resource_mt",
      "resource_mt",
      "geological_reserve_mt",
      "reserve_mt",
    ]),
    grade: getField(block, ["grade", "grade_range", "coal_grade"]),
    explorationStatus: getField(block, [
      "exploration_status",
      "status",
      "exploration_level",
    ]),
    capacityMtpA: getField(block, [
      "prc_mtpa",
      "capacity_mtpa",
      "production_capacity_mtpa",
      "rated_capacity_mtpa",
    ]),
    miningMethod: getField(block, [
      "mining_method",
      "method",
      "mine_type",
    ]),
    agency: getField(exploration, [
      "exploration_agency",
      "agency",
      "explored_by",
    ]),
    explorationGrade: getField(exploration, [
      "exploration_grade",
      "geological_exploration_grade",
      "g_grade",
    ]),
    boreholes: getField(exploration, [
      "boreholes",
      "borehole_count",
      "number_of_boreholes",
    ]),
    drillingM: getField(exploration, [
      "drilling_m",
      "drilling_length_m",
      "total_drilling_m",
      "meterage_m",
    ]),
    boreholesPerKm2: getField(exploration, [
      "boreholes_per_km2",
      "borehole_density",
    ]),
    strike: getField(exploration, ["strike", "general_strike"]),
    dip: getField(exploration, ["dip", "general_dip"]),
    spatialStatus: getField(spatial, [
      "status",
      "survey_status",
      "data_status",
    ]),
    spatialSource: getField(spatial, ["source", "survey_source"]),
    coordinatesAvailable: getField(spatial, [
      "coordinates_available",
      "coordinate_data_available",
    ]),
    dtmAvailable: getField(spatial, [
      "dtm_available",
      "dem_available",
      "terrain_model_available",
    ]),
    seams,
    snapshots,
  };
};


function normalizeQuestionText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function seamNumber(seam, keys) {
  return numberValue(getField(seam, keys));
}

function seamLabel(seam) {
  return String(
    getField(seam, ["seam", "seam_name", "name", "seam_code"]) ||
      "Unknown Seam"
  );
}

function answerGeologicalQuestion(question, mines, selectedMineName) {
  const q = normalizeQuestionText(question);
  let mine = null;
  if (!q) return null;

  // Resolve the mine mentioned in the QUESTION first.
  // This prevents the dropdown selection from overriding an explicit mine name.
  const mineAliases = [
    ["machhakata (revised)", "Machhakata (Revised)"],
    ["machhakata", "Machhakata (Revised)"],
    ["north of arkhapal srirampur", "North of Arkhapal Srirampur"],
    ["north of arkhapal", "North of Arkhapal Srirampur"],
    ["arkhapal", "North of Arkhapal Srirampur"],
    ["ramchandi promotion block", "Ramchandi Promotion Block"],
    ["ramchandi", "Ramchandi Promotion Block"],
    ["chhendipada-ii", "Chhendipada-II"],
    ["chhendipada ii", "Chhendipada-II"],
    ["chhendipada", "Chhendipada"],
    ["mahanadi", "Mahanadi"],
  ];

  for (const [alias, canonical] of mineAliases.sort((a, b) => b[0].length - a[0].length)) {
    if (q.includes(alias)) {
      mine = mines.find((item) => normalizeQuestionText(item.name) === normalizeQuestionText(canonical)) || null;
      if (mine) break;
    }
  }

  // General token fallback for minor wording differences.
  if (!mine) {
    for (const candidate of mines) {
      const normalizedName = normalizeQuestionText(candidate.name);
      const significantTokens = normalizedName
        .split(" ")
        .filter((token) => token.length > 3 && !["revised", "promotion", "block"].includes(token));
      if (significantTokens.length && significantTokens.some((token) => q.includes(token))) {
        mine = candidate;
        break;
      }
    }
  }

  if (!mine && selectedMineName !== "ALL") {
    mine = mines.find((item) => item.name === selectedMineName) || null;
  }
  if (!mine && mines.length === 1) mine = mines[0];

  const wantsLargest =
    q.includes("largest seam") ||
    q.includes("highest reserve") ||
    q.includes("most reserve") ||
    q.includes("maximum reserve") ||
    q.includes("biggest seam");

  const wantsThickest =
    q.includes("thickest seam") ||
    q.includes("maximum thickness") ||
    q.includes("highest thickness");

  const wantsThickness = q.includes("thickness") || q.includes("thick");
  const wantsDepth = q.includes("depth") || q.includes("deep");
  const wantsExploration =
    q.includes("explored") ||
    q.includes("exploration") ||
    q.includes("borehole") ||
    q.includes("drilling") ||
    q.includes("strike") ||
    q.includes("dip");
  const wantsResource =
    q.includes("resource") || q.includes("reserve") || q.includes("mt");
  const wantsCapacity = q.includes("capacity") || q.includes("mtpa");
  const wantsSeamCount =
    q.includes("how many seams") || q.includes("number of seams") || q.includes("seam count");
  const wantsDeepest =
    q.includes("deepest seam") || q.includes("maximum depth") || q.includes("deepest");
  const wantsAverageThickness =
    q.includes("average thickness") || q.includes("mean thickness");


  if (wantsSeamCount) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    const seams = getSeams(mine);
    return {
      title: `Seam inventory — ${mine.name}`,
      text: `${mine.name} has ${seams.length} loaded seam record${seams.length === 1 ? "" : "s"} in the current CMPDI dataset.`,
      evidence: [`Mine: ${mine.name}`, `Loaded seam records: ${seams.length}`],
    };
  }

  if (wantsDeepest) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    const seams = getSeams(mine).filter((seam) => seamNumber(seam, ["depth_max_m", "floor_depth_max_m", "depth_max"]) !== null);
    if (!seams.length) return { title: `No verified depth table for ${mine.name}`, text: "No verified seam depth records are currently loaded for this mine.", evidence: [`Mine: ${mine.name}`] };
    const best = seams.reduce((a, b) => seamNumber(b, ["depth_max_m", "floor_depth_max_m", "depth_max"]) > seamNumber(a, ["depth_max_m", "floor_depth_max_m", "depth_max"]) ? b : a);
    const depth = seamNumber(best, ["depth_max_m", "floor_depth_max_m", "depth_max"]);
    return {
      title: `Deepest reported seam — ${mine.name}`,
      text: `${seamLabel(best)} has the greatest reported maximum depth: ${displayNumber(depth)} m.`,
      evidence: [`Mine: ${mine.name}`, `Seam: ${seamLabel(best)}`, `Maximum depth: ${displayNumber(depth)} m`, `Source: ${na(getField(best, ["source", "source_id"]))}`],
    };
  }

  if (wantsAverageThickness) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    const values = getSeams(mine).map((seam) => seamNumber(seam, ["thickness_min_m", "min_thickness_m", "thickness_min"])).filter((v) => v !== null);
    if (!values.length) return { title: `No verified thickness table for ${mine.name}`, text: "No verified seam thickness records are currently loaded for this mine.", evidence: [`Mine: ${mine.name}`] };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { title: `Average minimum thickness — ${mine.name}`, text: `The average of the reported minimum seam thickness values is ${displayNumber(avg)} m.`, evidence: [`Mine: ${mine.name}`, `Records used: ${values.length}`, `Average minimum thickness: ${displayNumber(avg)} m`] };
  }

  if (wantsLargest || (wantsResource && q.includes("seam"))) {
    if (!mine) {
      return {
        title: "Mine not identified",
        text: "Select a mine or include a mine name in the question.",
        evidence: [],
      };
    }
    const seams = getSeams(mine).filter((seam) =>
      seamNumber(seam, [
        "geological_reserve_mt",
        "reserve_mt",
        "geological_resource_mt",
      ]) !== null
    );
    if (!seams.length) {
      return {
        title: `No verified seam-reserve table for ${mine.name}`,
        text: "MINQORA has block-level source data for this mine, but no verified seam-level reserve records are currently loaded.",
        evidence: [`Mine: ${mine.name}`, `Block resource: ${na(mine.resourceMt)} MT`],
      };
    }
    const best = seams.reduce((a, b) =>
      seamNumber(b, ["geological_reserve_mt", "reserve_mt", "geological_resource_mt"]) >
      seamNumber(a, ["geological_reserve_mt", "reserve_mt", "geological_resource_mt"])
        ? b
        : a
    );
    const reserve = seamNumber(best, [
      "geological_reserve_mt",
      "reserve_mt",
      "geological_resource_mt",
    ]);
    return {
      title: `Largest reported seam reserve — ${mine.name}`,
      text: `The largest reported seam reserve in the loaded source data is ${seamLabel(best)}, with ${displayNumber(reserve)} MT.`,
      evidence: [
        `Mine: ${mine.name}`,
        `Seam: ${seamLabel(best)}`,
        `Reported reserve: ${displayNumber(reserve)} MT`,
        `Source: ${na(getField(best, ["source", "source_id"]))}`,
      ],
    };
  }

  if (wantsThickest) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    const seams = getSeams(mine).filter((seam) =>
      seamNumber(seam, ["thickness_max_m", "max_thickness_m", "thickness_max"]) !== null
    );
    if (!seams.length) {
      return {
        title: `No verified thickness table for ${mine.name}`,
        text: "MINQORA does not currently have verified seam thickness records for this mine.",
        evidence: [`Mine: ${mine.name}`],
      };
    }
    const best = seams.reduce((a, b) =>
      seamNumber(b, ["thickness_max_m", "max_thickness_m", "thickness_max"]) >
      seamNumber(a, ["thickness_max_m", "max_thickness_m", "thickness_max"])
        ? b
        : a
    );
    const maxT = seamNumber(best, ["thickness_max_m", "max_thickness_m", "thickness_max"]);
    const minT = seamNumber(best, ["thickness_min_m", "min_thickness_m", "thickness_min"]);
    return {
      title: `Thickest reported seam — ${mine.name}`,
      text: `${seamLabel(best)} has the highest reported maximum thickness in the loaded seam dataset: ${displayNumber(maxT)} m${minT !== null ? ` (range ${displayNumber(minT)}–${displayNumber(maxT)} m)` : ""}.`,
      evidence: [
        `Mine: ${mine.name}`,
        `Seam: ${seamLabel(best)}`,
        `Thickness: ${minT !== null ? `${displayNumber(minT)}–` : ""}${displayNumber(maxT)} m`,
        `Source: ${na(getField(best, ["source", "source_id"]))}`,
      ],
    };
  }

  if (wantsThickness || wantsDepth) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    const seams = getSeams(mine);
    const requestedSeam = seams.find((seam) => {
      const label = normalizeQuestionText(seamLabel(seam));
      return label.length > 1 && q.includes(label);
    });
    if (!requestedSeam) {
      return {
        title: `Choose a seam for ${mine.name}`,
        text: `I found ${seams.length} verified seam record${seams.length === 1 ? "" : "s"}, but the question does not name one. Try: "What is the thickness of III MID?"`,
        evidence: seams.slice(0, 10).map((s) => `Available seam: ${seamLabel(s)}`),
      };
    }
    const evidence = [`Mine: ${mine.name}`, `Seam: ${seamLabel(requestedSeam)}`];
    let text = "";
    if (wantsThickness) {
      const a = seamNumber(requestedSeam, ["thickness_min_m", "min_thickness_m", "thickness_min"]);
      const b = seamNumber(requestedSeam, ["thickness_max_m", "max_thickness_m", "thickness_max"]);
      text += a !== null || b !== null ? `Reported thickness is ${a !== null ? displayNumber(a) : "N/A"}–${b !== null ? displayNumber(b) : "N/A"} m.` : "No verified thickness value is available.";
      evidence.push(`Thickness: ${a !== null || b !== null ? `${a !== null ? displayNumber(a) : "N/A"}–${b !== null ? displayNumber(b) : "N/A"} m` : "N/A"}`);
    }
    if (wantsDepth) {
      const a = seamNumber(requestedSeam, ["depth_min_m", "floor_depth_min_m", "depth_min"]);
      const b = seamNumber(requestedSeam, ["depth_max_m", "floor_depth_max_m", "depth_max"]);
      text += `${text ? " " : ""}${a !== null || b !== null ? `Reported depth range is ${a !== null ? displayNumber(a) : "N/A"}–${b !== null ? displayNumber(b) : "N/A"} m.` : "No verified depth value is available."}`;
      evidence.push(`Depth: ${a !== null || b !== null ? `${a !== null ? displayNumber(a) : "N/A"}–${b !== null ? displayNumber(b) : "N/A"} m` : "N/A"}`);
    }
    evidence.push(`Source: ${na(getField(requestedSeam, ["source", "source_id"]))}`);
    return { title: `${seamLabel(requestedSeam)} — geological evidence`, text, evidence };
  }

  if (wantsExploration) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    const e = [];
    if (mine.explorationGrade != null) e.push(`Exploration grade: ${mine.explorationGrade}`);
    if (mine.explorationStatus != null) e.push(`Exploration status: ${mine.explorationStatus}`);
    if (mine.agency != null) e.push(`Exploration agency: ${mine.agency}`);
    if (mine.boreholes != null) e.push(`Boreholes: ${displayInteger(mine.boreholes)}`);
    if (mine.drillingM != null) e.push(`Total drilling: ${displayNumber(mine.drillingM)} m`);
    if (mine.boreholesPerKm2 != null) e.push(`Borehole density: ${displayNumber(mine.boreholesPerKm2)} / km²`);
    if (mine.strike != null) e.push(`General strike: ${mine.strike}`);
    if (mine.dip != null) e.push(`General dip: ${mine.dip}`);
    return {
      title: `Exploration intelligence — ${mine.name}`,
      text: e.length ? `Based only on the loaded source records, ${mine.name} has the following exploration evidence.` : "No verified exploration metrics are currently loaded for this mine.",
      evidence: e.length ? e : [`Mine: ${mine.name}`],
    };
  }

  if (wantsCapacity) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    return {
      title: `Capacity intelligence — ${mine.name}`,
      text: mine.capacityMtpA != null ? `The reported production capacity is ${displayNumber(mine.capacityMtpA)} MTPA.` : "No verified public capacity value is currently loaded for this mine.",
      evidence: [`Mine: ${mine.name}`, `Reported capacity: ${mine.capacityMtpA != null ? `${displayNumber(mine.capacityMtpA)} MTPA` : "N/A"}`],
    };
  }

  if (wantsResource) {
    if (!mine) return { title: "Mine not identified", text: "Select a mine or include a mine name in the question.", evidence: [] };
    return {
      title: `Geological resource — ${mine.name}`,
      text: mine.resourceMt != null ? `The selected source record reports ${displayNumber(mine.resourceMt)} MT of geological resource.` : "No verified public geological resource value is currently loaded for this mine.",
      evidence: [`Mine: ${mine.name}`, `Reported resource: ${mine.resourceMt != null ? `${displayNumber(mine.resourceMt)} MT` : "N/A"}`],
    };
  }

  return {
    title: "Question not recognized",
    text: "Try asking about the largest seam, thickest seam, seam thickness/depth, geological resource, exploration, boreholes, drilling, strike, dip or capacity.",
    evidence: [],
  };
}

const styles = {
  page: {
    minHeight: "100%",
    padding: "28px 0 70px",
    color: "#13243a",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 24,
  },
  eyebrow: {
    color: "#1999ad",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 48,
    lineHeight: 1.05,
    margin: 0,
    color: "#12233d",
    letterSpacing: -1.4,
  },
  subtitle: {
    margin: "13px 0 0",
    maxWidth: 900,
    color: "#56708e",
    fontSize: 17,
    lineHeight: 1.6,
  },
  primaryButton: {
    border: 0,
    borderRadius: 14,
    background: "#3ca1b4",
    color: "white",
    padding: "16px 22px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    minWidth: 180,
    boxShadow: "0 10px 24px rgba(60,161,180,.18)",
  },
  panel: {
    background: "#fff",
    border: "1px solid #d7e2ec",
    borderRadius: 22,
    padding: 28,
    marginBottom: 20,
    boxShadow: "0 8px 28px rgba(28,52,80,.045)",
  },
  panelTitle: {
    margin: "3px 0 8px",
    fontSize: 27,
    color: "#12233d",
  },
  panelSubtitle: {
    margin: 0,
    color: "#647c95",
    lineHeight: 1.55,
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(260px,1fr) 180px 180px 180px",
    gap: 16,
    marginTop: 18,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#56708e",
    fontWeight: 700,
    fontSize: 14,
  },
  select: {
    width: "100%",
    minHeight: 52,
    borderRadius: 12,
    border: "1px solid #cbd9e6",
    background: "#fbfdff",
    padding: "0 14px",
    fontSize: 16,
    color: "#17304d",
    fontWeight: 650,
  },
  statusCard: {
    border: "1px solid #d7e2ec",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background: "#fbfdff",
  },
  statusLabel: {
    color: "#7890a6",
    fontWeight: 800,
    fontSize: 11,
    letterSpacing: 1.7,
  },
  statusValue: {
    marginTop: 7,
    color: "#17304d",
    fontWeight: 850,
    fontSize: 15,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 16,
    marginBottom: 20,
  },
  kpi: {
    background: "#fff",
    border: "1px solid #d7e2ec",
    borderRadius: 18,
    padding: 22,
    minHeight: 128,
  },
  kpiLabel: {
    color: "#66809a",
    fontWeight: 800,
    letterSpacing: 1.7,
    fontSize: 12,
    textTransform: "uppercase",
  },
  kpiValue: {
    marginTop: 18,
    color: "#13243a",
    fontSize: 30,
    fontWeight: 850,
  },
  kpiSub: {
    marginTop: 5,
    color: "#72869b",
    fontSize: 12,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1.3fr .7fr",
    gap: 20,
    alignItems: "stretch",
    marginBottom: 20,
  },
  tableWrap: {
    marginTop: 18,
    overflowX: "auto",
    border: "1px solid #d9e3eb",
    borderRadius: 16,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 900,
  },
  th: {
    background: "#13263a",
    color: "white",
    padding: "13px 15px",
    textAlign: "left",
    fontSize: 12,
    letterSpacing: 1,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 15px",
    borderTop: "1px solid #e1e8ef",
    color: "#38516b",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "13px 15px",
    borderTop: "1px solid #e1e8ef",
    color: "#17304d",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 12,
    marginTop: 18,
  },
  miniCard: {
    background: "#f8fbfd",
    border: "1px solid #e0e8ef",
    borderRadius: 14,
    padding: 16,
  },
  miniLabel: {
    color: "#71869c",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  miniValue: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: 850,
    color: "#17304d",
  },
  note: {
    borderLeft: "4px solid #3ca1b4",
    background: "#f6fafc",
    padding: "13px 15px",
    borderRadius: "0 12px 12px 0",
    color: "#4f6880",
    lineHeight: 1.55,
    marginTop: 14,
  },
  error: {
    background: "#fff4f4",
    border: "1px solid #edcaca",
    color: "#a03f3f",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  empty: {
    padding: 34,
    textAlign: "center",
    color: "#71869c",
  },
};

function Kpi({ label, value, sub }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      {sub ? <div style={styles.kpiSub}>{sub}</div> : null}
    </div>
  );
}

function Availability({ value }) {
  const text = String(unwrap(value) ?? "N/A").toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "6px 10px",
        borderRadius: 99,
        background:
          text === "AVAILABLE" || text === "TRUE" || text === "YES"
            ? "#e1f4ea"
            : "#edf2f6",
        color:
          text === "AVAILABLE" || text === "TRUE" || text === "YES"
            ? "#1f7a50"
            : "#62768a",
        fontSize: 11,
        fontWeight: 850,
      }}
    >
      {text}
    </span>
  );
}

export default function GeologicalIntelligence() {
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mineFilter, setMineFilter] = useState("ALL");
  const [seamFilter, setSeamFilter] = useState("ALL");
  const [spatialStatus, setSpatialStatus] = useState("CHECKING");
  const [dtmStatus, setDtmStatus] = useState("CHECKING");
  const [geoQuestion, setGeoQuestion] = useState("");
  const [geoAnswer, setGeoAnswer] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/cmpdi/multi-mine/all`);

      if (!response.ok) {
        throw new Error(
          `Geological intelligence request failed (${response.status}).`
        );
      }

      const data = await response.json();

      const rawMines =
        Array.isArray(data?.mines)
          ? data.mines
          : Array.isArray(data?.blocks)
          ? data.blocks
          : Array.isArray(data?.data)
          ? data.data
          : [];

      // MINQORA's current operational Mining Data contains only
      // Machhakata (Revised). Geological Intelligence therefore uses
      // the Machhakata source records only, so the two modules stay
      // consistent and we do not imply operational data exists for
      // the other CMPDI blocks.
      const normalized = rawMines
        .map(normalizeMine)
        .filter((mine) =>
          String(mine.name || "").trim().toLowerCase() ===
          "machhakata (revised)"
        );

      setMines(normalized);
      setMineFilter("Machhakata (Revised)");

      if (!normalized.length) {
        throw new Error("No real CMPDI mine records were returned.");
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not load the geological intelligence dataset."
      );
      setMines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const selected = mines.find((mine) => mine.name === mineFilter);

    if (!selected) {
      setSpatialStatus("SOURCE-DEPENDENT");
      setDtmStatus("SOURCE-DEPENDENT");
      return;
    }

    const spatial = String(
      unwrap(selected.spatialStatus) ?? ""
    ).toUpperCase();

    const dtm = String(
      unwrap(selected.dtmAvailable) ?? ""
    ).toUpperCase();

    setSpatialStatus(
      spatial || (selected.coordinatesAvailable ? "AVAILABLE" : "SOURCE-DEPENDENT")
    );

    setDtmStatus(
      dtm || "NOT PUBLICLY VERIFIED"
    );
  }, [mineFilter, mines]);

  const selectedMine = useMemo(() => {
    if (mineFilter === "ALL") return null;
    return mines.find((mine) => mine.name === mineFilter) || null;
  }, [mineFilter, mines]);

  function askGeologicalIntelligence() {
    const result = answerGeologicalQuestion(geoQuestion, mines, mineFilter);
    setGeoAnswer(result);
  }

  const allSeams = useMemo(() => {
    const names = [];

    const sourceMines = selectedMine ? [selectedMine] : mines;

    sourceMines.forEach((mine) => {
      getSeams(mine).forEach((seam) => {
        const name = getField(seam, [
          "seam",
          "seam_name",
          "name",
          "seam_code",
        ]);
        if (name) names.push(String(name));
      });
    });

    return ["ALL", ...Array.from(new Set(names)).sort()];
  }, [mines, selectedMine]);

  useEffect(() => {
    if (!allSeams.includes(seamFilter)) {
      setSeamFilter("ALL");
    }
  }, [allSeams, seamFilter]);

  const filteredSeams = useMemo(() => {
    const sourceMines = selectedMine ? [selectedMine] : mines;

    const rows = [];

    sourceMines.forEach((mine) => {
      getSeams(mine).forEach((seam) => {
        const name =
          getField(seam, [
            "seam",
            "seam_name",
            "name",
            "seam_code",
          ]) || "Unknown Seam";

        if (seamFilter !== "ALL" && String(name) !== seamFilter) {
          return;
        }

        rows.push({
          mine: mine.name,
          seam: name,
          thicknessMin: getField(seam, [
            "thickness_min_m",
            "min_thickness_m",
            "thickness_min",
          ]),
          thicknessMax: getField(seam, [
            "thickness_max_m",
            "max_thickness_m",
            "thickness_max",
          ]),
          depthMin: getField(seam, [
            "depth_min_m",
            "floor_depth_min_m",
            "depth_min",
          ]),
          depthMax: getField(seam, [
            "depth_max_m",
            "floor_depth_max_m",
            "depth_max",
          ]),
          reserveMt: getField(seam, [
            "geological_reserve_mt",
            "reserve_mt",
            "resource_mt",
          ]),
          grade: getField(seam, ["grade", "grade_range", "coal_grade"]),
          source: getField(seam, ["source", "source_id"]),
        });
      });
    });

    return rows;
  }, [mines, selectedMine, seamFilter]);

  const totals = useMemo(() => {
    const resourceValues = mines
      .map((mine) => numberValue(mine.resourceMt))
      .filter((v) => v !== null);

    const areaValues = mines
      .map((mine) => numberValue(mine.areaKm2))
      .filter((v) => v !== null);

    return {
      mineCount: mines.length,
      resourceMt: resourceValues.reduce((a, b) => a + b, 0),
      resourceSourceCount: resourceValues.length,
      areaKm2: areaValues.reduce((a, b) => a + b, 0),
      areaSourceCount: areaValues.length,
      seamCount: filteredSeams.length,
    };
  }, [mines, filteredSeams]);

  const historicalRows = useMemo(() => {
    const sourceMines = selectedMine ? [selectedMine] : mines;
    const rows = [];

    sourceMines.forEach((mine) => {
      getSnapshots(mine).forEach((snapshot) => {
        rows.push({
          mine: mine.name,
          year: getField(snapshot, [
            "year",
            "source_year",
            "report_year",
            "date",
          ]),
          resourceMt: getField(snapshot, [
            "geological_resource_mt",
            "resource_mt",
            "geological_reserve_mt",
            "reserve_mt",
          ]),
          grade: getField(snapshot, ["grade", "grade_range"]),
          exploration: getField(snapshot, [
            "exploration_grade",
            "exploration_status",
            "status",
          ]),
          capacity: getField(snapshot, [
            "prc_mtpa",
            "capacity_mtpa",
            "production_capacity_mtpa",
          ]),
          source: getField(snapshot, ["source", "source_id"]),
        });
      });
    });

    return rows.sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")));
  }, [mines, selectedMine]);

  const downloadAnswer = () => {
    if (!geoAnswer) return;

    const selectedText = mineFilter === "ALL" ? "Question-resolved mine / source records" : mineFilter;
    const evidenceText = Array.isArray(geoAnswer.evidence)
      ? geoAnswer.evidence.map((item) => `• ${item}`).join("\n")
      : "No additional evidence listed.";

    const text = `MINQORA GEOLOGICAL INTELLIGENCE — ANSWER

==================================================
QUESTION
==================================================
${geoQuestion}

==================================================
ANSWER
==================================================
${geoAnswer.title || "Geological Intelligence Answer"}

${geoAnswer.text || ""}

==================================================
EVIDENCE USED
==================================================
${evidenceText}

==================================================
DATA SCOPE
==================================================
${selectedText}

This answer is generated from the loaded CMPDI/Ministry geological
source records in MINQORA. Unavailable values are not fabricated.

Generated by MINQORA Geological Intelligence.
`;

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "minqora-geological-answer.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadReport = () => {
    const selectedText = mineFilter === "ALL" ? "All Mines" : mineFilter;

    const text = `MINQORA GEOLOGICAL INTELLIGENCE REPORT

==================================================
DATA SCOPE
==================================================
Mine: ${selectedText}
Seam: ${seamFilter === "ALL" ? "All Seams" : seamFilter}
Machhakata geological records loaded: ${totals.mineCount}

==================================================
REAL CMPDI GEOLOGICAL SUMMARY
==================================================
Total geological resource represented: ${
      totals.resourceSourceCount
        ? `${displayNumber(totals.resourceMt)} MT`
        : "N/A"
    }
Area represented: ${
      totals.areaSourceCount
        ? `${displayNumber(totals.areaKm2)} km²`
        : "N/A"
    }
Seam records available: ${totals.seamCount}

==================================================
SEAM INTELLIGENCE
==================================================
${filteredSeams
  .map(
    (row) =>
      `${row.mine} | ${row.seam} | Thickness ${na(
        row.thicknessMin
      )}-${na(row.thicknessMax)} m | Depth ${na(
        row.depthMin
      )}-${na(row.depthMax)} m | Reserve ${na(
        row.reserveMt
      )} MT | Grade ${na(row.grade)} | Source ${na(row.source)}`
  )
  .join("\n")}

==================================================
HISTORICAL SOURCE SNAPSHOTS
==================================================
${historicalRows
  .map(
    (row) =>
      `${row.mine} | Year ${na(row.year)} | Resource ${na(
        row.resourceMt
      )} MT | Grade ${na(row.grade)} | Exploration ${na(
        row.exploration
      )} | Capacity ${na(row.capacity)} MTPA | Source ${na(row.source)}`
  )
  .join("\n")}

==================================================
DATA INTEGRITY
==================================================
This report uses source-traceable CMPDI/Ministry of Coal historical
data supplied through the MINQORA Unified MINQORA data service.
Unavailable values are shown as N/A.
No production, recovery, ash, moisture, density, coordinates,
DTM or risk values are fabricated where the public source does not
provide them.

Generated by MINQORA Geological Intelligence.
`;

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "minqora-real-cmpdi-geological-report.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            PHASE 04 · GEOLOGICAL INTELLIGENCE
          </div>

          <h1 style={styles.title}>Geological Intelligence</h1>

          <p style={styles.subtitle}>
            Evidence-based geological interpretation using the real
            Unified CMPDI/Ministry of Coal source dataset. Historical source
            snapshots, seam geometry, exploration information and block
            characteristics are preserved without inventing unavailable
            operational values.
          </p>
        </div>

        <button
          style={{
            ...styles.primaryButton,
            opacity: mines.length ? 1 : 0.55,
          }}
          onClick={downloadReport}
          disabled={!mines.length}
        >
          Download Geological Report
        </button>
      </div>

      <section style={styles.panel}>
        <div style={styles.eyebrow}>DATA SCOPE</div>

        <h2 style={styles.panelTitle}>
          Select the geological population to analyze
        </h2>

        <p style={styles.panelSubtitle}>
          All values below come from the source-backed Machhakata geological
          dataset. Missing public values are shown as N/A.
        </p>

        <div style={styles.filtersGrid}>
          <label style={styles.label}>
            Mine
            <select
              style={styles.select}
              value={mineFilter}
              onChange={(e) => setMineFilter(e.target.value)}
            >
              <option value="Machhakata (Revised)">Machhakata (Revised)</option>

              {MINE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Seam
            <select
              style={styles.select}
              value={seamFilter}
              onChange={(e) => setSeamFilter(e.target.value)}
            >
              {allSeams.map((seam) => (
                <option key={seam} value={seam}>
                  {seam === "ALL" ? "All Seams" : seam}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.statusCard}>
            <div style={styles.statusLabel}>SPATIAL DATA</div>
            <div style={styles.statusValue}>{spatialStatus}</div>
          </div>

          <div style={styles.statusCard}>
            <div style={styles.statusLabel}>DTM</div>
            <div style={styles.statusValue}>{dtmStatus}</div>
          </div>
        </div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}

      {loading ? (
        <section style={styles.panel}>
          <div style={styles.empty}>
            Loading real CMPDI geological intelligence...
          </div>
        </section>
      ) : (
        <>
          <div style={styles.kpiGrid}>
            <Kpi
              label="Real Mines"
              value={displayInteger(totals.mineCount)}
              sub="CMPDI/Ministry source records"
            />

            <Kpi
              label="Geological Resource"
              value={
                totals.resourceSourceCount
                  ? `${displayNumber(totals.resourceMt)} MT`
                  : "N/A"
              }
              sub={
                totals.resourceSourceCount
                  ? `${totals.resourceSourceCount} mine records with resource values`
                  : "No public value available"
              }
            />

            <Kpi
              label="Block Area"
              value={
                totals.areaSourceCount
                  ? `${displayNumber(totals.areaKm2)} km²`
                  : "N/A"
              }
              sub="Reported block areas only"
            />

            <Kpi
              label="Seam Records"
              value={displayInteger(totals.seamCount)}
              sub="Real seam-level records"
            />
          </div>

          <div style={styles.grid2}>
            <section style={styles.panel}>
              <div style={styles.eyebrow}>BLOCK INTELLIGENCE</div>

              <h2 style={styles.panelTitle}>
                Machhakata geological profile
              </h2>

              <p style={styles.panelSubtitle}>
                Geological and exploration characteristics are shown
                exactly where the source dataset provides them.
              </p>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {[
                        "Mine",
                        "Area",
                        "Resource",
                        "Grade",
                        "Exploration",
                        "Capacity",
                        "Mining Method",
                      ].map((heading) => (
                        <th key={heading} style={styles.th}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {mines.length ? (
                      mines.map((mine) => (
                        <tr key={mine.name}>
                          <td style={styles.tdStrong}>{mine.name}</td>
                          <td style={styles.td}>
                            {mine.areaKm2 !== null
                              ? `${displayNumber(mine.areaKm2)} km²`
                              : "N/A"}
                          </td>
                          <td style={styles.td}>
                            {mine.resourceMt !== null
                              ? `${displayNumber(mine.resourceMt)} MT`
                              : "N/A"}
                          </td>
                          <td style={styles.td}>{na(mine.grade)}</td>
                          <td style={styles.td}>
                            {na(mine.explorationGrade || mine.explorationStatus)}
                          </td>
                          <td style={styles.td}>
                            {mine.capacityMtpA !== null
                              ? `${displayNumber(mine.capacityMtpA)} MTPA`
                              : "N/A"}
                          </td>
                          <td style={styles.td}>
                            {na(mine.miningMethod)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.empty} colSpan="7">
                          No Machhakata geological data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.panel}>
              <div style={styles.eyebrow}>EXPLORATION</div>

              <h2 style={styles.panelTitle}>
                Exploration evidence
              </h2>

              <div style={styles.miniGrid}>
                <div style={styles.miniCard}>
                  <div style={styles.miniLabel}>Agency</div>
                  <div style={styles.miniValue}>
                    {na(selectedMine?.agency)}
                  </div>
                </div>

                <div style={styles.miniCard}>
                  <div style={styles.miniLabel}>Boreholes</div>
                  <div style={styles.miniValue}>
                    {displayInteger(selectedMine?.boreholes)}
                  </div>
                </div>

                <div style={styles.miniCard}>
                  <div style={styles.miniLabel}>Drilling</div>
                  <div style={styles.miniValue}>
                    {selectedMine?.drillingM != null
                      ? `${displayNumber(selectedMine.drillingM)} m`
                      : "N/A"}
                  </div>
                </div>
              </div>

              <div style={styles.note}>
                {selectedMine
                  ? `Exploration details shown for ${selectedMine.name}. Values such as strike, dip and borehole density are displayed only when the source provides them.`
                  : "Select a mine to inspect its detailed exploration evidence."}
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <tbody>
                    <tr>
                      <td style={styles.tdStrong}>Exploration grade</td>
                      <td style={styles.td}>
                        {na(selectedMine?.explorationGrade)}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdStrong}>Boreholes / km²</td>
                      <td style={styles.td}>
                        {displayNumber(selectedMine?.boreholesPerKm2)}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdStrong}>General strike</td>
                      <td style={styles.td}>
                        {na(selectedMine?.strike)}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.tdStrong}>General dip</td>
                      <td style={styles.td}>
                        {na(selectedMine?.dip)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>SEAM INTELLIGENCE</div>

            <h2 style={styles.panelTitle}>
              Real seam geometry and reserve records
            </h2>

            <p style={styles.panelSubtitle}>
              Seam values are displayed from the published/source-traceable
              records. No synthetic thickness, depth or reserve values are
              generated.
            </p>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Mine",
                      "Seam",
                      "Thickness Range",
                      "Depth Range",
                      "Geological Reserve",
                      "Grade",
                      "Source",
                    ].map((heading) => (
                      <th key={heading} style={styles.th}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredSeams.length ? (
                    filteredSeams.map((row, index) => (
                      <tr
                        key={`${row.mine}-${row.seam}-${index}`}
                      >
                        <td style={styles.tdStrong}>{row.mine}</td>
                        <td style={styles.tdStrong}>{row.seam}</td>
                        <td style={styles.td}>
                          {row.thicknessMin !== null ||
                          row.thicknessMax !== null
                            ? `${na(row.thicknessMin)} – ${na(
                                row.thicknessMax
                              )} m`
                            : "N/A"}
                        </td>
                        <td style={styles.td}>
                          {row.depthMin !== null ||
                          row.depthMax !== null
                            ? `${na(row.depthMin)} – ${na(
                                row.depthMax
                              )} m`
                            : "N/A"}
                        </td>
                        <td style={styles.td}>
                          {row.reserveMt !== null
                            ? `${displayNumber(row.reserveMt)} MT`
                            : "N/A"}
                        </td>
                        <td style={styles.td}>
                          {na(row.grade)}
                        </td>
                        <td style={styles.td}>
                          {na(row.source)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={styles.empty} colSpan="7">
                        No real seam-level data is available for the
                        current selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>GEOLOGICAL AI QUERY</div>

            <h2 style={styles.panelTitle}>
              Ask Geological Intelligence
            </h2>

            <p style={styles.panelSubtitle}>
              Ask a geological question in plain language. MINQORA searches the
              loaded CMPDI/Ministry geological records and returns an evidence-backed
              answer. It does not invent missing values.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <input
                value={geoQuestion}
                onChange={(event) => setGeoQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") askGeologicalIntelligence();
                }}
                placeholder='Try: "What is the thickest seam in Machhakata?"'
                style={{
                  flex: "1 1 520px",
                  minWidth: 260,
                  border: "1px solid #cbd8e6",
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 15,
                  color: "#13243a",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={askGeologicalIntelligence}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 20px",
                  background: "#12233d",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ASK
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {[ 
                "What is the thickest seam in Machhakata?",
                "What is the largest seam reserve in Machhakata?",
                "How well explored is Machhakata?",
                "What is the thickness of III MID?",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setGeoQuestion(example);
                    setGeoAnswer(answerGeologicalQuestion(example, mines, mineFilter));
                  }}
                  style={{
                    border: "1px solid #d4dfeb",
                    background: "#f7fafc",
                    color: "#31506d",
                    borderRadius: 999,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {example}
                </button>
              ))}
            </div>

            {geoAnswer && (
              <div style={{
                border: "1px solid #d7e2ec",
                borderRadius: 12,
                padding: 18,
                background: "#f8fbfd",
              }}>
                <div style={{ fontSize: 12, fontWeight: 850, letterSpacing: 1.5, color: "#1999ad", textTransform: "uppercase", marginBottom: 7 }}>
                  EVIDENCE-BACKED ANSWER
                </div>
                <div style={{ fontSize: 20, fontWeight: 850, color: "#12233d", marginBottom: 8 }}>
                  {geoAnswer.title}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.6, color: "#49647d", marginBottom: 12 }}>
                  {geoAnswer.text}
                </div>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={downloadAnswer}
                    style={{
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 15px",
                      background: "#12233d",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    DOWNLOAD ANSWER
                  </button>
                </div>

                {geoAnswer.evidence?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 850, letterSpacing: 1.2, color: "#62768a", textTransform: "uppercase", marginBottom: 6 }}>
                      Evidence used
                    </div>
                    {geoAnswer.evidence.map((item, index) => (
                      <div key={`${item}-${index}`} style={{ fontSize: 13, color: "#31506d", padding: "4px 0" }}>
                        • {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>HISTORICAL INTELLIGENCE</div>

            <h2 style={styles.panelTitle}>
              Historical source snapshots
            </h2>

            <p style={styles.panelSubtitle}>
              Different published years are preserved rather than
              overwritten. The year shown is the source/report year
              unless the source explicitly identifies a measurement year.
            </p>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Mine",
                      "Year",
                      "Resource",
                      "Grade",
                      "Exploration",
                      "Capacity",
                      "Source",
                    ].map((heading) => (
                      <th key={heading} style={styles.th}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {historicalRows.length ? (
                    historicalRows.map((row, index) => (
                      <tr key={`${row.mine}-${row.year}-${index}`}>
                        <td style={styles.tdStrong}>{row.mine}</td>
                        <td style={styles.td}>{na(row.year)}</td>
                        <td style={styles.td}>
                          {row.resourceMt !== null
                            ? `${displayNumber(row.resourceMt)} MT`
                            : "N/A"}
                        </td>
                        <td style={styles.td}>{na(row.grade)}</td>
                        <td style={styles.td}>{na(row.exploration)}</td>
                        <td style={styles.td}>
                          {row.capacity !== null
                            ? `${displayNumber(row.capacity)} MTPA`
                            : "N/A"}
                        </td>
                        <td style={styles.td}>{na(row.source)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={styles.empty} colSpan="7">
                        No historical snapshots are available for the
                        current selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>SPATIAL EVIDENCE</div>

            <h2 style={styles.panelTitle}>
              Spatial and terrain data status
            </h2>

            <div style={styles.miniGrid}>
              <div style={styles.miniCard}>
                <div style={styles.miniLabel}>Spatial status</div>
                <div style={styles.miniValue}>
                  {spatialStatus}
                </div>
              </div>

              <div style={styles.miniCard}>
                <div style={styles.miniLabel}>Coordinates</div>
                <div style={styles.miniValue}>
                  <Availability
                    value={selectedMine?.coordinatesAvailable}
                  />
                </div>
              </div>

              <div style={styles.miniCard}>
                <div style={styles.miniLabel}>DTM / DEM</div>
                <div style={styles.miniValue}>
                  <Availability
                    value={selectedMine?.dtmAvailable}
                  />
                </div>
              </div>
            </div>

            <div style={styles.note}>
              MINQORA does not claim a Machhakata or other CMPDI DTM
              exists publicly unless a verified source provides it.
              The previously available external terrain model is kept
              separate from the real CMPDI geological dataset.
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>DATA INTEGRITY</div>

            <h2 style={styles.panelTitle}>
              Evidence-first geological interpretation
            </h2>

            <div style={styles.note}>
              This version no longer treats the old 1,000 synthetic-style
              mining records as geological evidence. Real CMPDI/Ministry
              source values are used where available, historical years are
              preserved, conflicting published values are retained as
              separate source snapshots, and unavailable operational
              fields such as production, recovery, ash, moisture, density,
              coordinates or risk are shown as N/A rather than fabricated.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
