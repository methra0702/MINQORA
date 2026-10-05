import { useEffect, useMemo, useState } from "react";

const API_URL = "https://minqora-brain1.onrender.com";

const moduleDefinitions = [
  {
    id: "data",
    phase: "01–02",
    name: "Mining Intelligence",
    description: "Mining records, production and performance intelligence.",
  },
  {
    id: "brain1",
    phase: "03",
    name: "Ask",
    description: "Evidence-oriented questions over MINQORA data.",
  },
  {
    id: "predict",
    phase: "03",
    name: "Predict",
    description: "Prediction and scenario analysis tools.",
  },
  {
    id: "generate",
    phase: "03",
    name: "Generate",
    description: "Report and output generation.",
  },
  {
    id: "geological",
    phase: "04",
    name: "Geological Intelligence",
    description: "Seam, thickness and geological analysis.",
  },
  {
    id: "resource",
    phase: "05",
    name: "Resource Evaluation",
    description: "Resource estimation workspace.",
  },
  {
    id: "mine-design",
    phase: "06",
    name: "Mine Design & Optimization",
    description: "Parameter-driven pit and production design.",
  },
  {
    id: "geomatics",
    phase: "07",
    name: "Geomatics & Survey",
    description: "Survey, coordinates and spatial analysis.",
  },
  {
    id: "visualization",
    phase: "08",
    name: "Visualization & 2D/3D",
    description: "Real DTM, 2D plan, cross-section and 3D model.",
  },
];

function StatusPill({ ok }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px",
        border: "1px solid #c7cdd4",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: "#fff",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: ok ? "#111" : "#999",
          display: "inline-block",
        }}
      />
      {ok ? "CONNECTED" : "CHECKING"}
    </span>
  );
}

export default function FinalIntegration({ onNavigate }) {
  const [health, setHealth] = useState(null);
  const [dataCount, setDataCount] = useState(null);
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadIntegrationStatus() {
      try {
        const [healthResponse, dataResponse] = await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/mining-data`),
        ]);

        if (!healthResponse.ok || !dataResponse.ok) {
          throw new Error("Backend connection check failed.");
        }

        const healthJson = await healthResponse.json();
        const dataJson = await dataResponse.json();

        if (!cancelled) {
          setHealth(healthJson);
          setDataCount(Number(dataJson.count ?? dataJson.records?.length ?? 0));
          setHealthError("");
        }
      } catch (error) {
        if (!cancelled) {
          setHealthError(error.message || "Backend unavailable.");
        }
      }
    }

    loadIntegrationStatus();
    const timer = setInterval(loadIntegrationStatus, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const connected = Boolean(health && !healthError);

  const phaseSummary = useMemo(
    () => [
      ["01", "Foundation", true],
      ["02", "Mining Intelligence", true],
      ["03", "Ask · Predict · Generate", true],
      ["04", "Geological Intelligence", true],
      ["05", "Resource Evaluation", true],
      ["06", "Mine Design & Optimization", true],
      ["07", "Geomatics & Survey", true],
      ["08", "Visualization & 2D/3D", true],
      ["09", "Final MINQORA Integration", true],
    ],
    []
  );

  const cardStyle = {
    border: "1px solid #cfd5dc",
    borderRadius: 12,
    background: "#fff",
    padding: 20,
  };

  return (
    <div style={{ padding: 28, maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>
          PHASE 09
        </div>
        <h1 style={{ margin: "6px 0 8px", fontSize: 32 }}>
          Final MINQORA Integration
        </h1>
        <p style={{ margin: 0, color: "#59636f", fontSize: 16 }}>
          One intelligence workspace connecting mining data, AI analysis,
          geological intelligence, mine design, geomatics and real 2D/3D
          visualization.
        </p>
      </div>

      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 21 }}>System Integration Status</h2>
            <p style={{ margin: "7px 0 0", color: "#59636f" }}>
              Live connection check against the MINQORA FastAPI backend.
            </p>
          </div>
          <StatusPill ok={connected} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: 12,
            marginTop: 18,
          }}
        >
          <div style={cardStyle}>
            <div style={{ color: "#59636f", fontSize: 12, fontWeight: 700 }}>
              BACKEND
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>
              {connected ? "ONLINE" : "OFFLINE"}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#59636f", fontSize: 12, fontWeight: 700 }}>
              RECORDS
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>
              {dataCount == null ? "—" : dataCount.toLocaleString()}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#59636f", fontSize: 12, fontWeight: 700 }}>
              API PHASE
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>
              {health?.phase || "—"}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ color: "#59636f", fontSize: 12, fontWeight: 700 }}>
              INTEGRATION
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 5 }}>
              09 / 09
            </div>
          </div>
        </div>

        {healthError && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid #999",
              borderRadius: 8,
              background: "#fafafa",
            }}
          >
            {healthError}
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>MINQORA Intelligence Pipeline</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
            gap: 12,
          }}
        >
          {phaseSummary.map(([number, name, done]) => (
            <div
              key={number}
              style={{
                border: "1px solid #d3d8de",
                borderRadius: 10,
                padding: 15,
                background: "#fff",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "#59636f" }}>
                PHASE {number}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>
                {name}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700 }}>
                {done ? "✓ INTEGRATED" : "PENDING"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Integrated Module Access</h2>
        <p style={{ color: "#59636f", marginTop: 0 }}>
          Open any completed module from the final integration workspace.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 12,
          }}
        >
          {moduleDefinitions.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={() => onNavigate?.(module.id)}
              style={{
                textAlign: "left",
                border: "1px solid #cfd5dc",
                borderRadius: 10,
                padding: 16,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#59636f" }}>
                PHASE {module.phase}
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>
                {module.name}
              </div>
              <div style={{ fontSize: 13, color: "#59636f", marginTop: 7 }}>
                {module.description}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 800 }}>
                OPEN MODULE →
              </div>
            </button>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Traceability & Engineering Boundary</h2>
        <ul style={{ marginBottom: 0, lineHeight: 1.8 }}>
          <li>
            Mining records remain the source for mining intelligence and AI
            analysis.
          </li>
          <li>
            The Phase 08 terrain model uses the loaded real DTM raster as its
            terrain source.
          </li>
          <li>
            2D and 3D mine-design geometry are parameter-driven calculations,
            not manually drawn images.
          </li>
          <li>
            Geological seam geometry is only treated as a reference unless
            actual seam-surface data is supplied.
          </li>
          <li>
            Final mine-design decisions remain subject to engineering,
            geological, geotechnical and statutory validation.
          </li>
        </ul>
      </section>
    </div>
  );
}
