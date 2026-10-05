import { useEffect, useMemo, useState } from "react";

const API_URL = "https://minqora-brain1.onrender.com";

function Brain1() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [records, setRecords] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ============================================================
  // LOAD ALL MINING RECORDS
  // ============================================================

  useEffect(() => {
    loadAllMiningRecords();
  }, []);

  const loadAllMiningRecords = async () => {
    setDataLoading(true);

    try {
      let all = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetch(
          `${API_URL}/mining-data?page=${page}&limit=100`
        );

        if (!response.ok) {
          throw new Error("Could not load mining intelligence data.");
        }

        const data = await response.json();

        all = [...all, ...(data.records || [])];

        totalPages = data.pagination?.total_pages || 1;

        page += 1;
      } while (page <= totalPages && page <= 20);

      setRecords(all);
    } catch (err) {
      console.error("Brain 1 data loading error:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // ============================================================
  // NORMALIZE VALUES
  // ============================================================

  const numberValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    const n = Number(
      String(value).replace(/,/g, "").replace("%", "")
    );

    return Number.isFinite(n) ? n : 0;
  };

  const getMine = (record) =>
    record.mine_name ||
    record.mine ||
    record.block_name ||
    record.block ||
    "Unknown";

  const getSeam = (record) =>
    record.seam_name ||
    record.seam ||
    "Unknown";

  const getProduction = (record) =>
    numberValue(
      record.production_tonnes ??
        record.production ??
        record.output
    );

  const getRecovery = (record) =>
    numberValue(
      record.recovery_percent ??
        record.recovery
    );

  const getAsh = (record) =>
    numberValue(
      record.ash_percent ??
        record.ash_content ??
        record.ash
    );

  const getDepth = (record) =>
    numberValue(
      record.depth_m ??
        record.depth
    );

  const getThickness = (record) =>
    numberValue(
      record.thickness_m ??
        record.coal_thickness_m ??
        record.thickness
    );

  const getReserve = (record) =>
    numberValue(
      record.geological_reserve_mt ??
        record.reserve_mt ??
        record.reserve
    );

  const getRisk = (record) =>
    String(
      record.risk_level || "UNKNOWN"
    ).toUpperCase();

  // ============================================================
  // BRAIN 1 ANALYTICS ENGINE
  // ============================================================

  const analytics = useMemo(() => {
    if (!records.length) {
      return {
        total: 0,
        production: 0,
        averageProduction: 0,
        averageRecovery: 0,
        averageAsh: 0,
        averageDepth: 0,
        averageThickness: 0,
        totalReserve: 0,
        deepest: null,
        thickest: null,
        highestProduction: null,
        highestReserve: null,
        lowRisk: 0,
        mediumRisk: 0,
        highRisk: 0,
        riskPercentages: {
          low: 0,
          medium: 0,
          high: 0,
        },
        seamPerformance: [],
      };
    }

    const total = records.length;

    const production = records.reduce(
      (sum, r) => sum + getProduction(r),
      0
    );

    const recoveryTotal = records.reduce(
      (sum, r) => sum + getRecovery(r),
      0
    );

    const ashTotal = records.reduce(
      (sum, r) => sum + getAsh(r),
      0
    );

    const depthTotal = records.reduce(
      (sum, r) => sum + getDepth(r),
      0
    );

    const thicknessTotal = records.reduce(
      (sum, r) => sum + getThickness(r),
      0
    );

    const reserveTotal = records.reduce(
      (sum, r) => sum + getReserve(r),
      0
    );

    const deepest = [...records].sort(
      (a, b) => getDepth(b) - getDepth(a)
    )[0];

    const thickest = [...records].sort(
      (a, b) => getThickness(b) - getThickness(a)
    )[0];

    const highestProduction = [...records].sort(
      (a, b) =>
        getProduction(b) - getProduction(a)
    )[0];

    const highestReserve = [...records].sort(
      (a, b) =>
        getReserve(b) - getReserve(a)
    )[0];

    let lowRisk = 0;
    let mediumRisk = 0;
    let highRisk = 0;

    records.forEach((record) => {
      const risk = getRisk(record);

      if (risk === "LOW") {
        lowRisk += 1;
      } else if (risk === "MEDIUM") {
        mediumRisk += 1;
      } else if (risk === "HIGH") {
        highRisk += 1;
      }
    });

    const seamMap = {};

    records.forEach((record) => {
      const seam = getSeam(record);

      if (!seamMap[seam]) {
        seamMap[seam] = {
          seam,
          records: 0,
          production: 0,
          recovery: 0,
          depth: 0,
          thickness: 0,
          reserve: 0,
        };
      }

      seamMap[seam].records += 1;
      seamMap[seam].production +=
        getProduction(record);
      seamMap[seam].recovery +=
        getRecovery(record);
      seamMap[seam].depth +=
        getDepth(record);
      seamMap[seam].thickness +=
        getThickness(record);
      seamMap[seam].reserve +=
        getReserve(record);
    });

    const seamPerformance = Object.values(seamMap)
      .map((item) => ({
        ...item,
        averageProduction:
          item.production / item.records,

        averageRecovery:
          item.recovery / item.records,

        averageDepth:
          item.depth / item.records,

        averageThickness:
          item.thickness / item.records,

        averageReserve:
          item.reserve / item.records,
      }))
      .sort(
        (a, b) =>
          b.averageProduction -
          a.averageProduction
      );

    return {
      total,
      production,
      averageProduction:
        production / total,

      averageRecovery:
        recoveryTotal / total,

      averageAsh:
        ashTotal / total,

      averageDepth:
        depthTotal / total,

      averageThickness:
        thicknessTotal / total,

      totalReserve: reserveTotal,

      deepest,
      thickest,
      highestProduction,
      highestReserve,

      lowRisk,
      mediumRisk,
      highRisk,

      riskPercentages: {
        low: (lowRisk / total) * 100,
        medium: (mediumRisk / total) * 100,
        high: (highRisk / total) * 100,
      },

      seamPerformance,
    };
  }, [records]);

  // ============================================================
  // DECISION SUPPORT
  // ============================================================

  const decisionSignals = useMemo(() => {
    if (!analytics.total) {
      return [];
    }

    const signals = [];

    if (
      analytics.highRisk >
      analytics.total * 0.35
    ) {
      signals.push({
        type: "HIGH PRIORITY",
        title: "Elevated Risk Concentration",
        text: `${analytics.highRisk} records are classified as HIGH risk. Prioritize these zones for additional operational review.`,
      });
    } else {
      signals.push({
        type: "MONITOR",
        title: "Risk Profile Within Dataset Range",
        text: "The current risk distribution does not show a dominant high-risk concentration.",
      });
    }

    if (
      analytics.deepest &&
      getDepth(analytics.deepest) >
        analytics.averageDepth * 1.4
    ) {
      signals.push({
        type: "GEOLOGICAL",
        title: "Deep Working Zone Detected",
        text: `${getSeam(analytics.deepest)} reaches approximately ${getDepth(analytics.deepest).toFixed(2)} m in the analyzed records.`,
      });
    }

    if (
      analytics.thickest &&
      getThickness(analytics.thickest) >
        analytics.averageThickness * 1.5
    ) {
      signals.push({
        type: "RESOURCE",
        title: "High-Thickness Seam Detected",
        text: `${getSeam(analytics.thickest)} shows the highest observed thickness in the current dataset.`,
      });
    }

    if (
      analytics.averageRecovery < 80
    ) {
      signals.push({
        type: "OPERATIONAL",
        title: "Recovery Requires Attention",
        text: `Average recovery is ${analytics.averageRecovery.toFixed(2)}%. Review operational factors affecting recovery.`,
      });
    } else {
      signals.push({
        type: "OPERATIONAL",
        title: "Recovery Performance",
        text: `Average recovery is ${analytics.averageRecovery.toFixed(2)}% across ${analytics.total} analyzed records.`,
      });
    }

    return signals;
  }, [analytics]);

  // ============================================================
  // ASK BRAIN 1
  // ============================================================

  const handleAnalyze = async () => {
    if (!question.trim()) {
      setError(
        "Please enter a mining intelligence question."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${API_URL}/brain1/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: question.trim(),
          }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(
          () => ({})
        );

        throw new Error(
          body.detail ||
            "Failed to analyze the question."
        );
      }

      const data = await response.json();

      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion("");
    setResult(null);
    setError("");
  };

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatNumber = (value, decimals = 2) => {
    if (!Number.isFinite(Number(value))) {
      return "0";
    }

    return Number(value).toLocaleString(
      undefined,
      {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }
    );
  };

  const formatInteger = (value) =>
    Number(value || 0).toLocaleString(
      undefined,
      {
        maximumFractionDigits: 0,
      }
    );

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="brain-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="brain-page-header">
        <div>
          <div className="section-label">
            MINQORA BRAIN 1
          </div>

          <h1>
            Mining Intelligence Dashboard
          </h1>

          <p>
            Brain 1 analyzes mining records,
            detects patterns and generates
            decision-support intelligence.
          </p>
        </div>

        <div className="brain-online">
          <span></span>
          BRAIN 1 ONLINE
        </div>
      </section>

      {/* ======================================================
          LIVE DATA STATUS
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          LIVE INTELLIGENCE DATA
        </div>

        <h2>
          {dataLoading
            ? "Loading Intelligence Engine..."
            : `${formatInteger(
                analytics.total
              )} Records Analyzed`}
        </h2>

        <p>
          MINQORA Brain 1 is processing the
          connected mining dataset in real time.
        </p>

        <div
          className="data-summary-grid"
          style={{
            marginTop: "24px",
          }}
        >

          <div className="summary-card">
            <span>
              Total Production
            </span>

            <strong>
              {formatInteger(
                analytics.production
              )}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Production
            </span>

            <strong>
              {formatNumber(
                analytics.averageProduction
              )}
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Recovery
            </span>

            <strong>
              {formatNumber(
                analytics.averageRecovery
              )}
              %
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Ash
            </span>

            <strong>
              {formatNumber(
                analytics.averageAsh
              )}
              %
            </strong>
          </div>

        </div>
      </section>

      {/* ======================================================
          GEOLOGICAL / OPERATIONAL METRICS
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          ADVANCED ANALYTICS
        </div>

        <h2>
          Geological & Operational Intelligence
        </h2>

        <div
          className="data-summary-grid"
          style={{
            marginTop: "24px",
          }}
        >

          <div className="summary-card">
            <span>
              Average Depth
            </span>

            <strong>
              {formatNumber(
                analytics.averageDepth
              )}
              m
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Average Thickness
            </span>

            <strong>
              {formatNumber(
                analytics.averageThickness
              )}
              m
            </strong>
          </div>

          <div className="summary-card">
            <span>
              Total Geological Reserve
            </span>

            <strong>
              {formatNumber(
                analytics.totalReserve
              )}
              MT
            </strong>
          </div>

          <div className="summary-card">
            <span>
              High-Risk Records
            </span>

            <strong>
              {formatInteger(
                analytics.highRisk
              )}
            </strong>
          </div>

        </div>
      </section>

      {/* ======================================================
          EXTREME VALUE DETECTION
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          PATTERN DETECTION
        </div>

        <h2>
          Significant Mining Observations
        </h2>

        <div
          className="data-summary-grid"
          style={{
            marginTop: "24px",
          }}
        >

          <div className="summary-card">
            <span>
              Deepest Observed Seam
            </span>

            <strong>
              {analytics.deepest
                ? getSeam(
                    analytics.deepest
                  )
                : "—"}
            </strong>

            <p>
              {analytics.deepest
                ? `${formatNumber(
                    getDepth(
                      analytics.deepest
                    )
                  )} m`
                : "No data"}
            </p>
          </div>

          <div className="summary-card">
            <span>
              Thickest Observed Seam
            </span>

            <strong>
              {analytics.thickest
                ? getSeam(
                    analytics.thickest
                  )
                : "—"}
            </strong>

            <p>
              {analytics.thickest
                ? `${formatNumber(
                    getThickness(
                      analytics.thickest
                    )
                  )} m`
                : "No data"}
            </p>
          </div>

          <div className="summary-card">
            <span>
              Highest Production
            </span>

            <strong>
              {analytics.highestProduction
                ? getSeam(
                    analytics.highestProduction
                  )
                : "—"}
            </strong>

            <p>
              {analytics.highestProduction
                ? formatInteger(
                    getProduction(
                      analytics.highestProduction
                    )
                  )
                : "No data"}
            </p>
          </div>

          <div className="summary-card">
            <span>
              Highest Reserve Record
            </span>

            <strong>
              {analytics.highestReserve
                ? getSeam(
                    analytics.highestReserve
                  )
                : "—"}
            </strong>

            <p>
              {analytics.highestReserve
                ? `${formatNumber(
                    getReserve(
                      analytics.highestReserve
                    )
                  )} MT`
                : "No data"}
            </p>
          </div>

        </div>
      </section>

      {/* ======================================================
          RISK INTELLIGENCE
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          RISK INTELLIGENCE
        </div>

        <h2>
          Mining Risk Analysis
        </h2>

        <div
          className="data-summary-grid"
          style={{
            marginTop: "24px",
          }}
        >

          <div className="summary-card">
            <span>LOW</span>

            <strong>
              {formatInteger(
                analytics.lowRisk
              )}
            </strong>

            <p>
              {formatNumber(
                analytics.riskPercentages.low
              )}
              % of records
            </p>
          </div>

          <div className="summary-card">
            <span>MEDIUM</span>

            <strong>
              {formatInteger(
                analytics.mediumRisk
              )}
            </strong>

            <p>
              {formatNumber(
                analytics.riskPercentages.medium
              )}
              % of records
            </p>
          </div>

          <div className="summary-card">
            <span>HIGH</span>

            <strong>
              {formatInteger(
                analytics.highRisk
              )}
            </strong>

            <p>
              {formatNumber(
                analytics.riskPercentages.high
              )}
              % of records
            </p>
          </div>

        </div>

        <div
          style={{
            marginTop: "25px",
            padding: "20px",
            borderRadius: "12px",
            background: "#f5f8fb",
            border: "1px solid #dce5ec",
          }}
        >
          <strong>
            Risk Intelligence Signal
          </strong>

          <p style={{ marginBottom: 0 }}>
            {analytics.highRisk >
            analytics.total * 0.35
              ? `High-risk observations represent ${formatNumber(
                  analytics.riskPercentages.high
                )}% of the analyzed dataset and should receive additional review.`
              : `The current dataset does not show a dominant high-risk concentration.`}
          </p>
        </div>
      </section>

      {/* ======================================================
          DECISION SUPPORT
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          DECISION SUPPORT ENGINE
        </div>

        <h2>
          MINQORA Intelligence Signals
        </h2>

        <p>
          Automatically generated analytical
          signals based on the connected mining
          dataset.
        </p>

        <div
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "24px",
          }}
        >

          {decisionSignals.map(
            (signal, index) => (
              <div
                key={index}
                style={{
                  padding: "20px",
                  borderRadius: "12px",
                  border:
                    "1px solid #dce5ec",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing:
                      "1.5px",
                    color: "#299bb0",
                    marginBottom:
                      "7px",
                  }}
                >
                  {signal.type}
                </div>

                <h3
                  style={{
                    margin:
                      "0 0 7px 0",
                  }}
                >
                  {signal.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                  }}
                >
                  {signal.text}
                </p>
              </div>
            )
          )}

        </div>
      </section>

      {/* ======================================================
          SEAM PERFORMANCE
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          SEAM INTELLIGENCE
        </div>

        <h2>
          Seam Performance Analysis
        </h2>

        <div
          style={{
            overflowX: "auto",
            marginTop: "22px",
          }}
        >

          <table
            className="mining-table"
          >
            <thead>
              <tr>
                <th>Seam</th>
                <th>Records</th>
                <th>Avg Production</th>
                <th>Avg Recovery</th>
                <th>Avg Depth</th>
                <th>Avg Thickness</th>
                <th>Reserve</th>
              </tr>
            </thead>

            <tbody>
              {analytics.seamPerformance
                .slice(0, 10)
                .map((seam) => (
                  <tr key={seam.seam}>
                    <td>
                      <strong>
                        {seam.seam}
                      </strong>
                    </td>

                    <td>
                      {seam.records}
                    </td>

                    <td>
                      {formatNumber(
                        seam.averageProduction
                      )}
                    </td>

                    <td>
                      {formatNumber(
                        seam.averageRecovery
                      )}
                      %
                    </td>

                    <td>
                      {formatNumber(
                        seam.averageDepth
                      )}
                      m
                    </td>

                    <td>
                      {formatNumber(
                        seam.averageThickness
                      )}
                      m
                    </td>

                    <td>
                      {formatNumber(
                        seam.averageReserve
                      )}
                      MT
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

        </div>
      </section>

      {/* ======================================================
          ASK BRAIN 1
      ====================================================== */}

      <section className="brain-question-card">

        <div className="section-label">
          ASK BRAIN 1
        </div>

        <h2>
          Mining Intelligence Questions
        </h2>

        <p>
          Ask Brain 1 questions about your
          mining data.
        </p>

        <div className="brain-question-form">

          <textarea
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            placeholder="Example: Which seam has the highest production?"
            className="brain-textarea"
          />

          <div className="brain-buttons">

            <button
              type="button"
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading
                ? "Analyzing..."
                : "Analyze"}
            </button>

            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
            >
              Clear
            </button>

          </div>
        </div>

        {error && (
          <div className="brain-error">
            {error}
          </div>
        )}

        {result && (
          <div className="brain-result">

            <div className="result-header">
              <span>
                {result.brain ||
                  "BRAIN 1"}
              </span>

              <span>
                Records Used:{" "}
                {result.records_used ||
                  result.records_matched ||
                  analytics.total}
              </span>
            </div>

            <div className="result-answer">
              {result.answer}
            </div>

          </div>
        )}

      </section>

      {/* ======================================================
          ROADMAP
      ====================================================== */}

      <section className="roadmap-section">

        <div className="section-label">
          BRAIN 1 ROADMAP
        </div>

        <h2>
          Complete 9-Phase Intelligence System
        </h2>

        <div className="roadmap-grid">

          <div className="roadmap-card active">
            <div className="phase-number">
              01
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Data Understanding
            </h3>
            <p>
              Mining records and operational
              data analysis.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              02
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Mining Intelligence
            </h3>
            <p>
              Analyze mining information and
              answer questions.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              03
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Pattern Detection
            </h3>
            <p>
              Detect significant mining patterns
              across the connected dataset.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              04
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Risk Analysis
            </h3>
            <p>
              Analyze mining and geological risk
              indicators.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              05
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Prediction
            </h3>
            <p>
              Generate analytical indicators
              from historical observations.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              06
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Optimization
            </h3>
            <p>
              Identify operational areas that
              require attention.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              07
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Decision Support
            </h3>
            <p>
              Support management decisions with
              explainable intelligence signals.
            </p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">
              08
            </div>
            <div className="phase-status">
              ACTIVE
            </div>
            <h3>
              Advanced Intelligence
            </h3>
            <p>
              Combine geological, production
              and risk indicators.
            </p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">
              09
            </div>
            <div className="phase-status">
              NEXT
            </div>
            <h3>
              Autonomous Intelligence
            </h3>
            <p>
              Future automated intelligence
              workflows and agent orchestration.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}

export default Brain1;