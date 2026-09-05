import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const normalizeRecord = (record = {}, index = 0) => ({
  ...record,
  id: record.id ?? record.record_id ?? record.record_no ?? index + 1,
  date: record.date ?? record.record_date ?? record.observation_date ?? record.year ?? "",
  mine: record.mine ?? record.mine_name ?? record.mineName ?? "Unknown Mine",
  seam: record.seam ?? record.seam_name ?? record.seamName ?? "Unknown Seam",
  thickness: toNumber(
    record.thickness ??
      record.thickness_m ??
      record.seam_thickness ??
      record.seam_thickness_m
  ),
  depth: toNumber(
    record.depth ??
      record.depth_m ??
      record.mining_depth ??
      record.depth_of_mining
  ),
  production: toNumber(
    record.production ??
      record.production_tonnes ??
      record.output
  ),
  recovery: toNumber(
    record.recovery ??
      record.recovery_pct ??
      record.recovery_percent ??
      record.recovery_factor
  ),
  ash: toNumber(
    record.ash ??
      record.ash_content ??
      record.ash_pct ??
      record.ash_percent
  ),
  moisture: toNumber(
    record.moisture ??
      record.moisture_pct ??
      record.moisture_percent
  ),
  risk: String(
    record.risk_level ??
      record.risk ??
      record.risk_category ??
      "NOT_AVAILABLE"
  )
    .trim()
    .toUpperCase(),
  area_m2: toNumber(
    record.area_m2 ?? record.seam_area_m2 ?? record.resource_area_m2
  ),
  density_t_m3: toNumber(
    record.density_t_m3 ?? record.coal_density ?? record.density
  ),
  recovery_factor: toNumber(record.recovery_factor),
  latitude: toNumber(record.latitude),
  longitude: toNumber(record.longitude),
  elevation: toNumber(record.elevation),
});

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatInteger = (value) => {
  if (!Number.isFinite(Number(value))) return "—";
  return Math.round(Number(value)).toLocaleString();
};

const downloadText = (filename, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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
    minWidth: 210,
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
    gridTemplateColumns: "minmax(220px,1fr) minmax(220px,1fr) 180px 180px",
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
  grid2Equal: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 20,
  },
  miniGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
    gap: 12,
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
  barRow: {
    display: "grid",
    gridTemplateColumns: "160px 1fr 70px",
    gap: 10,
    alignItems: "center",
    marginTop: 12,
  },
  barLabel: {
    color: "#49617a",
    fontSize: 13,
    fontWeight: 700,
  },
  barTrack: {
    height: 12,
    background: "#e8eff5",
    borderRadius: 99,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    background: "#3ca1b4",
    borderRadius: 99,
  },
  barValue: {
    textAlign: "right",
    color: "#17304d",
    fontWeight: 800,
    fontSize: 12,
  },
  note: {
    borderLeft: "4px solid #3ca1b4",
    background: "#f6fafc",
    padding: "13px 15px",
    borderRadius: "0 12px 12px 0",
    color: "#4f6880",
    lineHeight: 1.55,
    marginTop: 10,
  },
  empty: {
    padding: 34,
    textAlign: "center",
    color: "#71869c",
  },
  error: {
    background: "#fff4f4",
    border: "1px solid #edcaca",
    color: "#a03f3f",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
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

function RiskBadge({ risk }) {
  const normalized = String(risk || "NOT_AVAILABLE").toUpperCase();
  const background =
    normalized === "HIGH"
      ? "#fde2e2"
      : normalized === "MEDIUM"
      ? "#fff1cf"
      : normalized === "LOW"
      ? "#e1f4ea"
      : "#edf2f6";
  const color =
    normalized === "HIGH"
      ? "#a63636"
      : normalized === "MEDIUM"
      ? "#996100"
      : normalized === "LOW"
      ? "#1f7a50"
      : "#62768a";

  return (
    <span
      style={{
        display: "inline-flex",
        padding: "6px 10px",
        borderRadius: 99,
        background,
        color,
        fontSize: 11,
        fontWeight: 850,
      }}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

export default function GeologicalIntelligence() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mineFilter, setMineFilter] = useState("ALL");
  const [seamFilter, setSeamFilter] = useState("ALL");
  const [spatialStatus, setSpatialStatus] = useState("CHECKING");
  const [dtmStatus, setDtmStatus] = useState("CHECKING");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/mining-data?page=1&limit=5000`);
        if (!response.ok) {
          throw new Error(`Mining data request failed (${response.status})`);
        }

        const data = await response.json();
        const incoming = Array.isArray(data.records) ? data.records : [];
        setRecords(incoming.map(normalizeRecord));
      } catch (err) {
        setError(err.message || "Could not load mining data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const check = async (path, setter) => {
      try {
        const response = await fetch(`${API_URL}${path}`);
        if (!response.ok) {
          setter("NOT AVAILABLE");
          return;
        }
        const data = await response.json();
        const available =
          (Array.isArray(data?.data) && data.data.length > 0) ||
          (data?.data && Array.isArray(data.data.points) && data.data.points.length > 0);
        setter(available ? "AVAILABLE" : "NOT AVAILABLE");
      } catch {
        setter("NOT AVAILABLE");
      }
    };

    check("/spatial-data", setSpatialStatus);
    check("/dtm-data", setDtmStatus);
  }, []);

  const mines = useMemo(
    () => ["ALL", ...Array.from(new Set(records.map((r) => r.mine).filter(Boolean))).sort()],
    [records]
  );

  const seams = useMemo(
    () => ["ALL", ...Array.from(new Set(records.map((r) => r.seam).filter(Boolean))).sort()],
    [records]
  );

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const mineMatch = mineFilter === "ALL" || record.mine === mineFilter;
      const seamMatch = seamFilter === "ALL" || record.seam === seamFilter;
      return mineMatch && seamMatch;
    });
  }, [records, mineFilter, seamFilter]);

  const summary = useMemo(() => {
    if (!filtered.length) {
      return {
        records: 0,
        mines: 0,
        seams: 0,
        avgThickness: 0,
        minThickness: 0,
        maxThickness: 0,
        avgDepth: 0,
        minDepth: 0,
        maxDepth: 0,
        avgRecovery: 0,
        avgAsh: 0,
        avgMoisture: 0,
        totalProduction: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
      };
    }

    const values = (field) => filtered.map((r) => r[field]).filter((v) => Number.isFinite(v));
    const thickness = values("thickness");
    const depth = values("depth");

    const average = (field) => filtered.reduce((sum, r) => sum + r[field], 0) / filtered.length;

    return {
      records: filtered.length,
      mines: new Set(filtered.map((r) => r.mine)).size,
      seams: new Set(filtered.map((r) => r.seam)).size,
      avgThickness: average("thickness"),
      minThickness: Math.min(...thickness),
      maxThickness: Math.max(...thickness),
      avgDepth: average("depth"),
      minDepth: Math.min(...depth),
      maxDepth: Math.max(...depth),
      avgRecovery: average("recovery"),
      avgAsh: average("ash"),
      avgMoisture: average("moisture"),
      totalProduction: filtered.reduce((sum, r) => sum + r.production, 0),
      highRisk: filtered.filter((r) => r.risk === "HIGH").length,
      mediumRisk: filtered.filter((r) => r.risk === "MEDIUM").length,
      lowRisk: filtered.filter((r) => r.risk === "LOW").length,
    };
  }, [filtered]);

  const seamAnalysis = useMemo(() => {
    const grouped = {};

    filtered.forEach((record) => {
      const key = record.seam || "Unknown Seam";
      if (!grouped[key]) {
        grouped[key] = {
          seam: key,
          records: 0,
          thickness: 0,
          minThickness: Infinity,
          maxThickness: -Infinity,
          depth: 0,
          recovery: 0,
          ash: 0,
          moisture: 0,
          production: 0,
        };
      }

      const item = grouped[key];
      item.records += 1;
      item.thickness += record.thickness;
      item.minThickness = Math.min(item.minThickness, record.thickness);
      item.maxThickness = Math.max(item.maxThickness, record.thickness);
      item.depth += record.depth;
      item.recovery += record.recovery;
      item.ash += record.ash;
      item.moisture += record.moisture;
      item.production += record.production;
    });

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        avgThickness: item.thickness / item.records,
        avgDepth: item.depth / item.records,
        avgRecovery: item.recovery / item.records,
        avgAsh: item.ash / item.records,
        avgMoisture: item.moisture / item.records,
      }))
      .sort((a, b) => b.avgThickness - a.avgThickness);
  }, [filtered]);

  const mineAnalysis = useMemo(() => {
    const grouped = {};

    filtered.forEach((record) => {
      const key = record.mine || "Unknown Mine";
      if (!grouped[key]) {
        grouped[key] = {
          mine: key,
          records: 0,
          thickness: 0,
          depth: 0,
          recovery: 0,
          ash: 0,
          moisture: 0,
          production: 0,
          highRisk: 0,
        };
      }

      const item = grouped[key];
      item.records += 1;
      item.thickness += record.thickness;
      item.depth += record.depth;
      item.recovery += record.recovery;
      item.ash += record.ash;
      item.moisture += record.moisture;
      item.production += record.production;
      if (record.risk === "HIGH") item.highRisk += 1;
    });

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        avgThickness: item.thickness / item.records,
        avgDepth: item.depth / item.records,
        avgRecovery: item.recovery / item.records,
        avgAsh: item.ash / item.records,
        avgMoisture: item.moisture / item.records,
      }))
      .sort((a, b) => b.production - a.production);
  }, [filtered]);

  const thicknessBands = useMemo(() => {
    const bands = [
      { label: "< 2 m", count: 0 },
      { label: "2 – 4 m", count: 0 },
      { label: "4 – 6 m", count: 0 },
      { label: "> 6 m", count: 0 },
    ];

    filtered.forEach((record) => {
      if (record.thickness < 2) bands[0].count += 1;
      else if (record.thickness < 4) bands[1].count += 1;
      else if (record.thickness < 6) bands[2].count += 1;
      else bands[3].count += 1;
    });

    return bands;
  }, [filtered]);

  const depthBands = useMemo(() => {
    const bands = [
      { label: "< 100 m", count: 0 },
      { label: "100 – 200 m", count: 0 },
      { label: "200 – 300 m", count: 0 },
      { label: "> 300 m", count: 0 },
    ];

    filtered.forEach((record) => {
      if (record.depth < 100) bands[0].count += 1;
      else if (record.depth < 200) bands[1].count += 1;
      else if (record.depth < 300) bands[2].count += 1;
      else bands[3].count += 1;
    });

    return bands;
  }, [filtered]);

  const qualityProfile = useMemo(() => {
    if (!filtered.length) {
      return {
        lowestAsh: null,
        highestAsh: null,
        lowestMoisture: null,
        highestMoisture: null,
        highestRecovery: null,
      };
    }

    const sortedAsh = [...filtered].sort((a, b) => a.ash - b.ash);
    const sortedMoisture = [...filtered].sort((a, b) => a.moisture - b.moisture);
    const sortedRecovery = [...filtered].sort((a, b) => b.recovery - a.recovery);

    return {
      lowestAsh: sortedAsh[0],
      highestAsh: sortedAsh[sortedAsh.length - 1],
      lowestMoisture: sortedMoisture[0],
      highestMoisture: sortedMoisture[sortedMoisture.length - 1],
      highestRecovery: sortedRecovery[0],
    };
  }, [filtered]);

  const geologicalAssessment = useMemo(() => {
    if (!filtered.length) return [];

    const notes = [];
    const thicknessRange = summary.maxThickness - summary.minThickness;
    const thicknessRatio = summary.avgThickness ? thicknessRange / summary.avgThickness : 0;

    notes.push(
      `The selected dataset contains ${summary.records.toLocaleString()} historical records across ${summary.mines} mine${summary.mines === 1 ? "" : "s"} and ${summary.seams} seam${summary.seams === 1 ? "" : "s"}.`
    );

    notes.push(
      `Recorded seam thickness spans ${formatNumber(summary.minThickness)} m to ${formatNumber(summary.maxThickness)} m, with an average of ${formatNumber(summary.avgThickness)} m.`
    );

    if (thicknessRatio > 0.5) {
      notes.push(
        "Thickness variability is material within the selected records. Seam continuity, local structural controls and representative thickness selection should therefore be reviewed at planning stage."
      );
    } else {
      notes.push(
        "Thickness variability is comparatively controlled in the selected records, so the average thickness is a useful preliminary comparison metric."
      );
    }

    notes.push(
      `Average recorded depth is ${formatNumber(summary.avgDepth)} m, with observations ranging from ${formatNumber(summary.minDepth)} m to ${formatNumber(summary.maxDepth)} m.`
    );

    notes.push(
      `Coal-quality indicators in the selected records are ${formatNumber(summary.avgAsh)}% average ash and ${formatNumber(summary.avgMoisture)}% average moisture, alongside ${formatNumber(summary.avgRecovery)}% average recovery.`
    );

    if (summary.highRisk > 0) {
      notes.push(
        `${summary.highRisk} record${summary.highRisk === 1 ? "" : "s"} are classified HIGH risk in the source data and should be reviewed against geological and mine-planning conditions.`
      );
    }

    if (spatialStatus === "AVAILABLE") {
      notes.push(
        "Real spatial survey data is available through the backend and can be integrated with the geological profile for spatial interpretation."
      );
    } else {
      notes.push(
        "No usable spatial survey feed is currently detected, so this page does not fabricate coordinates, terrain surfaces or DTM interpretations."
      );
    }

    return notes;
  }, [filtered, summary, spatialStatus]);

  const downloadReport = () => {
    const text = `MINQORA GEOLOGICAL INTELLIGENCE REPORT

==================================================
SELECTION
==================================================
Mine: ${mineFilter === "ALL" ? "All Mines" : mineFilter}
Seam: ${seamFilter === "ALL" ? "All Seams" : seamFilter}
Records analyzed: ${summary.records}

==================================================
GEOLOGICAL SUMMARY
==================================================
Mines: ${summary.mines}
Seams: ${summary.seams}
Average thickness: ${formatNumber(summary.avgThickness)} m
Thickness range: ${formatNumber(summary.minThickness)} - ${formatNumber(summary.maxThickness)} m
Average depth: ${formatNumber(summary.avgDepth)} m
Depth range: ${formatNumber(summary.minDepth)} - ${formatNumber(summary.maxDepth)} m
Average recovery: ${formatNumber(summary.avgRecovery)}%
Average ash: ${formatNumber(summary.avgAsh)}%
Average moisture: ${formatNumber(summary.avgMoisture)}%
Total production: ${formatNumber(summary.totalProduction)}
Low risk: ${summary.lowRisk}
Medium risk: ${summary.mediumRisk}
High risk: ${summary.highRisk}

==================================================
SEAM INTELLIGENCE
==================================================
${seamAnalysis
  .map(
    (item) =>
      `${item.seam} | Records ${item.records} | Avg thickness ${formatNumber(item.avgThickness)} m | Thickness ${formatNumber(item.minThickness)}-${formatNumber(item.maxThickness)} m | Avg depth ${formatNumber(item.avgDepth)} m | Recovery ${formatNumber(item.avgRecovery)}% | Ash ${formatNumber(item.avgAsh)}% | Moisture ${formatNumber(item.avgMoisture)}% | Production ${formatNumber(item.production)}`
  )
  .join("\n")}

==================================================
MINE GEOLOGY COMPARISON
==================================================
${mineAnalysis
  .map(
    (item) =>
      `${item.mine} | Records ${item.records} | Avg thickness ${formatNumber(item.avgThickness)} m | Avg depth ${formatNumber(item.avgDepth)} m | Recovery ${formatNumber(item.avgRecovery)}% | Ash ${formatNumber(item.avgAsh)}% | Moisture ${formatNumber(item.avgMoisture)}% | Production ${formatNumber(item.production)} | High risk ${item.highRisk}`
  )
  .join("\n")}

==================================================
GEOLOGICAL ASSESSMENT
==================================================
${geologicalAssessment.map((item, index) => `${index + 1}. ${item}`).join("\n")}

==================================================
DATA SOURCE STATUS
==================================================
Mining data: Historical MINQORA mining records
Spatial data: ${spatialStatus}
DTM: ${dtmStatus}

Generated by MINQORA Geological Intelligence.
`;

    downloadText("minqora-geological-intelligence-full-report.txt", text);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>PHASE 04 · GEOLOGICAL INTELLIGENCE</div>
          <h1 style={styles.title}>Geological Intelligence</h1>
          <p style={styles.subtitle}>
            Full geological interpretation of the available MINQORA mining records — seam geometry indicators, depth, thickness variability, coal quality, recovery, risk, production and record-level evidence.
          </p>
        </div>
        <button
          style={{ ...styles.primaryButton, opacity: filtered.length ? 1 : 0.55 }}
          onClick={downloadReport}
          disabled={!filtered.length}
        >
          Download Full Geological Report
        </button>
      </div>

      <section style={styles.panel}>
        <div style={styles.eyebrow}>DATA SCOPE</div>
        <h2 style={styles.panelTitle}>Select the geological population to analyze</h2>
        <p style={styles.panelSubtitle}>
          Filters affect every geological statistic, comparison and record table below.
        </p>

        <div style={styles.filtersGrid}>
          <label style={styles.label}>
            Mine
            <select style={styles.select} value={mineFilter} onChange={(e) => setMineFilter(e.target.value)}>
              {mines.map((mine) => (
                <option key={mine} value={mine}>{mine === "ALL" ? "All Mines" : mine}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Seam
            <select style={styles.select} value={seamFilter} onChange={(e) => setSeamFilter(e.target.value)}>
              {seams.map((seam) => (
                <option key={seam} value={seam}>{seam === "ALL" ? "All Seams" : seam}</option>
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
          <div style={styles.empty}>Loading full geological intelligence...</div>
        </section>
      ) : (
        <>
          <div style={styles.kpiGrid}>
            <Kpi label="Records analyzed" value={formatInteger(summary.records)} sub="Historical observations" />
            <Kpi label="Mines" value={formatInteger(summary.mines)} sub="Distinct mining operations" />
            <Kpi label="Seams" value={formatInteger(summary.seams)} sub="Distinct coal seams" />
            <Kpi label="Total production" value={formatInteger(summary.totalProduction)} sub="Across selected records" />
            <Kpi label="Average thickness" value={`${formatNumber(summary.avgThickness)} m`} sub={`${formatNumber(summary.minThickness)}–${formatNumber(summary.maxThickness)} m range`} />
            <Kpi label="Average depth" value={`${formatNumber(summary.avgDepth)} m`} sub={`${formatNumber(summary.minDepth)}–${formatNumber(summary.maxDepth)} m range`} />
            <Kpi label="Average recovery" value={`${formatNumber(summary.avgRecovery)}%`} sub="Recorded recovery indicator" />
            <Kpi label="Average ash" value={`${formatNumber(summary.avgAsh)}%`} sub={`${formatNumber(summary.avgMoisture)}% average moisture`} />
          </div>

          <div style={styles.grid2}>
            <section style={styles.panel}>
              <div style={styles.eyebrow}>SEAM INTELLIGENCE</div>
              <h2 style={styles.panelTitle}>Geological profile by seam</h2>
              <p style={styles.panelSubtitle}>
                Thickness, depth, coal quality, recovery and production are summarized for every seam present in the selected dataset.
              </p>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Seam','Records','Avg Thickness','Range','Avg Depth','Recovery','Ash','Moisture','Production'].map((h) => <th key={h} style={styles.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {seamAnalysis.length ? seamAnalysis.map((item) => (
                      <tr key={item.seam}>
                        <td style={styles.tdStrong}>{item.seam}</td>
                        <td style={styles.td}>{item.records}</td>
                        <td style={styles.td}>{formatNumber(item.avgThickness)} m</td>
                        <td style={styles.td}>{formatNumber(item.minThickness)} – {formatNumber(item.maxThickness)} m</td>
                        <td style={styles.td}>{formatNumber(item.avgDepth)} m</td>
                        <td style={styles.td}>{formatNumber(item.avgRecovery)}%</td>
                        <td style={styles.td}>{formatNumber(item.avgAsh)}%</td>
                        <td style={styles.td}>{formatNumber(item.avgMoisture)}%</td>
                        <td style={styles.td}>{formatNumber(item.production)}</td>
                      </tr>
                    )) : (
                      <tr><td style={styles.empty} colSpan="9">No seam data for the current selection.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.panel}>
              <div style={styles.eyebrow}>THICKNESS DISTRIBUTION</div>
              <h2 style={styles.panelTitle}>Seam thickness classes</h2>
              <p style={styles.panelSubtitle}>Actual record counts grouped into practical thickness bands.</p>
              <div style={{ marginTop: 20 }}>
                {thicknessBands.map((band) => {
                  const max = Math.max(...thicknessBands.map((x) => x.count), 1);
                  return (
                    <div style={styles.barRow} key={band.label}>
                      <div style={styles.barLabel}>{band.label}</div>
                      <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${(band.count / max) * 100}%` }} /></div>
                      <div style={styles.barValue}>{band.count}</div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.note}>
                Thickness distribution is based directly on the selected historical records. It is a screening view, not a substitute for detailed seam correlation or geological modeling.
              </div>
            </section>
          </div>

          <div style={styles.grid2Equal}>
            <section style={styles.panel}>
              <div style={styles.eyebrow}>DEPTH INTELLIGENCE</div>
              <h2 style={styles.panelTitle}>Depth distribution</h2>
              <p style={styles.panelSubtitle}>Recorded mining depth grouped into depth bands.</p>
              <div style={{ marginTop: 18 }}>
                {depthBands.map((band) => {
                  const max = Math.max(...depthBands.map((x) => x.count), 1);
                  return (
                    <div style={styles.barRow} key={band.label}>
                      <div style={styles.barLabel}>{band.label}</div>
                      <div style={styles.barTrack}><div style={{ ...styles.barFill, width: `${(band.count / max) * 100}%` }} /></div>
                      <div style={styles.barValue}>{band.count}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={styles.panel}>
              <div style={styles.eyebrow}>RISK INTELLIGENCE</div>
              <h2 style={styles.panelTitle}>Geological-operational risk profile</h2>
              <div style={styles.miniGrid}>
                <div style={styles.miniCard}><div style={styles.miniLabel}>LOW</div><div style={styles.miniValue}>{summary.lowRisk}</div></div>
                <div style={styles.miniCard}><div style={styles.miniLabel}>MEDIUM</div><div style={styles.miniValue}>{summary.mediumRisk}</div></div>
                <div style={styles.miniCard}><div style={styles.miniLabel}>HIGH</div><div style={styles.miniValue}>{summary.highRisk}</div></div>
              </div>
              <div style={styles.note}>
                Risk classifications are displayed from the source records. Geological Intelligence does not replace mine-specific geotechnical or statutory risk assessment.
              </div>
            </section>
          </div>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>COAL QUALITY PROFILE</div>
            <h2 style={styles.panelTitle}>Quality, recovery and production context</h2>
            <div style={styles.miniGrid}>
              <div style={styles.miniCard}>
                <div style={styles.miniLabel}>Average Ash</div>
                <div style={styles.miniValue}>{formatNumber(summary.avgAsh)}%</div>
              </div>
              <div style={styles.miniCard}>
                <div style={styles.miniLabel}>Average Moisture</div>
                <div style={styles.miniValue}>{formatNumber(summary.avgMoisture)}%</div>
              </div>
              <div style={styles.miniCard}>
                <div style={styles.miniLabel}>Average Recovery</div>
                <div style={styles.miniValue}>{formatNumber(summary.avgRecovery)}%</div>
              </div>
            </div>
            <div style={{ ...styles.tableWrap, marginTop: 18 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Indicator</th>
                    <th style={styles.th}>Record</th>
                    <th style={styles.th}>Mine</th>
                    <th style={styles.th}>Seam</th>
                    <th style={styles.th}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Lowest ash", qualityProfile.lowestAsh, qualityProfile.lowestAsh ? `${formatNumber(qualityProfile.lowestAsh.ash)}%` : "—"],
                    ["Highest ash", qualityProfile.highestAsh, qualityProfile.highestAsh ? `${formatNumber(qualityProfile.highestAsh.ash)}%` : "—"],
                    ["Lowest moisture", qualityProfile.lowestMoisture, qualityProfile.lowestMoisture ? `${formatNumber(qualityProfile.lowestMoisture.moisture)}%` : "—"],
                    ["Highest moisture", qualityProfile.highestMoisture, qualityProfile.highestMoisture ? `${formatNumber(qualityProfile.highestMoisture.moisture)}%` : "—"],
                    ["Highest recovery", qualityProfile.highestRecovery, qualityProfile.highestRecovery ? `${formatNumber(qualityProfile.highestRecovery.recovery)}%` : "—"],
                  ].map(([label, record, value]) => (
                    <tr key={label}>
                      <td style={styles.tdStrong}>{label}</td>
                      <td style={styles.td}>{record?.id ?? "—"}</td>
                      <td style={styles.td}>{record?.mine ?? "—"}</td>
                      <td style={styles.td}>{record?.seam ?? "—"}</td>
                      <td style={styles.td}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>MINE GEOLOGY</div>
            <h2 style={styles.panelTitle}>Mine-by-mine geological comparison</h2>
            <p style={styles.panelSubtitle}>Compare the geological and operational characteristics of every mine represented in the selected records.</p>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Mine','Records','Avg Thickness','Avg Depth','Recovery','Ash','Moisture','Production','High Risk'].map((h) => <th key={h} style={styles.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mineAnalysis.length ? mineAnalysis.map((item) => (
                    <tr key={item.mine}>
                      <td style={styles.tdStrong}>{item.mine}</td>
                      <td style={styles.td}>{item.records}</td>
                      <td style={styles.td}>{formatNumber(item.avgThickness)} m</td>
                      <td style={styles.td}>{formatNumber(item.avgDepth)} m</td>
                      <td style={styles.td}>{formatNumber(item.avgRecovery)}%</td>
                      <td style={styles.td}>{formatNumber(item.avgAsh)}%</td>
                      <td style={styles.td}>{formatNumber(item.avgMoisture)}%</td>
                      <td style={styles.td}>{formatNumber(item.production)}</td>
                      <td style={styles.td}>{item.highRisk}</td>
                    </tr>
                  )) : (
                    <tr><td style={styles.empty} colSpan="9">No mine data for the current selection.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>GEOLOGICAL ASSESSMENT</div>
            <h2 style={styles.panelTitle}>Evidence-based interpretation</h2>
            {geologicalAssessment.map((note, index) => (
              <div style={styles.note} key={`${index}-${note}`}>{note}</div>
            ))}
          </section>

          <section style={styles.panel}>
            <div style={styles.eyebrow}>RECORD-LEVEL GEOLOGY</div>
            <h2 style={styles.panelTitle}>Complete selected historical records</h2>
            <p style={styles.panelSubtitle}>
              This is the detailed evidence layer behind the summaries above. No selected records are hidden from the geological review.
            </p>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['ID','Date','Mine','Seam','Thickness','Depth','Production','Recovery','Ash','Moisture','Risk','Area m²','Density t/m³','Elevation'].map((h) => <th key={h} style={styles.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? filtered.map((record) => (
                    <tr key={`${record.id}-${record.date}-${record.mine}-${record.seam}`}>
                      <td style={styles.td}>{record.id}</td>
                      <td style={styles.td}>{record.date || "—"}</td>
                      <td style={styles.tdStrong}>{record.mine}</td>
                      <td style={styles.tdStrong}>{record.seam}</td>
                      <td style={styles.td}>{formatNumber(record.thickness)} m</td>
                      <td style={styles.td}>{formatNumber(record.depth)} m</td>
                      <td style={styles.td}>{formatNumber(record.production)}</td>
                      <td style={styles.td}>{formatNumber(record.recovery)}%</td>
                      <td style={styles.td}>{formatNumber(record.ash)}%</td>
                      <td style={styles.td}>{formatNumber(record.moisture)}%</td>
                      <td style={styles.td}><RiskBadge risk={record.risk} /></td>
                      <td style={styles.td}>{record.area_m2 ? formatNumber(record.area_m2) : "—"}</td>
                      <td style={styles.td}>{record.density_t_m3 ? formatNumber(record.density_t_m3) : "—"}</td>
                      <td style={styles.td}>{record.elevation ? formatNumber(record.elevation) : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td style={styles.empty} colSpan="14">No records match the current geological filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
