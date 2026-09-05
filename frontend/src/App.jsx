import { useEffect, useMemo, useState } from "react";
import "./App.css";

import MiningData from "./pages/MiningData";
import Predict from "./pages/Predict";
import Generate from "./pages/Generate";
import GeologicalIntelligence from "./pages/GeologicalIntelligence";
import ResourceEvaluation from "./pages/ResourceEvaluation";
import MineDesignOptimization from "./pages/MineDesignOptimization";

const API_URL = "http://127.0.0.1:8000";

// ============================================================
// BRAIN PHASES
// ============================================================

const brainPhases = [
  {
    number: "01",
    title: "Foundation",
    description:
      "Core MINQORA architecture and data connections.",
    status: "ACTIVE",
  },
  {
    number: "02",
    title: "Mining Intelligence",
    description:
      "Production analysis, mine comparison and performance intelligence.",
    status: "ACTIVE",
  },
  {
    number: "03",
    title: "ASK · PREDICT · GENERATE",
    description:
      "Questions, predictions, generation and downloadable outputs.",
    status: "ACTIVE",
  },
  {
    number: "04",
    title: "Geological Intelligence",
    description:
      "Seam analysis, thickness trends and geological risk.",
    status: "ACTIVE",
  },
  {
    number: "05",
    title: "Resource Evaluation",
    description:
      "Resource estimation and confidence analysis.",
    status: "UPCOMING",
  },
  {
    number: "06",
    title: "Mine Design & Optimization",
    description:
      "Mine planning and optimization.",
    status: "UPCOMING",
  },
  {
    number: "07",
    title: "Geomatics & Survey",
    description:
      "Coordinates, survey and spatial intelligence.",
    status: "UPCOMING",
  },
  {
    number: "08",
    title: "Visualization & 3D",
    description:
      "Real 2D and 3D visualization using actual data.",
    status: "UPCOMING",
  },
  {
    number: "09",
    title: "Final MINQORA Integration",
    description:
      "Complete MINQORA intelligence integration.",
    status: "UPCOMING",
  },
];

// ============================================================
// APP
// ============================================================

function App() {
  const [activePage, setActivePage] =
    useState("dashboard");

  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [statistics, setStatistics] = useState(null);

  const [brain1Question, setBrain1Question] =
    useState("");

  const [brain1Loading, setBrain1Loading] =
    useState(false);

  const [brain1Answer, setBrain1Answer] =
    useState("");

  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      brain: "MINQORA",
      text:
        "MINQORA Intelligence Workspace is ready. Ask questions about your mining data.",
    },
  ]);

  // ============================================================
  // LOAD ALL RECORDS
  // ============================================================

  const normalizeRecord = (record) => ({
    ...record,
    id: record.id,
    date: record.date || record.record_date || record.year || "",
    mine_name: record.mine_name || record.mine || record.mineName || "Unknown",
    seam: record.seam || record.seam_name || record.seamName || "Unknown",
    thickness: Number(
      record.thickness ??
        record.thickness_m ??
        record.seam_thickness ??
        0
    ),
    depth: Number(
      record.depth ??
        record.depth_m ??
        record.mining_depth ??
        0
    ),
    production: Number(
      record.production ??
        record.production_tonnes ??
        record.output ??
        0
    ),
    recovery: Number(
      record.recovery ??
        record.recovery_pct ??
        record.recovery_percent ??
        (record.recovery_factor != null
          ? Number(record.recovery_factor) *
            (Number(record.recovery_factor) <= 1 ? 100 : 1)
          : 0)
    ),
    ash_content: Number(
      record.ash_content ??
        record.ash ??
        record.ash_pct ??
        record.ash_percent ??
        0
    ),
    moisture: Number(
      record.moisture ??
        record.moisture_pct ??
        record.moisture_percent ??
        0
    ),
    risk_level: String(
      record.risk_level || record.risk || "LOW"
    ).toUpperCase(),
  });

  const loadAllRecords = async () => {
    try {
      const response = await fetch(
        `${API_URL}/mining-data?page=1&limit=1000`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const normalizedRecords = (data.records || []).map(
        normalizeRecord
      );

      setRecords(normalizedRecords);
      setAllRecords(normalizedRecords);
    } catch (error) {
      console.error("Mining data load error:", error);
      setRecords([]);
      setAllRecords([]);
    }
  };

  // ============================================================
  // LOAD STATISTICS
  // ============================================================

  const loadStatistics = async () => {
    try {
      const response = await fetch(
        `${API_URL}/mining-data/statistics/summary`
      );

      if (!response.ok) return;

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Statistics load error:", error);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadAllRecords();
    loadStatistics();
  }, []);

  // ============================================================
  // DOWNLOAD TEXT
  // ============================================================

  const downloadText = (filename, content) => {
    const blob = new Blob([content], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // ============================================================
  // BRAIN 1 ASK
  // ============================================================

  const askBrain1 = async () => {
    const cleanQuestion =
      brain1Question.trim();

    if (!cleanQuestion || brain1Loading) return;

    setBrain1Loading(true);
    setBrain1Answer("");

    try {
      const response = await fetch(
        `${API_URL}/brain1/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            question: cleanQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Brain 1 analysis failed."
        );
      }

      setBrain1Answer(
        data.answer ||
          "No analysis generated."
      );
    } catch (error) {
      setBrain1Answer(
        `Brain 1 Error: ${error.message}`
      );
    } finally {
      setBrain1Loading(false);
    }
  };

  // ============================================================
  // BRAIN 2 ASK
  // ============================================================

  const askMINQORA = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion || loading) return;

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        brain: "YOU",
        text: cleanQuestion,
      },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            question: cleanQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "MINQORA could not respond."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          brain:
            data.brain || "MINQORA",
          text:
            data.answer ||
            "No response generated.",
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "error",
          brain: "SYSTEM",
          text:
            `Backend connection error: ${error.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ANALYTICS
  // ============================================================

  const analytics = useMemo(() => {
    const source =
      allRecords.length > 0
        ? allRecords
        : records;

    if (!source.length) {
      return {
        totalProduction: 0,
        averageProduction: 0,
        averageRecovery: 0,
        averageDepth: 0,
        averageThickness: 0,
        averageAsh: 0,
        bestMine: "No data",
        mineComparison: [],
        riskAnalysis: [],
      };
    }

    const numberValue = (value) =>
      Number(value || 0);

    const totalProduction =
      source.reduce(
        (sum, record) =>
          sum +
          numberValue(record.production),
        0
      );

    const averageProduction =
      totalProduction / source.length;

    const averageRecovery =
      source.reduce(
        (sum, record) =>
          sum +
          numberValue(record.recovery),
        0
      ) / source.length;

    const averageDepth =
      source.reduce(
        (sum, record) =>
          sum +
          numberValue(record.depth),
        0
      ) / source.length;

    const averageThickness =
      source.reduce(
        (sum, record) =>
          sum +
          numberValue(record.thickness),
        0
      ) / source.length;

    const averageAsh =
      source.reduce(
        (sum, record) =>
          sum +
          numberValue(
            record.ash_content
          ),
        0
      ) / source.length;

    const mines = {};

    source.forEach((record) => {
      const mine =
        record.mine_name || "Unknown";

      if (!mines[mine]) {
        mines[mine] = {
          name: mine,
          records: 0,
          production: 0,
          recovery: 0,
          depth: 0,
          thickness: 0,
        };
      }

      mines[mine].records += 1;

      mines[mine].production +=
        numberValue(record.production);

      mines[mine].recovery +=
        numberValue(record.recovery);

      mines[mine].depth +=
        numberValue(record.depth);

      mines[mine].thickness +=
        numberValue(record.thickness);
    });

    const mineComparison =
      Object.values(mines)
        .map((mine) => ({
          ...mine,

          averageProduction:
            mine.production /
            mine.records,

          averageRecovery:
            mine.recovery /
            mine.records,

          averageDepth:
            mine.depth /
            mine.records,

          averageThickness:
            mine.thickness /
            mine.records,
        }))
        .sort(
          (a, b) =>
            b.averageProduction -
            a.averageProduction
        );

    const risks = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
    };

    source.forEach((record) => {
      const risk = String(
        record.risk_level || "LOW"
      ).toUpperCase();

      if (risks[risk] !== undefined) {
        risks[risk] += 1;
      }
    });

    const riskAnalysis =
      Object.entries(risks).map(
        ([level, count]) => ({
          level,
          count,
          percentage:
            (count / source.length) * 100,
        })
      );

    return {
      totalProduction,
      averageProduction,
      averageRecovery,
      averageDepth,
      averageThickness,
      averageAsh,

      bestMine:
        mineComparison[0]?.name ||
        "No data",

      mineComparison,
      riskAnalysis,
    };
  }, [allRecords, records]);

  // ============================================================
  // NAVIGATION BUTTON
  // ============================================================

  const NavButton = ({ id, children }) => (
    <button
      className={`nav-button ${
        activePage === id
          ? "active"
          : ""
      }`}
      onClick={() => setActivePage(id)}
    >
      {children}
    </button>
  );

  // ============================================================
  // DASHBOARD PAGE
  // ============================================================

  const Dashboard = () => (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            MINQORA PLATFORM
          </p>

          <h1>
            Intelligence Dashboard
          </h1>

          <p className="page-description">
            Central command center for mining
            intelligence, analysis and decision
            support.
          </p>
        </div>

        <div className="system-online">
          <span></span>
          SYSTEM ONLINE
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>
            MINING RECORDS
          </span>

          <h2>
            {allRecords.length}
          </h2>

          <p>
            Stored mining information
          </p>
        </div>

        <div className="stat-card">
          <span>
            MINES
          </span>

          <h2>
            {new Set(allRecords.map((record) => record.mine_name)).size}
          </h2>

          <p>
            Mining locations analyzed
          </p>
        </div>

        <div className="stat-card">
          <span>
            BRAIN 1
          </span>

          <h2>
            ONLINE
          </h2>

          <p>
            Mining intelligence engine
          </p>
        </div>

        <div className="stat-card">
          <span>
            PRODUCTION
          </span>

          <h2>
            {analytics.totalProduction.toLocaleString(
              undefined,
              {
                maximumFractionDigits: 0,
              }
            )}
          </h2>

          <p>
            Total analyzed production
          </p>
        </div>
      </div>

      <section className="dashboard-section">
        <p className="eyebrow">
          MINING INTELLIGENCE
        </p>

        <h2>
          Current Data Insights
        </h2>

        <div className="data-summary-grid">
          <div className="summary-card">
            <span>
              Best Performing Mine
            </span>

            <strong>
              {analytics.bestMine}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Recovery
            </span>

            <strong>
              {analytics.averageRecovery.toFixed(
                2
              )}
              %
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Thickness
            </span>

            <strong>
              {analytics.averageThickness.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Depth
            </span>

            <strong>
              {analytics.averageDepth.toFixed(2)}
            </strong>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <p className="eyebrow">
          DEVELOPMENT ROADMAP
        </p>

        <h2>
          Brain 1 — 9 Intelligence Phases
        </h2>

        <div className="dashboard-phases">
          {brainPhases.map((phase) => (
            <div
              key={phase.number}
              className={`dashboard-phase ${
                phase.status === "ACTIVE"
                  ? "current"
                  : ""
              }`}
            >
              <span>
                {phase.number}
              </span>

              <div>
                <strong>
                  {phase.title}
                </strong>

                <small>
                  {phase.status}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // ============================================================
  // BRAIN 1 PAGE
  // ============================================================

  const Brain1Page = () => (
    <div className="page brain1-page">
      <div className="brain-page-header">
        <div>
          <p className="eyebrow">
            MINQORA BRAIN 1
          </p>

          <h1>
            Mining Intelligence Dashboard
          </h1>

          <p>
            Brain 1 analyzes actual mining
            records and generates mining
            intelligence.
          </p>
        </div>

        <div className="brain-online">
          <span></span>
          BRAIN 1 ONLINE
        </div>
      </div>

      <section className="brain1-section">
        <p className="eyebrow">
          MINING INTELLIGENCE OVERVIEW
        </p>

        <h2>
          Live Intelligence Metrics
        </h2>

        <div className="data-summary-grid">
          <div className="summary-card">
            <span>
              Total Production
            </span>

            <strong>
              {analytics.totalProduction.toLocaleString(
                undefined,
                {
                  maximumFractionDigits: 0,
                }
              )}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Production
            </span>

            <strong>
              {analytics.averageProduction.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Recovery
            </span>

            <strong>
              {analytics.averageRecovery.toFixed(
                2
              )}
              %
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Ash Content
            </span>

            <strong>
              {analytics.averageAsh.toFixed(2)}
              %
            </strong>
          </div>
        </div>
      </section>

      <section className="brain1-section">
        <p className="eyebrow">
          PHASE 2 — MINING INTELLIGENCE
        </p>

        <h2>
          Mine Performance Comparison
        </h2>

        <div className="data-table-container">
          <table className="mining-table">
            <thead>
              <tr>
                <th>Mine</th>
                <th>Records</th>
                <th>Avg Production</th>
                <th>Avg Recovery</th>
                <th>Avg Depth</th>
                <th>Avg Thickness</th>
              </tr>
            </thead>

            <tbody>
              {analytics.mineComparison.length >
              0 ? (
                analytics.mineComparison.map(
                  (mine) => (
                    <tr key={mine.name}>
                      <td>
                        {mine.name}
                      </td>

                      <td>
                        {mine.records}
                      </td>

                      <td>
                        {mine.averageProduction.toFixed(
                          2
                        )}
                      </td>

                      <td>
                        {mine.averageRecovery.toFixed(
                          2
                        )}
                        %
                      </td>

                      <td>
                        {mine.averageDepth.toFixed(
                          2
                        )}
                      </td>

                      <td>
                        {mine.averageThickness.toFixed(
                          2
                        )}
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td colSpan="6">
                    No mining data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="brain1-section">
        <p className="eyebrow">
          RISK INTELLIGENCE
        </p>

        <h2>
          Mining Risk Analysis
        </h2>

        <div className="brain-phases-grid">
          {analytics.riskAnalysis.map(
            (risk) => (
              <div
                className="brain-phase-card"
                key={risk.level}
              >
                <div className="phase-card-top">
                  <span>
                    {risk.level}
                  </span>
                </div>

                <h3>
                  {risk.count} Records
                </h3>

                <p>
                  {risk.percentage.toFixed(2)}%
                  of the analyzed mining records
                  are classified as {risk.level}
                  risk.
                </p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="brain1-question-panel">
        <p className="eyebrow">
          ASK BRAIN 1
        </p>

        <h2>
          Mining Intelligence Questions
        </h2>

        <p>
          Ask Brain 1 questions about your actual
          mining data.
        </p>

        <div className="brain1-input-row">
          <textarea
            value={brain1Question}
            onChange={(event) =>
              setBrain1Question(
                event.target.value
              )
            }
            placeholder="Example: Which mine has the highest production?"
          />

          <button
            className="primary-button"
            onClick={askBrain1}
            disabled={brain1Loading}
          >
            {brain1Loading
              ? "Analyzing..."
              : "Analyze"}
          </button>
        </div>

        {brain1Answer && (
          <div className="brain1-answer">
            <div className="answer-header">
              <strong>
                BRAIN 1 ANALYSIS
              </strong>

              <button
                onClick={() =>
                  downloadText(
                    "minqora-brain1-analysis.txt",
                    brain1Answer
                  )
                }
              >
                Download Analysis
              </button>
            </div>

            <pre>
              {brain1Answer}
            </pre>
          </div>
        )}
      </section>

      <section className="brain1-section">
        <p className="eyebrow">
          BRAIN 1 ROADMAP
        </p>

        <h2>
          Complete 9-Phase Intelligence System
        </h2>

        <div className="brain-phases-grid">
          {brainPhases.map((phase) => (
            <div
              key={phase.number}
              className={`brain-phase-card ${
                phase.status === "ACTIVE"
                  ? "active-phase"
                  : ""
              }`}
            >
              <div className="phase-card-top">
                <span>
                  {phase.number}
                </span>

                <small>
                  {phase.status}
                </small>
              </div>

              <h3>
                {phase.title}
              </h3>

              <p>
                {phase.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  // ============================================================
  // BRAIN 2 PAGE
  // ============================================================

  const Brain2Page = () => (
    <div className="page">
      <div className="brain-page-header">
        <div>
          <p className="eyebrow">
            MINQORA BRAIN 2
          </p>

          <h1>
            AI Intelligence Workspace
          </h1>

          <p>
            Conversational access to MINQORA
            mining intelligence.
          </p>
        </div>

        <div className="brain-online">
          <span></span>
          BRAIN 2 ONLINE
        </div>
      </div>

      <section className="chat-workspace">
        <div className="chat-messages">
          {messages.map(
            (message, index) => (
              <div
                key={index}
                className={`chat-message ${message.role}`}
              >
                <strong>
                  {message.brain}
                </strong>

                <p>
                  {message.text}
                </p>
              </div>
            )
          )}

          {loading && (
            <div className="chat-message assistant">
              <strong>
                MINQORA
              </strong>

              <p>
                Analyzing mining intelligence...
              </p>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            placeholder="Ask MINQORA anything about your mining data..."
          />

          <button
            className="primary-button"
            onClick={askMINQORA}
            disabled={loading}
          >
            Send
          </button>
        </div>

        <button
          className="secondary-button"
          onClick={() =>
            downloadText(
              "minqora-chat.txt",
              messages
                .map(
                  (message) =>
                    `${message.brain}: ${message.text}`
                )
                .join("\n\n")
            )
          }
        >
          Download Chat
        </button>
      </section>
    </div>
  );

  // ============================================================
  // PAGE RENDERER
  // ============================================================

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;

      case "data":
        return <MiningData />;

      case "brain1":
        return <Brain1Page />;

      case "brain2":
        return <Brain2Page />;

      case "predict":
        return <Predict />;

      case "generate":
        return <Generate />;

      case "geological":
        return <GeologicalIntelligence />;

      case "resource":
        return <ResourceEvaluation />;

      case "mine-design":
        return <MineDesignOptimization />;

      default:
        return <Dashboard />;
    }
  };

  // ============================================================
  // MAIN APP
  // ============================================================

  return (
    <div className="app">
      {/* ====================================================== */}
      {/* SIDEBAR */}
      {/* ====================================================== */}

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-box">
            M
          </div>

          <div>
            <h2>
              MINQORA
            </h2>

            <p>
              INTELLIGENCE PLATFORM
            </p>
          </div>
        </div>

        <div className="sidebar-status">
          <span></span>
          SYSTEM ONLINE
        </div>

        {/* OVERVIEW */}

        <div className="nav-section">
          <p className="nav-title">
            OVERVIEW
          </p>

          <NavButton id="dashboard">
            Dashboard
          </NavButton>
        </div>

        {/* DATA */}

        <div className="nav-section">
          <p className="nav-title">
            DATA
          </p>

          <NavButton id="data">
            Mining Data
          </NavButton>
        </div>

        {/* INTELLIGENCE */}

        <div className="nav-section">
          <p className="nav-title">
            INTELLIGENCE
          </p>

          <NavButton id="brain1">
            Brain 1
          </NavButton>

          <NavButton id="brain2">
            Brain 2 AI
          </NavButton>
        </div>

        <div className="nav-section">
          <p className="nav-title">
            GEOLOGICAL
          </p>

          <NavButton id="geological">
            Geological Intelligence
          </NavButton>

          <NavButton id="resource">
            Resource Evaluation
          </NavButton>

          <NavButton id="mine-design">
            Mine Design & Optimization
          </NavButton>
        </div>

        {/* ASK PREDICT GENERATE */}

        <div className="nav-section">
          <p className="nav-title">
            AI TOOLS
          </p>

          <NavButton id="predict">
            Predict
          </NavButton>

          <NavButton id="generate">
            Generate
          </NavButton>
        </div>

        <div className="sidebar-footer">
          <strong>
            MINQORA v1.0
          </strong>

          <span>
            Mining Intelligence System
          </span>
        </div>
      </aside>

      {/* ====================================================== */}
      {/* MAIN */}
      {/* ====================================================== */}

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            MINQORA /{" "}
            {activePage.toUpperCase()}
          </div>

          <div className="topbar-right">
            <div className="brain-indicator">
              <span></span>
              Brain 1
            </div>

            <div className="brain-indicator">
              <span></span>
              Brain 2
            </div>
          </div>
        </header>

        <div className="content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;