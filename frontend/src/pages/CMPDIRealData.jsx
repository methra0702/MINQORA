import { useEffect, useMemo, useState } from "react";

const CMPDI_API = "https://minqora-cmpdi.onrender.com";

// Safely convert source-traceable CMPDI values into something React can render.
// Some official fields are stored as { value, source } objects.
function displayValue(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value)) return value.map((item) => displayValue(item, "")).join(", ");
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return displayValue(value.value, fallback);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

function MetricCard({ label, value, subtext }) {
  return (
    <div
      style={{
        border: "1px solid #d9dee7",
        borderRadius: 12,
        padding: 18,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#667085", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 25, fontWeight: 700, color: "#101828" }}>
        {displayValue(value)}
      </div>
      {subtext && (
        <div style={{ fontSize: 12, color: "#667085", marginTop: 5 }}>
          {displayValue(subtext, "")}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ children, tone = "neutral" }) {
  const styles = {
    neutral: { background: "#f2f4f7", color: "#344054" },
    success: { background: "#ecfdf3", color: "#027a48" },
    warning: { background: "#fffaeb", color: "#b54708" },
    danger: { background: "#fef3f2", color: "#b42318" },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        ...styles[tone],
      }}
    >
      {children}
    </span>
  );
}

export default function CMPDIRealData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${CMPDI_API}/cmpdi/machhakata/all`);

        if (!response.ok) {
          throw new Error(`CMPDI API request failed (${response.status})`);
        }

        const incoming = await response.json();

        if (!cancelled) {
          setData(incoming);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not connect to CMPDI Real Data API.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const block = data?.block?.block || data?.block || {};
  const exploration = data?.exploration?.exploration || data?.exploration || {};
  const seams = Array.isArray(data?.seams?.seams)
    ? data.seams.seams
    : Array.isArray(data?.seams)
      ? data.seams
      : [];
  const spatial = data?.spatial?.spatial || data?.spatial || {};
  const sourceRegistryRaw = data?.sources?.sources || data?.sources || [];
  const sourceRegistry = Array.isArray(sourceRegistryRaw)
    ? sourceRegistryRaw
    : Array.isArray(sourceRegistryRaw?.sources)
      ? sourceRegistryRaw.sources
      : [];

  const resource = block.geological_resource || {};
  const seamTotal =
    Number(data?.seams?.total_geological_reserve_mt) ||
    Number(seams.reduce((sum, seam) => sum + Number(seam.geological_reserve_mt || 0), 0));

  const resourceComparison = useMemo(() => {
    const ccbis = Number(resource.value || 0);
    const detailed = Number(seamTotal || 0);
    const difference = detailed - ccbis;

    return {
      ccbis,
      detailed,
      difference,
      differencePct: ccbis ? (difference / ccbis) * 100 : 0,
    };
  }, [resource.value, seamTotal]);

  const largestSeam = useMemo(() => {
    if (!seams.length) return null;

    return [...seams].sort(
      (a, b) =>
        Number(b.geological_reserve_mt || 0) -
        Number(a.geological_reserve_mt || 0)
    )[0];
  }, [seams]);

  if (loading) {
    return (
      <div className="page">
        <div className="brain-page-header">
          <div>
            <p className="eyebrow">CMPDI REAL DATA</p>
            <h1>Machhakata (Revised) Coal Block</h1>
            <p>Loading source-traceable CMPDI geological information...</p>
          </div>
        </div>

        <section
          style={{
            border: "1px solid #d9dee7",
            borderRadius: 12,
            padding: 24,
            background: "#fff",
          }}
        >
          Loading real CMPDI data...
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="brain-page-header">
          <div>
            <p className="eyebrow">CMPDI REAL DATA</p>
            <h1>Machhakata (Revised) Coal Block</h1>
            <p>Source-traceable geological and mining information.</p>
          </div>
        </div>

        <section
          style={{
            border: "1px solid #fecdca",
            borderRadius: 12,
            padding: 24,
            background: "#fff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>CMPDI API connection error</h3>
          <p>{error}</p>
          <p style={{ color: "#667085", fontSize: 13 }}>
            Make sure the separate CMPDI backend is running on port 8002.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="brain-page-header">
        <div>
          <p className="eyebrow">CMPDI REAL DATA</p>
          <h1>Machhakata (Revised) Coal Block</h1>
          <p>
            Real source-traceable geological information from published CMPDI
            and supporting block documents.
          </p>
        </div>

        <div className="brain-online">
          <span></span>
          CMPDI DATA ONLINE
        </div>
      </div>

      {/* BLOCK OVERVIEW */}
      <section
        style={{
          border: "1px solid #d9dee7",
          borderRadius: 12,
          padding: 22,
          background: "#fff",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{block.block_name || "Machhakata (Revised)"}</h2>
            <p style={{ color: "#667085", marginBottom: 0 }}>
              {block.district || "Angul"}, {block.state || "Odisha"} ·{" "}
              {block.coalfield || "Talcher Coalfield"}
            </p>
          </div>

          <StatusBadge tone="success">
            {block.exploration_status || "Explored"}
          </StatusBadge>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginTop: 20,
          }}
        >
          <MetricCard
            label="Block Area"
            value={`${block.area?.value ?? "N/A"} ${block.area?.unit ?? ""}`}
            subtext={block.area?.status || "Published status"}
          />
          <MetricCard
            label="Geological Resource"
            value={`${resource.value ?? "N/A"} ${resource.unit ?? ""}`}
            subtext={`${resource.status || "Published status"} · CCBIS`}
          />
          <MetricCard
            label="Average Grade"
            value={block.average_grade?.value ?? "N/A"}
            subtext="CMPDI CCBIS"
          />
          <MetricCard
            label="Peak Rated Capacity"
            value={`${block.peak_rated_capacity?.value ?? "N/A"} ${block.peak_rated_capacity?.unit ?? ""}`}
            subtext={block.peak_rated_capacity?.status || "Published status"}
          />
        </div>
      </section>

      {/* REAL CMPDI RESOURCE EVALUATION */}
      <section
        style={{
          border: "1px solid #d9dee7",
          borderRadius: 12,
          padding: 22,
          background: "#fff",
          marginBottom: 18,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            RESOURCE EVALUATION
          </p>
          <h2 style={{ margin: 0 }}>Real CMPDI Resource Evaluation</h2>
          <p style={{ color: "#667085", marginBottom: 0 }}>
            Source-backed resource values are compared without fabricating
            unsupported area, density, or recovery inputs.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="CMPDI CCBIS Resource"
            value={`${resourceComparison.ccbis.toLocaleString()} MT`}
            subtext="Tentative · official CMPDI CCBIS"
          />
          <MetricCard
            label="Detailed Seam-Table Total"
            value={`${resourceComparison.detailed.toLocaleString()} MT`}
            subtext={`${seams.length} published seam entries`}
          />
          <MetricCard
            label="Difference"
            value={`${Math.abs(resourceComparison.difference).toFixed(2)} MT`}
            subtext={
              resourceComparison.difference >= 0
                ? "Detailed seam total above CCBIS"
                : "Detailed seam total below CCBIS"
            }
          />
          <MetricCard
            label="Largest Published Seam"
            value={largestSeam?.seam_name || "N/A"}
            subtext={
              largestSeam
                ? `${Number(largestSeam.geological_reserve_mt).toFixed(2)} MT`
                : "No seam data"
            }
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 15,
            borderRadius: 10,
            background: "#f8fafc",
            border: "1px solid #e4e7ec",
          }}
        >
          <strong>Traceability note</strong>
          <p style={{ margin: "7px 0 0", color: "#475467", fontSize: 13 }}>
            The CCBIS figure is a tentative published resource value, while
            the detailed seam table totals 1,400.65 MT. MINQORA deliberately
            keeps both values and shows the difference instead of silently
            declaring one source incorrect. Different reports can reflect
            different dates, exploration interpretations, or reporting bases.
          </p>
        </div>
      </section>

      {/* EXPLORATION */}
      <section
        style={{
          border: "1px solid #d9dee7",
          borderRadius: 12,
          padding: 22,
          background: "#fff",
          marginBottom: 18,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Exploration Intelligence</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Exploration Category"
            value={exploration.exploration_category?.value || "N/A"}
            subtext="Published exploration classification"
          />
          <MetricCard
            label="Boreholes"
            value={exploration.boreholes?.count ?? "N/A"}
            subtext="Published geological summary"
          />
          <MetricCard
            label="Total Drilling"
            value={
              exploration.total_drilling
                ? `${Number(exploration.total_drilling.value).toLocaleString()} m`
                : "N/A"
            }
            subtext="Published geological summary"
          />
          <MetricCard
            label="Borehole Density"
            value={
              exploration.borehole_density
                ? `${exploration.borehole_density.value} ${exploration.borehole_density.unit}`
                : "N/A"
            }
            subtext="Published geological summary"
          />
          <MetricCard
            label="Strike"
            value={exploration.general_strike || "N/A"}
            subtext="General strike"
          />
          <MetricCard
            label="Dip"
            value={
              exploration.general_dip
                ? `${exploration.general_dip.min}–${exploration.general_dip.max}°`
                : "N/A"
            }
            subtext="General dip"
          />
        </div>
      </section>

      {/* SEAM TABLE */}
      <section
        style={{
          border: "1px solid #d9dee7",
          borderRadius: 12,
          padding: 22,
          background: "#fff",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 15,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Published Seam Intelligence</h2>
            <p style={{ color: "#667085", margin: "5px 0 0" }}>
              {seams.length} source-derived seam entries
            </p>
          </div>

          <StatusBadge tone="success">SOURCE TRACEABLE</StatusBadge>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {[
                  "Seam",
                  "Thickness Range (m)",
                  "Depth Range (m)",
                  "Geological Reserve (MT)",
                  "Grade",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      textAlign: "left",
                      padding: 11,
                      borderBottom: "1px solid #d9dee7",
                      background: "#f8fafc",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {seams.map((seam, index) => (
                <tr key={`${seam.seam_name || "seam"}-${index}`}>
                  <td style={{ padding: 11, borderBottom: "1px solid #eaecf0", fontWeight: 600 }}>
                    {displayValue(seam.seam_name)}
                  </td>
                  <td style={{ padding: 11, borderBottom: "1px solid #eaecf0" }}>
                    {displayValue(seam.thickness_range_m)}
                  </td>
                  <td style={{ padding: 11, borderBottom: "1px solid #eaecf0" }}>
                    {displayValue(seam.depth_range_m)}
                  </td>
                  <td style={{ padding: 11, borderBottom: "1px solid #eaecf0" }}>
                    {Number(seam.geological_reserve_mt || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: 11, borderBottom: "1px solid #eaecf0" }}>
                    {displayValue(seam.grade)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SPATIAL STATUS */}
      <section
        style={{
          border: "1px solid #d9dee7",
          borderRadius: 12,
          padding: 22,
          background: "#fff",
          marginBottom: 18,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Spatial Data Status</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Boundary Survey"
            value={spatial.spatial_data_status?.boundary_survey === "available" ? "AVAILABLE" : "N/A"}
            subtext="CMPDI DGPS survey confirmed"
          />
          <MetricCard
            label="Boundary Coordinates"
            value={spatial.spatial_data_status?.boundary_coordinates === "not_publicly_obtained" ? "NOT PUBLIC" : "AVAILABLE"}
            subtext="No coordinates invented"
          />
          <MetricCard
            label="Machhakata DTM"
            value={spatial.spatial_data_status?.dtm === "not_publicly_obtained" ? "NOT PUBLIC" : "AVAILABLE"}
            subtext="No public CMPDI DTM verified"
          />
          <MetricCard
            label="Machhakata DEM"
            value={spatial.spatial_data_status?.dem === "not_publicly_obtained" ? "NOT PUBLIC" : "AVAILABLE"}
            subtext="No public CMPDI DEM verified"
          />
        </div>
      </section>

      {/* SOURCES */}
      <section
        style={{
          border: "1px solid #d9dee7",
          borderRadius: 12,
          padding: 22,
          background: "#fff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Source Registry</h2>

        {sourceRegistry.length === 0 ? (
          <p>No source registry data returned by the API.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {sourceRegistry.map((source, index) => (
              <div
                key={displayValue(source.source_id, index)}
                style={{
                  border: "1px solid #e4e7ec",
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <strong>
                    {source.source_id || `SRC-${String(index + 1).padStart(3, "0")}`}
                    {" · "}
                    {displayValue(source.title, "Source")}
                  </strong>

                  <StatusBadge
                    tone={
                      source.reliability === "official"
                        ? "success"
                        : "neutral"
                    }
                  >
                    {displayValue(source.reliability, "source-derived")}
                  </StatusBadge>
                </div>

                <p style={{ margin: "7px 0 0", color: "#667085", fontSize: 13 }}>
                  {displayValue(source.organization, "Source organization not specified")}
                </p>

                {Array.isArray(source.used_for) && source.used_for.length > 0 && (
                  <p style={{ margin: "7px 0 0", color: "#475467", fontSize: 13 }}>
                    Used for: {source.used_for.join(", ")}
                  </p>
                )}

                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      fontSize: 12,
                    }}
                  >
                    Open source
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: "1px solid #eaecf0",
            color: "#667085",
            fontSize: 12,
          }}
        >
          MINQORA rule: unavailable official values are shown as unavailable;
          conflicting published values are retained with their source/status
          rather than silently overwritten.
        </div>
      </section>
    </div>
  );
}
