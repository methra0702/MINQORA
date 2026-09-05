import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeRecord(record) {
  const recoveryFactorRaw =
    record.recovery_factor ??
    record.recovery_factor_pct ??
    record.recoveryFactor;

  let recoveryFactor = number(recoveryFactorRaw);
  if (recoveryFactor !== null && recoveryFactor > 1) {
    recoveryFactor = recoveryFactor / 100;
  }

  let areaM2 = number(
    record.area_m2 ??
      record.seam_area_m2 ??
      record.resource_area_m2 ??
      record.area
  );

  const areaHa = number(record.area_ha ?? record.area_hectares);
  if (areaM2 === null && areaHa !== null) {
    areaM2 = areaHa * 10000;
  }

  const length = number(record.length_m ?? record.seam_length_m);
  const width = number(record.width_m ?? record.seam_width_m);
  if (areaM2 === null && length !== null && width !== null) {
    areaM2 = length * width;
  }

  const thickness = number(
    record.thickness ?? record.thickness_m ?? record.seam_thickness
  );
  const density = number(
    record.density_t_m3 ?? record.coal_density ?? record.density
  );

  let inSitu = null;
  let recoverable = null;

  if (
    areaM2 !== null &&
    thickness !== null &&
    density !== null &&
    areaM2 >= 0 &&
    thickness >= 0 &&
    density >= 0
  ) {
    inSitu = areaM2 * thickness * density;
    if (recoveryFactor !== null && recoveryFactor >= 0) {
      recoverable = inSitu * recoveryFactor;
    }
  }

  return {
    ...record,
    id: record.id,
    date: record.date || record.record_date || record.year || "",
    mine:
      record.mine ||
      record.mine_name ||
      record.mineName ||
      "Unknown",
    seam:
      record.seam ||
      record.seam_name ||
      record.seamName ||
      "Unknown",
    thickness,
    depth: number(record.depth ?? record.depth_m ?? record.mining_depth),
    production: number(
      record.production ??
        record.production_tonnes ??
        record.output
    ),
    recovery: number(
      record.recovery ??
        record.recovery_pct ??
        record.recovery_percent
    ),
    ash: number(
      record.ash ??
        record.ash_content ??
        record.ash_pct ??
        record.ash_percent
    ),
    moisture: number(
      record.moisture ??
        record.moisture_pct ??
        record.moisture_percent
    ),
    risk: String(
      record.risk_level || record.risk || "NOT_AVAILABLE"
    ).toUpperCase(),
    areaM2,
    density,
    recoveryFactor,
    inSitu,
    recoverable,
  };
}

function fmt(value, digits = 2) {
  return value === null || value === undefined || !Number.isFinite(value)
    ? "N/A"
    : value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}

function fmtTonnes(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }
  if (value >= 1000000000) return `${fmt(value / 1000000000)} Bt`;
  if (value >= 1000000) return `${fmt(value / 1000000)} Mt`;
  if (value >= 1000) return `${fmt(value / 1000)} kt`;
  return `${fmt(value)} t`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const styles = {
  page: {
    padding: "42px 52px 70px",
    background: "#f5f8fb",
    minHeight: "100%",
    color: "#102744",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 26,
  },
  eyebrow: {
    color: "#249bb7",
    fontSize: 14,
    letterSpacing: "3px",
    fontWeight: 800,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 46,
    lineHeight: 1.08,
  },
  subtitle: {
    color: "#5b728e",
    fontSize: 17,
    lineHeight: 1.55,
    maxWidth: 900,
    marginTop: 12,
  },
  panel: {
    background: "#fff",
    border: "1px solid #d8e2ec",
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    boxShadow: "0 10px 28px rgba(16,39,68,0.05)",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  inputHint: {
    marginTop: 6,
    fontSize: 12,
    color: "#7890a8",
    lineHeight: 1.4,
  },
  calculationStrip: {
    marginTop: 18,
    padding: 18,
    border: "1px solid #d8e2ec",
    borderRadius: 14,
    background: "#f8fbfd",
  },
  calculationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginTop: 14,
  },
  calculationCard: {
    background: "#fff",
    border: "1px solid #dbe4ed",
    borderRadius: 12,
    padding: 16,
  },
  calculationLabel: {
    color: "#6d829a",
    fontSize: 11,
    letterSpacing: "1.5px",
    fontWeight: 800,
    textTransform: "uppercase",
  },
  calculationValue: {
    marginTop: 8,
    color: "#102744",
    fontSize: 22,
    fontWeight: 800,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontWeight: 700,
    color: "#405a76",
  },
  input: {
    minHeight: 52,
    padding: "0 14px",
    border: "1px solid #cad7e4",
    borderRadius: 12,
    background: "#fbfdff",
    color: "#16324f",
    fontSize: 15,
  },
  primary: {
    minHeight: 52,
    padding: "0 22px",
    border: 0,
    borderRadius: 12,
    background: "#3aa0b7",
    color: "#fff",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  kpi: {
    background: "#fff",
    border: "1px solid #d8e2ec",
    borderRadius: 18,
    padding: 22,
    minHeight: 128,
  },
  kpiLabel: {
    color: "#6d829a",
    fontSize: 12,
    letterSpacing: "2px",
    fontWeight: 800,
    textTransform: "uppercase",
    lineHeight: 1.4,
  },
  kpiValue: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: 800,
    color: "#102744",
  },
  sectionEyebrow: {
    color: "#249bb7",
    fontSize: 13,
    letterSpacing: "2.5px",
    fontWeight: 800,
  },
  sectionTitle: {
    margin: "8px 0 18px",
    fontSize: 28,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #dbe4ed",
    borderRadius: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980,
  },
  th: {
    background: "#13273d",
    color: "#fff",
    textAlign: "left",
    padding: "14px 12px",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 12px",
    borderTop: "1px solid #e1e8ef",
    color: "#294664",
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "13px 12px",
    borderTop: "1px solid #e1e8ef",
    color: "#102744",
    fontSize: 14,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  notice: {
    padding: 16,
    borderRadius: 12,
    border: "1px solid #d5e4ef",
    background: "#f7fbfe",
    color: "#48627e",
    marginBottom: 18,
    lineHeight: 1.55,
  },
  splitGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 24,
    marginBottom: 24,
  },
  noteList: {
    display: "grid",
    gap: 10,
  },
  note: {
    padding: 14,
    background: "#f8fbfd",
    border: "1px solid #dfe8ef",
    borderRadius: 12,
    lineHeight: 1.5,
    color: "#3e5874",
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: "#e8f1f7",
    color: "#42627d",
  },
};

export default function ResourceEvaluation() {
  const [records, setRecords] = useState([]);
  const [mineFilter, setMineFilter] = useState("ALL");
  const [seamFilter, setSeamFilter] = useState("ALL");

  // User-provided resource evaluation inputs. These are applied to the
  // currently selected mine/seam population and are clearly treated as
  // evaluation inputs rather than historical source values.
  const [resourceArea, setResourceArea] = useState("");
  const [resourceThickness, setResourceThickness] = useState("");
  const [resourceDensity, setResourceDensity] = useState("");
  const [resourceRecovery, setResourceRecovery] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/mining-data?page=1&limit=1000`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const normalized = (data.records || []).map(normalizeRecord);

        if (!cancelled) {
          setRecords(normalized);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load mining data.");
          setRecords([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const mines = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(records.map((r) => r.mine))).sort(),
    ],
    [records]
  );

  const seams = useMemo(
    () => [
      "ALL",
      ...Array.from(new Set(records.map((r) => r.seam))).sort(),
    ],
    [records]
  );

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const mineOk = mineFilter === "ALL" || record.mine === mineFilter;
      const seamOk = seamFilter === "ALL" || record.seam === seamFilter;
      return mineOk && seamOk;
    });
  }, [records, mineFilter, seamFilter]);

  const manualResource = useMemo(() => {
    const area = number(resourceArea);
    const thickness = number(resourceThickness);
    const density = number(resourceDensity);
    const recovery = number(resourceRecovery);

    const valid =
      area !== null && area > 0 &&
      thickness !== null && thickness > 0 &&
      density !== null && density > 0 &&
      recovery !== null && recovery >= 0 && recovery <= 100;

    if (!valid) {
      return { valid: false, area, thickness, density, recovery, volume: null, inSitu: null, recoverable: null };
    }

    const volume = area * thickness;
    const inSitu = volume * density;
    const recoverable = inSitu * (recovery / 100);

    return { valid: true, area, thickness, density, recovery, volume, inSitu, recoverable };
  }, [resourceArea, resourceThickness, resourceDensity, resourceRecovery]);

  const summary = useMemo(() => {
    const supported = filtered.filter(
      (r) => r.inSitu !== null && r.density !== null && r.areaM2 !== null
    );
    const recoverableSupported = supported.filter(
      (r) => r.recoverable !== null
    );

    const sum = (items, key) =>
      items.reduce((total, item) => {
        const value = item[key];
        return total + (value === null ? 0 : value);
      }, 0);

    const average = (items, key) => {
      const valid = items
        .map((item) => item[key])
        .filter((value) => value !== null && Number.isFinite(value));
      if (!valid.length) return null;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    const areaCoverage =
      filtered.length > 0 ? (supported.length / filtered.length) * 100 : 0;

    const densityCoverage =
      filtered.length > 0
        ? (filtered.filter((r) => r.density !== null).length /
            filtered.length) *
          100
        : 0;

    const recoveryFactorCoverage =
      filtered.length > 0
        ? (filtered.filter((r) => r.recoveryFactor !== null).length /
            filtered.length) *
          100
        : 0;

    return {
      total: filtered.length,
      supported: supported.length,
      recoverableSupported: recoverableSupported.length,
      inSituTotal: sum(supported, "inSitu"),
      recoverableTotal: sum(recoverableSupported, "recoverable"),
      avgThickness: average(filtered, "thickness"),
      avgDepth: average(filtered, "depth"),
      avgDensity: average(filtered, "density"),
      avgRecoveryFactor: average(
        recoverableSupported,
        "recoveryFactor"
      ),
      avgOperationalRecovery: average(filtered, "recovery"),
      avgAsh: average(filtered, "ash"),
      areaCoverage,
      densityCoverage,
      recoveryFactorCoverage,
    };
  }, [filtered]);

  const mineAnalysis = useMemo(() => {
    const groups = {};

    filtered.forEach((record) => {
      if (!groups[record.mine]) {
        groups[record.mine] = {
          mine: record.mine,
          records: 0,
          supported: 0,
          inSitu: 0,
          recoverable: 0,
          thickness: [],
          depth: [],
          density: [],
        };
      }

      const group = groups[record.mine];
      group.records += 1;

      if (record.inSitu !== null) {
        group.supported += 1;
        group.inSitu += record.inSitu;
      }

      if (record.recoverable !== null) {
        group.recoverable += record.recoverable;
      }

      if (record.thickness !== null) group.thickness.push(record.thickness);
      if (record.depth !== null) group.depth.push(record.depth);
      if (record.density !== null) group.density.push(record.density);
    });

    const avg = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return Object.values(groups)
      .map((group) => ({
        ...group,
        avgThickness: avg(group.thickness),
        avgDepth: avg(group.depth),
        avgDensity: avg(group.density),
        coverage:
          group.records > 0
            ? (group.supported / group.records) * 100
            : 0,
      }))
      .sort((a, b) => b.inSitu - a.inSitu);
  }, [filtered]);

  const seamAnalysis = useMemo(() => {
    const groups = {};

    filtered.forEach((record) => {
      const key = record.seam || "Unknown";
      if (!groups[key]) {
        groups[key] = {
          seam: key,
          records: 0,
          supported: 0,
          inSitu: 0,
          recoverable: 0,
          thickness: [],
          depth: [],
          density: [],
        };
      }

      const group = groups[key];
      group.records += 1;

      if (record.inSitu !== null) {
        group.supported += 1;
        group.inSitu += record.inSitu;
      }

      if (record.recoverable !== null) {
        group.recoverable += record.recoverable;
      }

      if (record.thickness !== null) group.thickness.push(record.thickness);
      if (record.depth !== null) group.depth.push(record.depth);
      if (record.density !== null) group.density.push(record.density);
    });

    const avg = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    return Object.values(groups)
      .map((group) => ({
        ...group,
        avgThickness: avg(group.thickness),
        avgDepth: avg(group.depth),
        avgDensity: avg(group.density),
        coverage:
          group.records > 0
            ? (group.supported / group.records) * 100
            : 0,
      }))
      .sort((a, b) => b.inSitu - a.inSitu);
  }, [filtered]);

  const confidence = useMemo(() => {
    if (!filtered.length) return "NO DATA";

    const score =
      summary.areaCoverage * 0.45 +
      summary.densityCoverage * 0.35 +
      summary.recoveryFactorCoverage * 0.2;

    if (score >= 85) return "HIGH";
    if (score >= 60) return "MODERATE";
    return "LIMITED";
  }, [filtered, summary]);

  const assessment = useMemo(() => {
    if (!filtered.length) {
      return ["No records match the current resource evaluation filters."];
    }

    const notes = [];

    notes.push(
      `${summary.total} historical mining records are being evaluated; ${summary.supported} have the area/thickness/density inputs needed for an in-situ tonnage calculation.`
    );

    if (summary.areaCoverage < 60) {
      notes.push(
        "Resource coverage is limited because many selected records do not contain a complete area/thickness/density basis."
      );
    } else if (summary.areaCoverage < 85) {
      notes.push(
        "Resource coverage is moderate. The supported records can provide a preliminary resource view, while unsupported records should remain explicitly excluded from tonnage totals."
      );
    } else {
      notes.push(
        "Resource coverage is strong for the selected population because most records contain the required physical parameters."
      );
    }

    if (summary.recoverableSupported === 0) {
      notes.push(
        "Recoverable resource cannot be quantified from the selected records because no usable recovery factor is present."
      );
    } else if (summary.recoveryFactorCoverage < 60) {
      notes.push(
        "Recoverable resource coverage is limited because recovery-factor data is incomplete."
      );
    } else {
      notes.push(
        `The supported recoverable-resource subset uses an average recovery factor of ${fmt(
          summary.avgRecoveryFactor * 100
        )}%.`
      );
    }

    if (summary.avgDensity !== null) {
      notes.push(
        `Average recorded coal density across rows with density data is ${fmt(
          summary.avgDensity
        )} t/m³.`
      );
    }

    return notes;
  }, [filtered, summary]);

  const downloadReport = () => {
    const mineText = mineFilter === "ALL" ? "All Mines" : mineFilter;
    const seamText = seamFilter === "ALL" ? "All Seams" : seamFilter;

    const mineRows = mineAnalysis
      .map(
        (row) =>
          `${row.mine} | Records ${row.records} | Supported ${row.supported} | Coverage ${fmt(
            row.coverage
          )}% | Avg Thickness ${fmt(
            row.avgThickness
          )} m | Avg Depth ${fmt(
            row.avgDepth
          )} m | Avg Density ${fmt(
            row.avgDensity
          )} t/m3 | In-situ ${fmtTonnes(
            row.inSitu
          )} | Recoverable ${fmtTonnes(row.recoverable)}`
      )
      .join("\n");

    const detailRows = filtered
      .map(
        (r) =>
          `${r.id} | ${r.date} | ${r.mine} | ${r.seam} | Thickness ${fmt(
            r.thickness
          )} m | Area ${fmt(r.areaM2)} m2 | Density ${fmt(
            r.density
          )} t/m3 | Recovery Factor ${
            r.recoveryFactor === null
              ? "N/A"
              : `${fmt(r.recoveryFactor * 100)}%`
          } | In-situ ${fmtTonnes(
            r.inSitu
          )} | Recoverable ${fmtTonnes(r.recoverable)}`
      )
      .join("\n");

    const text = `MINQORA RESOURCE EVALUATION REPORT

==================================================
SELECTION
==================================================
Mine: ${mineText}
Seam: ${seamText}
Records analyzed: ${summary.total}
Records with resource calculation support: ${summary.supported}
Recoverable-resource supported records: ${summary.recoverableSupported}

==================================================
RESOURCE SUMMARY
==================================================
Total in-situ resource: ${fmtTonnes(summary.inSituTotal)}
Total recoverable resource: ${fmtTonnes(summary.recoverableTotal)}
Average thickness: ${fmt(summary.avgThickness)} m
Average depth: ${fmt(summary.avgDepth)} m
Average density: ${fmt(summary.avgDensity)} t/m3
Average recovery factor: ${
      summary.avgRecoveryFactor === null
        ? "N/A"
        : `${fmt(summary.avgRecoveryFactor * 100)}%`
    }

==================================================
DATA COVERAGE
==================================================
Area/Thickness/Density coverage: ${fmt(summary.areaCoverage)}%
Density coverage: ${fmt(summary.densityCoverage)}%
Recovery-factor coverage: ${fmt(summary.recoveryFactorCoverage)}%
Confidence classification: ${confidence}

==================================================
MINE RESOURCE COMPARISON
==================================================
${mineRows || "No mine-level supported records."}

==================================================
RESOURCE ASSESSMENT
==================================================
${assessment.map((note, i) => `${i + 1}. ${note}`).join("\n")}

==================================================
RECORD-LEVEL RESOURCE EVIDENCE
==================================================
ID | Date | Mine | Seam | Thickness | Area | Density | Recovery Factor | In-situ | Recoverable
${detailRows || "No records available."}

==================================================
METHOD
==================================================
In-situ resource is calculated only when area, seam thickness and coal density are all present:
Area × Thickness × Density.

Recoverable resource is calculated only when the same inputs plus a usable recovery factor are present:
In-situ Resource × Recovery Factor.

Rows lacking required inputs are not assigned fabricated resource values.

Generated by MINQORA Resource Evaluation.
`;

    downloadText("minqora-resource-evaluation-report.txt", text);
  };

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.eyebrow}>
            PHASE 05 · RESOURCE EVALUATION
          </div>
          <h1 style={styles.title}>Resource Evaluation</h1>
          <p style={styles.subtitle}>
            Evidence-based coal resource estimation, resource coverage,
            mine/seam comparison, confidence and uncertainty analysis using
            actual MINQORA mining records.
          </p>
        </div>

        <button
          style={styles.primary}
          onClick={downloadReport}
          disabled={!filtered.length}
        >
          Download Resource Report
        </button>
      </div>

      <section style={styles.panel}>
        <div style={styles.eyebrow}>EVALUATION FILTERS</div>

        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Mine
            <select
              style={styles.input}
              value={mineFilter}
              onChange={(event) => setMineFilter(event.target.value)}
            >
              {mines.map((mine) => (
                <option key={mine} value={mine}>
                  {mine === "ALL" ? "All Mines" : mine}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Seam
            <select
              style={styles.input}
              value={seamFilter}
              onChange={(event) => setSeamFilter(event.target.value)}
            >
              {seams.map((seam) => (
                <option key={seam} value={seam}>
                  {seam === "ALL" ? "All Seams" : seam}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Area (m²)
            <input
              type="number"
              min="0"
              step="any"
              style={styles.input}
              value={resourceArea}
              onChange={(event) => setResourceArea(event.target.value)}
              placeholder="Enter area"
            />
          </label>

          <label style={styles.label}>
            Average Thickness (m)
            <input
              type="number"
              min="0"
              step="any"
              style={styles.input}
              value={resourceThickness}
              onChange={(event) => setResourceThickness(event.target.value)}
              placeholder="Enter thickness"
            />
          </label>

          <label style={styles.label}>
            Density (t/m³)
            <input
              type="number"
              min="0"
              step="any"
              style={styles.input}
              value={resourceDensity}
              onChange={(event) => setResourceDensity(event.target.value)}
              placeholder="Enter density"
            />
          </label>

          <label style={styles.label}>
            Recovery Factor (%)
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              style={styles.input}
              value={resourceRecovery}
              onChange={(event) => setResourceRecovery(event.target.value)}
              placeholder="Enter recovery"
            />
          </label>

          <div>
            <div style={styles.label}>Confidence</div>
            <div style={{ ...styles.input, display: "flex", alignItems: "center" }}>
              <span style={styles.badge}>{confidence}</span>
            </div>
          </div>

          <div>
            <div style={styles.label}>Data Coverage</div>
            <div style={{ ...styles.input, display: "flex", alignItems: "center" }}>
              {fmt(summary.areaCoverage)}%
            </div>
          </div>
        </div>

        <div style={styles.inputHint}>
          Enter the resource parameters for the selected mine/seam. These values are user-provided evaluation inputs and are not treated as historical source records.
        </div>

        {manualResource.valid && (
          <div style={styles.calculationStrip}>
            <div style={styles.sectionEyebrow}>CALCULATED RESOURCE</div>
            <div style={{ marginTop: 6, color: "#48627e", lineHeight: 1.5 }}>
              Area × Thickness gives volume; volume × density gives in-situ resource; recovery factor gives recoverable resource.
            </div>
            <div style={styles.calculationGrid}>
              <div style={styles.calculationCard}>
                <div style={styles.calculationLabel}>Volume</div>
                <div style={styles.calculationValue}>{fmt(manualResource.volume)} m³</div>
              </div>
              <div style={styles.calculationCard}>
                <div style={styles.calculationLabel}>In-Situ Resource</div>
                <div style={styles.calculationValue}>{fmtTonnes(manualResource.inSitu)}</div>
              </div>
              <div style={styles.calculationCard}>
                <div style={styles.calculationLabel}>Recoverable Resource</div>
                <div style={styles.calculationValue}>{fmtTonnes(manualResource.recoverable)}</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && <div style={styles.notice}>{error}</div>}

      {loading ? (
        <div style={styles.panel}>Loading resource intelligence...</div>
      ) : (
        <>
          <section style={styles.kpiGrid}>
            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>Records Evaluated</div>
              <div style={styles.kpiValue}>{summary.total}</div>
            </div>

            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>Supported Records</div>
              <div style={styles.kpiValue}>{summary.supported}</div>
            </div>

            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>In-Situ Resource</div>
              <div style={styles.kpiValue}>{fmtTonnes(summary.inSituTotal)}</div>
            </div>

            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>Recoverable Resource</div>
              <div style={styles.kpiValue}>
                {fmtTonnes(summary.recoverableTotal)}
              </div>
            </div>

            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>Average Density</div>
              <div style={styles.kpiValue}>
                {summary.avgDensity === null
                  ? "N/A"
                  : `${fmt(summary.avgDensity)} t/m³`}
              </div>
            </div>

            <div style={styles.kpi}>
              <div style={styles.kpiLabel}>Recovery-Factor Coverage</div>
              <div style={styles.kpiValue}>
                {fmt(summary.recoveryFactorCoverage)}%
              </div>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.sectionEyebrow}>RESOURCE METHODOLOGY</div>
            <h2 style={styles.sectionTitle}>
              What MINQORA can actually calculate from the data
            </h2>

            <div style={styles.notice}>
              <strong>In-situ resource:</strong> calculated only where area,
              seam thickness and coal density are available.{" "}
              <strong>Recoverable resource:</strong> calculated only where a
              usable recovery factor is also available. Missing inputs remain
              N/A rather than being estimated with invented values.
            </div>

            <div style={styles.splitGrid}>
              <div style={styles.panel}>
                <div style={styles.sectionEyebrow}>DATA COVERAGE</div>
                <h3 style={{ margin: "8px 0 12px" }}>
                  Input completeness
                </h3>
                <div style={styles.noteList}>
                  <div style={styles.note}>
                    Area / thickness / density coverage:{" "}
                    <strong>{fmt(summary.areaCoverage)}%</strong>
                  </div>
                  <div style={styles.note}>
                    Density coverage:{" "}
                    <strong>{fmt(summary.densityCoverage)}%</strong>
                  </div>
                  <div style={styles.note}>
                    Recovery-factor coverage:{" "}
                    <strong>
                      {fmt(summary.recoveryFactorCoverage)}%
                    </strong>
                  </div>
                </div>
              </div>

              <div style={styles.panel}>
                <div style={styles.sectionEyebrow}>RESOURCE ASSESSMENT</div>
                <h3 style={{ margin: "8px 0 12px" }}>
                  Evidence-based interpretation
                </h3>
                <div style={styles.noteList}>
                  {assessment.map((note, index) => (
                    <div style={styles.note} key={index}>
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.sectionEyebrow}>MINE RESOURCE INTELLIGENCE</div>
            <h2 style={styles.sectionTitle}>Resource profile by mine</h2>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Mine</th>
                    <th style={styles.th}>Records</th>
                    <th style={styles.th}>Supported</th>
                    <th style={styles.th}>Coverage</th>
                    <th style={styles.th}>Avg Thickness</th>
                    <th style={styles.th}>Avg Depth</th>
                    <th style={styles.th}>Avg Density</th>
                    <th style={styles.th}>In-Situ</th>
                    <th style={styles.th}>Recoverable</th>
                  </tr>
                </thead>
                <tbody>
                  {mineAnalysis.length ? (
                    mineAnalysis.map((row) => (
                      <tr key={row.mine}>
                        <td style={styles.tdStrong}>{row.mine}</td>
                        <td style={styles.td}>{row.records}</td>
                        <td style={styles.td}>{row.supported}</td>
                        <td style={styles.td}>{fmt(row.coverage)}%</td>
                        <td style={styles.td}>
                          {fmt(row.avgThickness)} m
                        </td>
                        <td style={styles.td}>{fmt(row.avgDepth)} m</td>
                        <td style={styles.td}>
                          {row.avgDensity === null
                            ? "N/A"
                            : `${fmt(row.avgDensity)} t/m³`}
                        </td>
                        <td style={styles.td}>{fmtTonnes(row.inSitu)}</td>
                        <td style={styles.td}>
                          {fmtTonnes(row.recoverable)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={styles.td} colSpan="9">
                        No resource records available for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.sectionEyebrow}>SEAM RESOURCE INTELLIGENCE</div>
            <h2 style={styles.sectionTitle}>Resource profile by seam</h2>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Seam</th>
                    <th style={styles.th}>Records</th>
                    <th style={styles.th}>Supported</th>
                    <th style={styles.th}>Coverage</th>
                    <th style={styles.th}>Avg Thickness</th>
                    <th style={styles.th}>Avg Depth</th>
                    <th style={styles.th}>Avg Density</th>
                    <th style={styles.th}>In-Situ</th>
                    <th style={styles.th}>Recoverable</th>
                  </tr>
                </thead>
                <tbody>
                  {seamAnalysis.length ? (
                    seamAnalysis.map((row) => (
                      <tr key={row.seam}>
                        <td style={styles.tdStrong}>{row.seam}</td>
                        <td style={styles.td}>{row.records}</td>
                        <td style={styles.td}>{row.supported}</td>
                        <td style={styles.td}>{fmt(row.coverage)}%</td>
                        <td style={styles.td}>
                          {fmt(row.avgThickness)} m
                        </td>
                        <td style={styles.td}>{fmt(row.avgDepth)} m</td>
                        <td style={styles.td}>
                          {row.avgDensity === null
                            ? "N/A"
                            : `${fmt(row.avgDensity)} t/m³`}
                        </td>
                        <td style={styles.td}>{fmtTonnes(row.inSitu)}</td>
                        <td style={styles.td}>
                          {fmtTonnes(row.recoverable)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={styles.td} colSpan="9">
                        No seam resource data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.sectionEyebrow}>RECORD-LEVEL EVIDENCE</div>
            <h2 style={styles.sectionTitle}>
              Complete resource evaluation evidence
            </h2>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Mine</th>
                    <th style={styles.th}>Seam</th>
                    <th style={styles.th}>Thickness</th>
                    <th style={styles.th}>Area</th>
                    <th style={styles.th}>Density</th>
                    <th style={styles.th}>Recovery Factor</th>
                    <th style={styles.th}>In-Situ</th>
                    <th style={styles.th}>Recoverable</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>{record.id}</td>
                      <td style={styles.td}>{record.date}</td>
                      <td style={styles.td}>{record.mine}</td>
                      <td style={styles.tdStrong}>{record.seam}</td>
                      <td style={styles.td}>
                        {fmt(record.thickness)} m
                      </td>
                      <td style={styles.td}>
                        {record.areaM2 === null
                          ? "N/A"
                          : `${fmt(record.areaM2)} m²`}
                      </td>
                      <td style={styles.td}>
                        {record.density === null
                          ? "N/A"
                          : `${fmt(record.density)} t/m³`}
                      </td>
                      <td style={styles.td}>
                        {record.recoveryFactor === null
                          ? "N/A"
                          : `${fmt(record.recoveryFactor * 100)}%`}
                      </td>
                      <td style={styles.td}>
                        {fmtTonnes(record.inSitu)}
                      </td>
                      <td style={styles.td}>
                        {fmtTonnes(record.recoverable)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
