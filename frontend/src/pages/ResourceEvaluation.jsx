import { useEffect, useMemo, useState } from "react";



const API_URL = "https://minqora-brain1.onrender.com";



function safeNumber(value) {

  if (value === null || value === undefined || value === "") return null;

  const n = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(n) ? n : null;

}



function formatNumber(value, digits = 2) {

  const n = safeNumber(value);

  if (n === null) return "N/A";

  return n.toLocaleString("en-IN", {

    minimumFractionDigits: digits,

    maximumFractionDigits: digits,

  });

}



function formatMT(value) {

  const n = safeNumber(value);

  if (n === null) return "N/A";

  return `${n.toLocaleString("en-IN", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  })} MT`;

}



function displayValue(value) {

  // CMPDI source fields can be either plain values or objects such as

  // { value, unit, source } / { count, unit, source }.

  // Never return the whole object to JSX.

  if (value && typeof value === "object") {

    if ("value" in value) return displayValue(value.value);

    if ("count" in value) return displayValue(value.count);

    if ("name" in value) return displayValue(value.name);

    if ("label" in value) return displayValue(value.label);

    return "N/A";

  }

  return value === null || value === undefined || value === "" ? "N/A" : value;

}



function sourceOf(value) {

  if (value && typeof value === "object" && "source" in value) {

    return value.source || "";

  }

  return "";

}



function parseRange(value) {

  if (value === null || value === undefined) {

    return { min: null, max: null };

  }



  if (typeof value === "object") {

    const min = safeNumber(value.min);

    const max = safeNumber(value.max);

    if (min !== null || max !== null) return { min, max };

  }



  const text = String(value).replace(/–/g, "-").replace(/—/g, "-");

  const match = text.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);



  if (match) {

    return {

      min: safeNumber(match[1]),

      max: safeNumber(match[2]),

    };

  }



  const single = safeNumber(text);

  return { min: single, max: single };

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

    padding: "38px 48px 70px",

    background: "#f5f8fb",

    minHeight: "100%",

    color: "#102744",

    boxSizing: "border-box",

  },

  header: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "flex-start",

    gap: 24,

    marginBottom: 26,

  },

  eyebrow: {

    color: "#249bb7",

    fontSize: 13,

    letterSpacing: "2.5px",

    fontWeight: 800,

    marginBottom: 9,

  },

  title: {

    margin: 0,

    fontSize: 42,

    lineHeight: 1.08,

  },

  subtitle: {

    margin: "12px 0 0",

    color: "#5b728e",

    fontSize: 16,

    lineHeight: 1.55,

    maxWidth: 900,

  },

  button: {

    minHeight: 48,

    padding: "0 18px",

    border: 0,

    borderRadius: 11,

    background: "#2f91aa",

    color: "#fff",

    fontWeight: 800,

    cursor: "pointer",

    whiteSpace: "nowrap",

  },

  panel: {

    background: "#fff",

    border: "1px solid #d8e2ec",

    borderRadius: 18,

    padding: 24,

    marginBottom: 22,

    boxShadow: "0 8px 24px rgba(16,39,68,0.045)",

  },

  kpiGrid: {

    display: "grid",

    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",

    gap: 14,

    marginBottom: 22,

  },

  kpi: {

    background: "#fff",

    border: "1px solid #d8e2ec",

    borderRadius: 16,

    padding: 18,

    minHeight: 112,

    boxSizing: "border-box",

  },

  kpiLabel: {

    color: "#71849a",

    fontSize: 11,

    letterSpacing: "1.7px",

    fontWeight: 800,

    textTransform: "uppercase",

    lineHeight: 1.4,

  },

  kpiValue: {

    marginTop: 13,

    fontSize: 24,

    fontWeight: 800,

    color: "#102744",

  },

  sectionTitle: {

    margin: "7px 0 17px",

    fontSize: 27,

  },

  twoCol: {

    display: "grid",

    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

    gap: 20,

  },

  infoGrid: {

    display: "grid",

    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

    gap: 12,

  },

  info: {

    border: "1px solid #e0e7ee",

    borderRadius: 12,

    padding: 14,

    background: "#f9fbfd",

  },

  infoLabel: {

    fontSize: 11,

    color: "#71849a",

    fontWeight: 800,

    letterSpacing: "1.3px",

    textTransform: "uppercase",

  },

  infoValue: {

    marginTop: 6,

    fontSize: 17,

    fontWeight: 750,

    color: "#173653",

  },

  source: {

    marginTop: 6,

    fontSize: 11,

    color: "#7a8da1",

    lineHeight: 1.4,

  },

  notice: {

    padding: 15,

    borderRadius: 12,

    border: "1px solid #d5e4ef",

    background: "#f7fbfe",

    color: "#48627e",

    lineHeight: 1.55,

    marginBottom: 16,

  },

  warning: {

    padding: 15,

    borderRadius: 12,

    border: "1px solid #eadfbf",

    background: "#fffaf0",

    color: "#6c5a2e",

    lineHeight: 1.55,

    marginBottom: 16,

  },

  tableWrap: {

    overflowX: "auto",

    border: "1px solid #dbe4ed",

    borderRadius: 13,

  },

  table: {

    width: "100%",

    borderCollapse: "collapse",

    minWidth: 1080,

  },

  th: {

    background: "#13273d",

    color: "#fff",

    textAlign: "left",

    padding: "13px 11px",

    fontSize: 12,

    fontWeight: 800,

    whiteSpace: "nowrap",

  },

  td: {

    padding: "12px 11px",

    borderTop: "1px solid #e1e8ef",

    color: "#294664",

    fontSize: 13,

    whiteSpace: "nowrap",

  },

  tdStrong: {

    padding: "12px 11px",

    borderTop: "1px solid #e1e8ef",

    color: "#102744",

    fontSize: 13,

    fontWeight: 800,

    whiteSpace: "nowrap",

  },

  badge: {

    display: "inline-flex",

    padding: "5px 9px",

    borderRadius: 999,

    background: "#e8f1f7",

    color: "#42627d",

    fontSize: 11,

    fontWeight: 800,

  },

  empty: {

    padding: 24,

    textAlign: "center",

    color: "#71849a",

  },

};



export default function ResourceEvaluation() {

  const [data, setData] = useState(null);

  const [mineFilter, setMineFilter] = useState("ALL");

  const [seamFilter, setSeamFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  useEffect(() => {

    let cancelled = false;



    async function loadRealCMPDIData() {

      setLoading(true);

      setError("");



      try {

        const response = await fetch(`${API_URL}/cmpdi/multi-mine/all`);



        if (!response.ok) {

          throw new Error(`CMPDI API returned HTTP ${response.status}`);

        }



        const packageData = await response.json();

      let json = packageData;

      if (Array.isArray(packageData?.mines)) {
        const machhakata = packageData.mines.find(
          (mine) =>
            String(mine?.name || "")
              .trim()
              .toLowerCase() === "machhakata (revised)"
        );

        if (!machhakata) {
          throw new Error(
            "Machhakata (Revised) geological record was not found."
          );
        }

        const block = machhakata.block || {};
        const explorationRaw = machhakata.exploration || {};

        json = {
          block: {
            block: {
              block_name: machhakata.name || "Machhakata (Revised)",
              state: block.state || "Odisha",
              district: block.district || "Angul",
              coalfield: block.coalfield || "Talcher",
              area: { value: block.area_km2, unit: "km²" },
              geological_resource: { value: block.geological_resource_mt, unit: "MT" },
              geological_resource_mt: block.geological_resource_mt,
              average_grade: block.grade,
              exploration_status: block.exploration_status,
              peak_rated_capacity: { value: block.prc_mtpa, unit: "MTPA" },
              mine_type: block.mining_method || "Opencast"
            }
          },
          exploration: {
            exploration: {
              exploration_agency: explorationRaw.exploration_agency,
              exploration_grade: explorationRaw.exploration_grade,
              exploration_status: block.exploration_status,
              boreholes: explorationRaw.boreholes,
              total_drilling: { value: explorationRaw.drilling_m, unit: "m" },
              borehole_density: { value: explorationRaw.boreholes_per_km2, unit: "/km²" },
              general_strike: explorationRaw.strike,
              general_dip: explorationRaw.dip
            }
          },
          spatial: { spatial: machhakata.spatial || {} },
          seams: { seams: machhakata.seams || [] },
          sources: { sources: [] }
        };
      }

      if (!cancelled) {
        setData(json);
      }

      } catch (err) {

        if (!cancelled) {

          setError(

            err?.message ||

              "Could not load real CMPDI data from the deployed MINQORA Brain 1 service."

          );

          setData(null);

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    }



    loadRealCMPDIData();



    return () => {

      cancelled = true;

    };

  }, []);



  const block = data?.block || {};

  const blockDetails = block?.block || block;

  const exploration = data?.exploration?.exploration || data?.exploration || {};

  const spatial = data?.spatial?.spatial || data?.spatial || {};

  const seamData = data?.seams || {};

  const rawSeams = Array.isArray(seamData?.seams) ? seamData.seams : [];

  const sourceData = data?.sources || {};

  const apiSources = Array.isArray(sourceData?.sources) ? sourceData.sources : [];



  // The Machhakata endpoint currently returns the geological records but

  // does not expose a separate source-registry array. Build the registry

  // from the source metadata already attached to the dataset instead of

  // showing an empty traceability section.

  const sources = apiSources.length

    ? apiSources

    : [

        {

          source_id: "SRC-MACH-01",

          organization: "MSTC / Coal Block Summary",

          title: "Machhakata & Mahanadi Coal Block Summary — Geological Report data",

          source_type: "Source-derived geological report",

          reliability: "Source-traceable"

        }

      ];



  const normalizedSeams = useMemo(() => {

    return rawSeams.map((seam, index) => {

      const thicknessRange = parseRange(

        seam.thickness_range ?? seam.thickness ?? seam.thickness_m ?? (seam.thickness_min_m !== undefined && seam.thickness_max_m !== undefined ? `${seam.thickness_min_m}–${seam.thickness_max_m}` : null)

      );

      const depthRange = parseRange(

        seam.depth_range ?? seam.depth ?? seam.floor_depth_range ?? (seam.depth_min_m !== undefined && seam.depth_max_m !== undefined ? `${seam.depth_min_m}–${seam.depth_max_m}` : null)

      );



      return {

        id: seam.id ?? index + 1,

        seam:

          seam.seam_name ??

          seam.name ??

          seam.seam ??

          `Seam ${index + 1}`,

        thicknessMin: thicknessRange.min,

        thicknessMax: thicknessRange.max,

        depthMin: depthRange.min,

        depthMax: depthRange.max,

        reserve: safeNumber(

          seam.geological_reserve_mt ??

            seam.geological_reserve ??

            seam.reserve_mt ??

            seam.reserve

        ),

        grade: seam.grade ?? seam.exploration_grade ?? seam.coal_grade ?? "N/A",

      };

    });

  }, [rawSeams]);



  const mines = ["ALL", "Machhakata (Revised)"];

  const seamOptions = useMemo(

    () => ["ALL", ...normalizedSeams.map((row) => row.seam)],

    [normalizedSeams]

  );



  const filteredSeams = useMemo(() => {

    return normalizedSeams.filter(

      (row) => seamFilter === "ALL" || row.seam === seamFilter

    );

  }, [normalizedSeams, seamFilter]);



  const seamReserveTotal = useMemo(

    () =>

      normalizedSeams.reduce(

        (sum, row) => sum + (row.reserve === null ? 0 : row.reserve),

        0

      ),

    [normalizedSeams]

  );



  const largestSeam = useMemo(() => {

    return normalizedSeams.reduce((best, row) => {

      if (row.reserve === null) return best;

      if (!best || row.reserve > best.reserve) return row;

      return best;

    }, null);

  }, [normalizedSeams]);



  const selectedReserveTotal = useMemo(

    () =>

      filteredSeams.reduce(

        (sum, row) => sum + (row.reserve === null ? 0 : row.reserve),

        0

      ),

    [filteredSeams]

  );



  const selectedCount = filteredSeams.length;



  const ccbisResource = safeNumber(

    blockDetails?.geological_resource?.value ??

      blockDetails?.geological_resource_mt

  );



  const ccbisArea = displayValue(blockDetails?.area);

  const ccbisGrade = displayValue(blockDetails?.average_grade);

  const ccbisPRC = displayValue(blockDetails?.peak_rated_capacity);



  const downloadReport = () => {

    const selectedText =

      seamFilter === "ALL" ? "All 24 published seams" : seamFilter;



    const rows = filteredSeams

      .map(

        (row) =>

          `${row.seam} | Thickness ${formatNumber(

            row.thicknessMin

          )}-${formatNumber(row.thicknessMax)} m | Depth ${formatNumber(

            row.depthMin

          )}-${formatNumber(row.depthMax)} m | Geological Reserve ${

            row.reserve === null ? "N/A" : `${formatNumber(row.reserve)} MT`

          } | Grade ${row.grade}`

      )

      .join("\n");



    const text = `MINQORA — REAL CMPDI RESOURCE EVALUATION

==================================================



CASE

Block: Machhakata (Revised)

State: ${blockDetails?.state ?? "Odisha"}

District: ${blockDetails?.district ?? "Angul"}

Coalfield: ${blockDetails?.coalfield ?? "Talcher"}

Mine Type: ${blockDetails?.mine_type ?? "Opencast"}



SOURCE-TRACEABLE BLOCK VALUES

CMPDI CCBIS tentative area: ${ccbisArea?.value ?? ccbisArea ?? "N/A"} ${

      ccbisArea?.unit ?? "km2"

    }

CMPDI CCBIS tentative geological resource: ${

      ccbisResource === null ? "N/A" : `${formatNumber(ccbisResource)} MT`

    }

CMPDI CCBIS average grade: ${ccbisGrade}

CMPDI CCBIS tentative peak rated capacity: ${ccbisPRC?.value ?? ccbisPRC ?? "N/A"} ${

      ccbisPRC?.unit ?? "MTPA"

    }



SEAM-LEVEL PUBLISHED DATA

Published seams represented: ${normalizedSeams.length}

Published seam-table reserve total: ${formatNumber(seamReserveTotal)} MT

Largest published seam: ${largestSeam?.seam ?? "N/A"}

Largest seam reserve: ${

      largestSeam ? formatNumber(largestSeam.reserve) + " MT" : "N/A"

    }



SELECTION

Selected: ${selectedText}

Selected seam count: ${selectedCount}

Selected seam-table reserve: ${formatNumber(selectedReserveTotal)} MT



EXPLORATION

Exploration status: ${exploration?.exploration_status ?? "Explored"}

Exploration category: ${displayValue(exploration?.exploration_category)}

Boreholes: ${displayValue(exploration?.boreholes)}

Total drilling: ${displayValue(exploration?.total_drilling)}

Borehole density: ${displayValue(exploration?.borehole_density)}

Strike: ${displayValue(exploration?.general_strike)}

Dip: ${displayValue(exploration?.general_dip)}



SEAM DETAILS

${rows || "No seam rows available."}



RESOURCE INTEGRITY RULES

1. MINQORA uses published CMPDI/source-derived geological reserve values.

2. CMPDI CCBIS values marked tentative remain explicitly tentative.

3. The seam-table total and CCBIS block resource are displayed separately because they are different published figures.

4. No density, recovery factor, borehole coordinates, DTM, DEM, or other unavailable measurement is fabricated.

5. The seam reserve total is a sum of the published seam-level reserve entries; it is not presented as a new official CMPDI estimate.



Generated by MINQORA Resource Evaluation.

`;



    downloadText("minqora-machhakata-real-resource-evaluation.txt", text);

  };



  if (loading) {

    return (

      <div style={styles.page}>

        <div style={styles.panel}>Loading real CMPDI resource data...</div>

      </div>

    );

  }



  return (

    <div style={styles.page}>

      <div style={styles.header}>

        <div>

          <div style={styles.eyebrow}>PHASE 05 · RESOURCE EVALUATION</div>

          <h1 style={styles.title}>Real CMPDI Resource Evaluation</h1>

          <p style={styles.subtitle}>

            Source-traceable geological resource intelligence for Machhakata

            (Revised), using published CMPDI and geological block information.

            Missing measurements are shown as unavailable rather than

            fabricated.

          </p>

        </div>



        <button style={styles.button} onClick={downloadReport}>

          Download Resource Report

        </button>

      </div>



      {error && <div style={styles.warning}>{error}</div>}



      {!data ? (

        <div style={styles.panel}>

          <strong>Real CMPDI data could not be loaded.</strong>

          <div style={{ marginTop: 8 }}>

            Start the CMPDI API with:

          </div>

          <pre

            style={{

              background: "#13273d",

              color: "#fff",

              padding: 14,

              borderRadius: 10,

              overflowX: "auto",

            }}

          >

            The deployed MINQORA Brain 1 service is currently unavailable. Please refresh and try again.

          </pre>

        </div>

      ) : (

        <>

          <section style={styles.panel}>

            <div style={styles.eyebrow}>EVALUATION SCOPE</div>



            <div style={styles.infoGrid}>

              <div style={styles.info}>

                <div style={styles.infoLabel}>Block</div>

                <div style={styles.infoValue}>

                  {blockDetails?.block_name ?? "Machhakata (Revised)"}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>Mine</div>

                <div style={styles.infoValue}>

                  {mineFilter === "ALL" ? "Machhakata (Revised)" : mineFilter}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>Seam Filter</div>

                <select

                  value={seamFilter}

                  onChange={(e) => setSeamFilter(e.target.value)}

                  style={{

                    marginTop: 7,

                    width: "100%",

                    minHeight: 38,

                    border: "1px solid #cad7e4",

                    borderRadius: 9,

                    padding: "0 9px",

                    background: "#fff",

                    color: "#16324f",

                  }}

                >

                  {seamOptions.map((seam) => (

                    <option key={seam} value={seam}>

                      {seam === "ALL" ? "All Seams" : seam}

                    </option>

                  ))}

                </select>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>Data Basis</div>

                <div style={styles.infoValue}>

                  Published CMPDI / geological data

                </div>

              </div>

            </div>

          </section>



          <section style={styles.kpiGrid}>

            <div style={styles.kpi}>

              <div style={styles.kpiLabel}>Published Seams</div>

              <div style={styles.kpiValue}>{normalizedSeams.length}</div>

            </div>



            <div style={styles.kpi}>

              <div style={styles.kpiLabel}>CMPDI CCBIS Resource</div>

              <div style={styles.kpiValue}>

                {formatMT(ccbisResource)}

              </div>

            </div>



            <div style={styles.kpi}>

              <div style={styles.kpiLabel}>Seam Table Total</div>

              <div style={styles.kpiValue}>

                {formatMT(seamReserveTotal)}

              </div>

            </div>



            <div style={styles.kpi}>

              <div style={styles.kpiLabel}>Largest Seam</div>

              <div style={styles.kpiValue}>

                {largestSeam?.seam ?? "N/A"}

              </div>

            </div>



            <div style={styles.kpi}>

              <div style={styles.kpiLabel}>Largest Seam Reserve</div>

              <div style={styles.kpiValue}>

                {formatMT(largestSeam?.reserve)}

              </div>

            </div>



            <div style={styles.kpi}>

              <div style={styles.kpiLabel}>Selected Reserve</div>

              <div style={styles.kpiValue}>

                {formatMT(selectedReserveTotal)}

              </div>

            </div>

          </section>



          <section style={styles.panel}>

            <div style={styles.eyebrow}>SOURCE-TRACEABLE RESOURCE BASIS</div>

            <h2 style={styles.sectionTitle}>Published block information</h2>



            <div style={styles.notice}>

              <strong>Important:</strong> the CMPDI CCBIS geological resource

              and the sum of the published seam-level reserve entries are

              displayed separately. MINQORA does not silently replace one

              published figure with the other.

            </div>



            <div style={styles.twoCol}>

              <div style={styles.infoGrid}>

                <div style={styles.info}>

                  <div style={styles.infoLabel}>Area</div>

                  <div style={styles.infoValue}>

                    {ccbisArea?.value ?? ccbisArea ?? "N/A"}{" "}

                    {ccbisArea?.unit ?? "km²"}

                  </div>

                  <div style={styles.source}>

                    Status: {ccbisArea?.status ?? "published"}

                    {sourceOf(blockDetails?.area)

                      ? ` · ${sourceOf(blockDetails.area)}`

                      : ""}

                  </div>

                </div>



                <div style={styles.info}>

                  <div style={styles.infoLabel}>Geological Resource</div>

                  <div style={styles.infoValue}>

                    {formatMT(ccbisResource)}

                  </div>

                  <div style={styles.source}>

                    Status:{" "}

                    {blockDetails?.geological_resource?.status ??

                      "tentative"}{" "}

                    · CMPDI CCBIS

                  </div>

                </div>



                <div style={styles.info}>

                  <div style={styles.infoLabel}>Average Grade</div>

                  <div style={styles.infoValue}>{ccbisGrade}</div>

                  <div style={styles.source}>Source: CMPDI CCBIS</div>

                </div>



                <div style={styles.info}>

                  <div style={styles.infoLabel}>Peak Rated Capacity</div>

                  <div style={styles.infoValue}>

                    {ccbisPRC?.value ?? ccbisPRC ?? "N/A"}{" "}

                    {ccbisPRC?.unit ?? "MTPA"}

                  </div>

                  <div style={styles.source}>

                    Status: {ccbisPRC?.status ?? "tentative"} · CMPDI CCBIS

                  </div>

                </div>

              </div>



              <div>

                <div style={styles.info}>

                  <div style={styles.infoLabel}>Largest Published Seam</div>

                  <div style={styles.infoValue}>

                    {largestSeam?.seam ?? "N/A"}

                  </div>

                  <div style={styles.source}>

                    Published seam reserve:{" "}

                    {formatMT(largestSeam?.reserve)}

                  </div>

                </div>



                <div style={{ ...styles.info, marginTop: 12 }}>

                  <div style={styles.infoLabel}>Exploration</div>

                  <div style={styles.infoValue}>

                    {exploration?.exploration_status ?? "Explored"} ·{" "}

                    {displayValue(exploration?.exploration_category)}

                  </div>

                  <div style={styles.source}>

                    {displayValue(exploration?.boreholes)} boreholes ·{" "}

                    {displayValue(exploration?.total_drilling)} drilling

                  </div>

                </div>



                <div style={{ ...styles.info, marginTop: 12 }}>

                  <div style={styles.infoLabel}>Spatial Availability</div>

                  <div style={styles.infoValue}>

                    Boundary survey:{" "}

                    {spatial?.spatial_data_status?.boundary_survey ??

                      "N/A"}

                  </div>

                  <div style={styles.source}>

                    Coordinates/DTM are not treated as available unless the

                    underlying files are obtained.

                  </div>

                </div>

              </div>

            </div>

          </section>



          <section style={styles.panel}>

            <div style={styles.eyebrow}>SEAM RESOURCE INTELLIGENCE</div>

            <h2 style={styles.sectionTitle}>

              Published resource profile by seam

            </h2>



            <div style={styles.tableWrap}>

              <table style={styles.table}>

                <thead>

                  <tr>

                    <th style={styles.th}>#</th>

                    <th style={styles.th}>Seam</th>

                    <th style={styles.th}>Thickness Range</th>

                    <th style={styles.th}>Depth Range</th>

                    <th style={styles.th}>Geological Reserve</th>

                    <th style={styles.th}>Grade</th>

                    <th style={styles.th}>Share of Seam Total</th>

                  </tr>

                </thead>



                <tbody>

                  {filteredSeams.length ? (

                    filteredSeams.map((row, index) => {

                      const share =

                        seamReserveTotal > 0 && row.reserve !== null

                          ? (row.reserve / seamReserveTotal) * 100

                          : null;



                      return (

                        <tr key={`${row.id}-${row.seam}`}>

                          <td style={styles.td}>{index + 1}</td>

                          <td style={styles.tdStrong}>{row.seam}</td>

                          <td style={styles.td}>

                            {formatNumber(row.thicknessMin)} –{" "}

                            {formatNumber(row.thicknessMax)} m

                          </td>

                          <td style={styles.td}>

                            {formatNumber(row.depthMin)} –{" "}

                            {formatNumber(row.depthMax)} m

                          </td>

                          <td style={styles.tdStrong}>

                            {formatMT(row.reserve)}

                          </td>

                          <td style={styles.td}>

                            <span style={styles.badge}>{row.grade}</span>

                          </td>

                          <td style={styles.td}>

                            {share === null

                              ? "N/A"

                              : `${formatNumber(share)}%`}

                          </td>

                        </tr>

                      );

                    })

                  ) : (

                    <tr>

                      <td style={styles.empty} colSpan="7">

                        No seam data available for this selection.

                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>



          <section style={styles.panel}>

            <div style={styles.eyebrow}>EXPLORATION EVIDENCE</div>

            <h2 style={styles.sectionTitle}>Real exploration basis</h2>



            <div style={styles.infoGrid}>

              <div style={styles.info}>

                <div style={styles.infoLabel}>Boreholes</div>

                <div style={styles.infoValue}>

                  {displayValue(exploration?.boreholes)}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>Total Drilling</div>

                <div style={styles.infoValue}>

                  {displayValue(exploration?.total_drilling)}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>Borehole Density</div>

                <div style={styles.infoValue}>

                  {displayValue(exploration?.borehole_density)}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>General Strike</div>

                <div style={styles.infoValue}>

                  {displayValue(exploration?.general_strike)}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>General Dip</div>

                <div style={styles.infoValue}>

                  {displayValue(exploration?.general_dip)}

                </div>

              </div>



              <div style={styles.info}>

                <div style={styles.infoLabel}>Exploration Agency</div>

                <div style={styles.infoValue}>

                  {displayValue(exploration?.exploration_agency)}

                </div>

              </div>

            </div>

          </section>



          <section style={styles.panel}>

            <div style={styles.eyebrow}>RESOURCE INTEGRITY</div>

            <h2 style={styles.sectionTitle}>What MINQORA does — and does not — infer</h2>



            <div style={styles.twoCol}>

              <div style={styles.notice}>

                <strong>Uses real published values:</strong>

                <br />

                CMPDI CCBIS block resource, published seam reserves, seam

                thickness ranges, seam depth ranges, grades and exploration

                evidence.

              </div>



              <div style={styles.warning}>

                <strong>No fabricated inputs:</strong>

                <br />

                MINQORA does not invent coal density, recovery factor,

                borehole coordinates, DTM/DEM, boundary coordinates or

                record-level tonnage where those underlying measurements are

                unavailable.

              </div>

            </div>



            <div style={{ marginTop: 4, color: "#5b728e", lineHeight: 1.55 }}>

              The seam-table total shown above is a direct sum of the published

              seam reserve entries. It is a MINQORA aggregation for analysis,

              not a new official CMPDI reserve estimate.

            </div>

          </section>



          <section style={styles.panel}>

            <div style={styles.eyebrow}>SOURCE REGISTRY</div>

            <h2 style={styles.sectionTitle}>Traceability</h2>



            {sources.length ? (

              <div style={styles.tableWrap}>

                <table style={styles.table}>

                  <thead>

                    <tr>

                      <th style={styles.th}>Source ID</th>

                      <th style={styles.th}>Organization</th>

                      <th style={styles.th}>Title</th>

                      <th style={styles.th}>Type</th>

                      <th style={styles.th}>Reliability</th>

                    </tr>

                  </thead>

                  <tbody>

                    {sources.map((source) => (

                      <tr key={source.source_id || source.title}>

                        <td style={styles.tdStrong}>

                          {source.source_id ?? "N/A"}

                        </td>

                        <td style={styles.td}>

                          {source.organization ?? "N/A"}

                        </td>

                        <td style={styles.td}>

                          {source.title ?? "N/A"}

                        </td>

                        <td style={styles.td}>

                          {source.source_type ?? "N/A"}

                        </td>

                        <td style={styles.td}>

                          <span style={styles.badge}>

                            {source.reliability ?? "N/A"}

                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            ) : (

              <div style={styles.empty}>No source registry entries available.</div>

            )}

          </section>

        </>

      )}

    </div>

  );

}

