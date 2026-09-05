import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function Predict() {
  const [records, setRecords] = useState([]);
  const [mine, setMine] = useState("");
  const [seam, setSeam] = useState("");
  const [thickness, setThickness] = useState("");
  const [depth, setDepth] = useState("");
  const [ash, setAsh] = useState("");
  const [moisture, setMoisture] = useState("");

  const [result, setResult] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMiningData();
  }, []);

  const loadMiningData = async () => {
    try {
      setLoadingData(true);
      setError("");

      const response = await fetch(`${API_URL}/mining-data`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not load mining data."
        );
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Could not load historical mining data."
      );
    } finally {
      setLoadingData(false);
    }
  };

  const mines = useMemo(() => {
    return [
      ...new Set(
        records
          .map((record) => record.mine || record.mine_name)
          .filter(Boolean)
      ),
    ];
  }, [records]);

  const seams = useMemo(() => {
    const filtered = mine
      ? records.filter(
          (record) =>
            String(record.mine || record.mine_name || "").toLowerCase() ===
            mine.toLowerCase()
        )
      : records;

    return [
      ...new Set(
        filtered
          .map((record) => record.seam || record.seam_name)
          .filter(Boolean)
      ),
    ];
  }, [records, mine]);

  const resetPrediction = () => {
    setResult(null);
    setError("");
  };

  const runPrediction = async () => {
    setError("");
    setResult(null);

    if (!mine) {
      setError("Please select a mine.");
      return;
    }

    if (!seam) {
      setError("Please select a coal seam.");
      return;
    }

    if (thickness === "" || Number.isNaN(Number(thickness))) {
      setError("Please enter seam thickness.");
      return;
    }

    if (depth === "" || Number.isNaN(Number(depth))) {
      setError("Please enter mining depth.");
      return;
    }

    if (ash === "" || Number.isNaN(Number(ash))) {
      setError("Please enter ash content.");
      return;
    }

    if (moisture === "" || Number.isNaN(Number(moisture))) {
      setError("Please enter moisture.");
      return;
    }

    try {
      setPredicting(true);

      const response = await fetch(
        `${API_URL}/predict/custom`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mine_name: mine,
            seam: seam,
            thickness: Number(thickness),
            depth: Number(depth),
            ash_content: Number(ash),
            moisture: Number(moisture),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Historical prediction failed."
        );
      }

      setResult(data);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Prediction failed. Check the backend connection."
      );
    } finally {
      setPredicting(false);
    }
  };

  const formatNumber = (value, digits = 2) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      Number.isNaN(Number(value))
    ) {
      return "—";
    }

    return Number(value).toLocaleString(undefined, {
      maximumFractionDigits: digits,
    });
  };

  const prediction = result?.prediction || {};

  const references = Array.isArray(
    result?.historical_references
  )
    ? result.historical_references
    : [];

  const recommendations = Array.isArray(
    result?.recommendations
  )
    ? result.recommendations
    : [];

  const downloadReport = () => {
    if (!result) return;

    const lines = [];

    lines.push("MINQORA HISTORICAL CONDITION-BASED PREDICTION");
    lines.push("============================================================");
    lines.push("");
    lines.push("INPUT CONDITIONS");
    lines.push("------------------------------------------------------------");
    lines.push(`Mine: ${mine}`);
    lines.push(`Seam: ${seam}`);
    lines.push(`Thickness: ${thickness} m`);
    lines.push(`Depth: ${depth} m`);
    lines.push(`Ash Content: ${ash} %`);
    lines.push(`Moisture: ${moisture} %`);
    lines.push("");

    lines.push("PREDICTION");
    lines.push("------------------------------------------------------------");
    lines.push(
      `Predicted Production: ${formatNumber(
        prediction.production
      )} tonnes`
    );
    lines.push(
      `Predicted Recovery: ${formatNumber(
        prediction.recovery
      )} %`
    );
    lines.push(
      `Expected Ash Content: ${formatNumber(
        prediction.expected_ash_content
      )} %`
    );
    lines.push(
      `Expected Moisture: ${formatNumber(
        prediction.expected_moisture
      )} %`
    );
    lines.push(
      `Predicted Risk: ${
        prediction.risk_level || "—"
      }`
    );
    lines.push(
      `Prediction Confidence: ${
        prediction.confidence ?? "—"
      } %`
    );
    lines.push("");

    lines.push("HISTORICAL RECORDS USED");
    lines.push("------------------------------------------------------------");

    references.forEach((record) => {
      lines.push(
        [
          `ID=${record.id}`,
          `Date=${record.date}`,
          `Mine=${record.mine_name || record.mine || ""}`,
          `Seam=${record.seam || ""}`,
          `Thickness=${record.thickness ?? ""}`,
          `Depth=${record.depth ?? ""}`,
          `Production=${record.production ?? ""}`,
          `Recovery=${record.recovery ?? ""}`,
          `Ash=${record.ash_content ?? record.ash ?? ""}`,
          `Moisture=${record.moisture ?? ""}`,
          `Risk=${record.risk_level || ""}`,
          `Similarity=${record.similarity ?? ""}%`,
        ].join(" | ")
      );
    });

    lines.push("");
    lines.push("RECOMMENDATIONS");
    lines.push("------------------------------------------------------------");

    recommendations.forEach((item) => {
      lines.push(`- ${item}`);
    });

    lines.push("");
    lines.push(
      "MINQORA Mining Intelligence Platform"
    );

    const blob = new Blob(
      [lines.join("\n")],
      { type: "text/plain" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      "minqora-historical-prediction-report.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const riskClass =
    String(prediction.risk_level || "")
      .toLowerCase();

  return (
    <div className="historical-predict-page">

      <style>{`
        .historical-predict-page {
          padding: 34px;
          max-width: 1500px;
          margin: 0 auto;
        }

        .predict-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
          margin-bottom: 28px;
        }

        .predict-eyebrow {
          margin: 0 0 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #148f87;
        }

        .predict-header h1 {
          margin: 0;
          font-size: 32px;
          line-height: 1.15;
          color: #102b2b;
        }

        .predict-header p {
          margin: 10px 0 0;
          color: #6c7a7a;
          font-size: 14px;
          max-width: 720px;
        }

        .predict-status {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 15px;
          border: 1px solid #dce8e7;
          border-radius: 8px;
          background: #ffffff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #26756f;
          white-space: nowrap;
        }

        .predict-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #20a38d;
        }

        .predict-panel {
          background: #ffffff;
          border: 1px solid #dce6e5;
          border-radius: 10px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 3px 14px rgba(20, 45, 45, 0.04);
        }

        .predict-panel-title {
          margin: 0;
          color: #163535;
          font-size: 18px;
        }

        .predict-panel-subtitle {
          margin: 7px 0 22px;
          color: #748080;
          font-size: 13px;
        }

        .predict-form-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .predict-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .predict-field label {
          font-size: 11px;
          font-weight: 800;
          color: #496060;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .predict-field input,
        .predict-field select {
          width: 100%;
          box-sizing: border-box;
          height: 44px;
          border: 1px solid #ccdada;
          border-radius: 6px;
          padding: 0 12px;
          background: #fbfdfd;
          color: #183434;
          font-size: 14px;
          outline: none;
        }

        .predict-field input:focus,
        .predict-field select:focus {
          border-color: #168e86;
          box-shadow:
            0 0 0 3px rgba(22, 142, 134, 0.08);
        }

        .predict-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 23px;
        }

        .predict-button {
          border: 0;
          border-radius: 6px;
          background: #147f79;
          color: white;
          height: 44px;
          padding: 0 24px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.8px;
          cursor: pointer;
        }

        .predict-button:hover {
          background: #106c67;
        }

        .predict-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .predict-secondary-button {
          border: 1px solid #ccdada;
          border-radius: 6px;
          background: white;
          color: #365555;
          height: 44px;
          padding: 0 20px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .predict-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid #efcaca;
          border-radius: 6px;
          background: #fff7f7;
          color: #9d3f3f;
          font-size: 13px;
        }

        .predict-input-summary {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          border: 1px solid #dce6e5;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .predict-input-item {
          padding: 15px;
          background: #f8fbfb;
          border-right: 1px solid #dce6e5;
        }

        .predict-input-item:last-child {
          border-right: 0;
        }

        .predict-input-item span {
          display: block;
          font-size: 9px;
          font-weight: 800;
          color: #7b8989;
          letter-spacing: 1px;
          margin-bottom: 7px;
        }

        .predict-input-item strong {
          display: block;
          color: #173535;
          font-size: 14px;
        }

        .prediction-result-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .prediction-result-card {
          border: 1px solid #dce6e5;
          border-radius: 8px;
          background: white;
          padding: 20px;
          min-height: 115px;
        }

        .prediction-result-card span {
          display: block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #788888;
          margin-bottom: 13px;
        }

        .prediction-result-card strong {
          display: block;
          font-size: 25px;
          color: #153737;
        }

        .prediction-result-card small {
          display: block;
          margin-top: 5px;
          font-size: 11px;
          color: #829090;
        }

        .prediction-result-card.risk-low {
          border-top: 3px solid #269878;
        }

        .prediction-result-card.risk-medium {
          border-top: 3px solid #d29a32;
        }

        .prediction-result-card.risk-high {
          border-top: 3px solid #c84b4b;
        }

        .risk-value {
          text-transform: uppercase;
        }

        .reference-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 17px;
        }

        .reference-header h2 {
          margin: 0;
          font-size: 18px;
          color: #173737;
        }

        .reference-header p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #7b8989;
        }

        .reference-count {
          font-size: 11px;
          font-weight: 800;
          color: #147f79;
          letter-spacing: 0.7px;
        }

        .reference-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #dce6e5;
          border-radius: 8px;
        }

        .reference-table {
          width: 100%;
          min-width: 1150px;
          border-collapse: collapse;
          background: white;
        }

        .reference-table th {
          background: #f2f7f7;
          color: #526666;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          text-align: left;
          padding: 13px 12px;
          border-bottom: 1px solid #dce6e5;
          white-space: nowrap;
        }

        .reference-table td {
          padding: 13px 12px;
          border-bottom: 1px solid #edf1f1;
          color: #304d4d;
          font-size: 12px;
          white-space: nowrap;
        }

        .reference-table tbody tr:hover {
          background: #f8fbfb;
        }

        .reference-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .similarity-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 55px;
          padding: 5px 7px;
          border-radius: 5px;
          background: #e8f5f3;
          color: #147f79;
          font-weight: 800;
          font-size: 10px;
        }

        .risk-badge {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 5px;
          font-size: 9px;
          font-weight: 800;
        }

        .risk-badge.low {
          background: #e7f5ef;
          color: #247c62;
        }

        .risk-badge.medium {
          background: #fff3dc;
          color: #9a6a19;
        }

        .risk-badge.high {
          background: #fde9e9;
          color: #a64040;
        }

        .recommendations-list {
          display: grid;
          gap: 10px;
          margin-top: 17px;
        }

        .recommendation-item {
          padding: 14px 16px;
          border-left: 3px solid #168e86;
          background: #f7fbfb;
          color: #486060;
          font-size: 12px;
          line-height: 1.55;
        }

        .method-box {
          margin-top: 20px;
          padding: 17px;
          border: 1px solid #dce6e5;
          border-radius: 7px;
          background: #fbfdfd;
        }

        .method-box strong {
          display: block;
          font-size: 11px;
          color: #315252;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 7px;
        }

        .method-box p {
          margin: 0;
          color: #6e7e7e;
          font-size: 12px;
          line-height: 1.55;
        }

        .predict-empty {
          padding: 50px 25px;
          text-align: center;
          color: #758383;
        }

        .predict-empty strong {
          display: block;
          color: #304d4d;
          margin-bottom: 7px;
        }

        @media (max-width: 1100px) {
          .predict-form-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .prediction-result-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .predict-input-summary {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .predict-input-item:nth-child(3) {
            border-right: 0;
          }
        }

        @media (max-width: 700px) {
          .historical-predict-page {
            padding: 20px;
          }

          .predict-header {
            flex-direction: column;
          }

          .predict-form-grid,
          .prediction-result-grid,
          .predict-input-summary {
            grid-template-columns: 1fr;
          }

          .predict-input-item {
            border-right: 0;
            border-bottom: 1px solid #dce6e5;
          }

          .predict-input-item:last-child {
            border-bottom: 0;
          }
        }
      `}</style>

      <div className="predict-header">
        <div>
          <p className="predict-eyebrow">
            MINQORA PREDICTION ENGINE
          </p>

          <h1>
            Historical Condition-Based Prediction
          </h1>

          <p>
            Enter the expected coal seam and mining
            conditions. MINQORA searches previous mining
            records, identifies the closest conditions,
            and uses those records as prediction evidence.
          </p>
        </div>

        <div className="predict-status">
          <span className="predict-status-dot"></span>
          HISTORICAL DATA ENGINE
        </div>
      </div>

      <section className="predict-panel">
        <h2 className="predict-panel-title">
          Mining Condition Input
        </h2>

        <p className="predict-panel-subtitle">
          These conditions are compared against historical
          coal mining records.
        </p>

        <div className="predict-form-grid">

          <div className="predict-field">
            <label>Mine</label>

            <select
              value={mine}
              onChange={(event) => {
                setMine(event.target.value);
                setSeam("");
                resetPrediction();
              }}
              disabled={loadingData}
            >
              <option value="">
                {loadingData
                  ? "Loading mines..."
                  : "Select Mine"}
              </option>

              {mines.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="predict-field">
            <label>Coal Seam</label>

            <select
              value={seam}
              onChange={(event) => {
                setSeam(event.target.value);
                resetPrediction();
              }}
              disabled={!mine}
            >
              <option value="">
                Select Seam
              </option>

              {seams.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="predict-field">
            <label>Seam Thickness (m)</label>

            <input
              type="number"
              step="0.1"
              min="0"
              value={thickness}
              onChange={(event) => {
                setThickness(event.target.value);
                resetPrediction();
              }}
              placeholder="Example: 4.8"
            />
          </div>

          <div className="predict-field">
            <label>Mining Depth (m)</label>

            <input
              type="number"
              step="1"
              min="0"
              value={depth}
              onChange={(event) => {
                setDepth(event.target.value);
                resetPrediction();
              }}
              placeholder="Example: 135"
            />
          </div>

          <div className="predict-field">
            <label>Ash Content (%)</label>

            <input
              type="number"
              step="0.1"
              min="0"
              value={ash}
              onChange={(event) => {
                setAsh(event.target.value);
                resetPrediction();
              }}
              placeholder="Example: 17.1"
            />
          </div>

          <div className="predict-field">
            <label>Moisture (%)</label>

            <input
              type="number"
              step="0.1"
              min="0"
              value={moisture}
              onChange={(event) => {
                setMoisture(event.target.value);
                resetPrediction();
              }}
              placeholder="Example: 5.7"
            />
          </div>

        </div>

        <div className="predict-actions">
          <button
            className="predict-secondary-button"
            onClick={() => {
              setMine("");
              setSeam("");
              setThickness("");
              setDepth("");
              setAsh("");
              setMoisture("");
              setResult(null);
              setError("");
            }}
          >
            Clear
          </button>

          <button
            className="predict-button"
            onClick={runPrediction}
            disabled={predicting || loadingData}
          >
            {predicting
              ? "SEARCHING HISTORICAL DATA..."
              : "RUN HISTORICAL PREDICTION"}
          </button>
        </div>

        {error && (
          <div className="predict-error">
            {error}
          </div>
        )}
      </section>

      {result && (
        <>
          <section className="predict-panel">

            <div className="predict-input-summary">

              <div className="predict-input-item">
                <span>MINE</span>
                <strong>{mine}</strong>
              </div>

              <div className="predict-input-item">
                <span>SEAM</span>
                <strong>{seam}</strong>
              </div>

              <div className="predict-input-item">
                <span>THICKNESS</span>
                <strong>{thickness} m</strong>
              </div>

              <div className="predict-input-item">
                <span>DEPTH</span>
                <strong>{depth} m</strong>
              </div>

              <div className="predict-input-item">
                <span>ASH</span>
                <strong>{ash} %</strong>
              </div>

              <div className="predict-input-item">
                <span>MOISTURE</span>
                <strong>{moisture} %</strong>
              </div>

            </div>

            <div className="reference-header">
              <div>
                <h2>Prediction Result</h2>

                <p>
                  Prediction generated from similar
                  historical mining conditions.
                </p>
              </div>

              <button
                className="predict-secondary-button"
                onClick={downloadReport}
              >
                Download Prediction Report
              </button>
            </div>

            <div className="prediction-result-grid">

              <div className="prediction-result-card">
                <span>PREDICTED PRODUCTION</span>

                <strong>
                  {formatNumber(
                    prediction.production
                  )}
                </strong>

                <small>tonnes</small>
              </div>

              <div className="prediction-result-card">
                <span>PREDICTED RECOVERY</span>

                <strong>
                  {formatNumber(
                    prediction.recovery
                  )}
                </strong>

                <small>percent</small>
              </div>

              <div className="prediction-result-card">
                <span>PREDICTION CONFIDENCE</span>

                <strong>
                  {formatNumber(
                    prediction.confidence
                  )}
                </strong>

                <small>percent similarity confidence</small>
              </div>

              <div
                className={
                  `prediction-result-card risk-${riskClass}`
                }
              >
                <span>PREDICTED RISK</span>

                <strong className="risk-value">
                  {prediction.risk_level || "—"}
                </strong>

                <small>
                  Based on similar historical records
                </small>
              </div>

              <div className="prediction-result-card">
                <span>EXPECTED ASH</span>

                <strong>
                  {formatNumber(
                    prediction.expected_ash_content
                  )}
                </strong>

                <small>percent</small>
              </div>

              <div className="prediction-result-card">
                <span>EXPECTED MOISTURE</span>

                <strong>
                  {formatNumber(
                    prediction.expected_moisture
                  )}
                </strong>

                <small>percent</small>
              </div>

              <div className="prediction-result-card">
                <span>HISTORICAL RECORDS USED</span>

                <strong>
                  {result.historical_records_used ??
                    references.length}
                </strong>

                <small>
                  closest reference records
                </small>
              </div>

              <div className="prediction-result-card">
                <span>DATASET ANALYZED</span>

                <strong>
                  {records.length}
                </strong>

                <small>
                  mining records available
                </small>
              </div>

            </div>
          </section>

          <section className="predict-panel">

            <div className="reference-header">
              <div>
                <h2>
                  Historical Records Used for Prediction
                </h2>

                <p>
                  These are the historical records most
                  similar to the entered mining conditions.
                </p>
              </div>

              <div className="reference-count">
                {references.length} REFERENCE RECORDS
              </div>
            </div>

            {references.length > 0 ? (
              <div className="reference-table-wrapper">

                <table className="reference-table">

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Mine</th>
                      <th>Seam</th>
                      <th>Thickness</th>
                      <th>Depth</th>
                      <th>Production</th>
                      <th>Recovery</th>
                      <th>Ash</th>
                      <th>Moisture</th>
                      <th>Risk</th>
                      <th>Similarity</th>
                    </tr>
                  </thead>

                  <tbody>
                    {references.map(
                      (record, index) => {

                        const recordRisk =
                          String(
                            record.risk_level ||
                              "LOW"
                          ).toLowerCase();

                        return (
                          <tr
                            key={
                              record.id ??
                              `reference-${index}`
                            }
                          >
                            <td>
                              {record.id ?? "—"}
                            </td>

                            <td>
                              {record.date ?? "—"}
                            </td>

                            <td>
                              {record.mine_name ||
                                record.mine ||
                                "—"}
                            </td>

                            <td>
                              {record.seam || "—"}
                            </td>

                            <td>
                              {formatNumber(
                                record.thickness
                              )}{" "}
                              m
                            </td>

                            <td>
                              {formatNumber(
                                record.depth
                              )}{" "}
                              m
                            </td>

                            <td>
                              {formatNumber(
                                record.production
                              )}{" "}
                              t
                            </td>

                            <td>
                              {formatNumber(
                                record.recovery
                              )}{" "}
                              %
                            </td>

                            <td>
                              {formatNumber(
                                record.ash_content ??
                                  record.ash
                              )}{" "}
                              %
                            </td>

                            <td>
                              {formatNumber(
                                record.moisture
                              )}{" "}
                              %
                            </td>

                            <td>
                              <span
                                className={
                                  `risk-badge ${recordRisk}`
                                }
                              >
                                {record.risk_level ||
                                  "LOW"}
                              </span>
                            </td>

                            <td>
                              <span className="similarity-badge">
                                {formatNumber(
                                  record.similarity
                                )}%
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>

                </table>

              </div>
            ) : (
              <div className="predict-empty">
                <strong>
                  No historical reference records returned.
                </strong>

                <span>
                  The prediction engine did not return
                  historical evidence.
                </span>
              </div>
            )}

          </section>

          <section className="predict-panel">

            <div className="reference-header">
              <div>
                <h2>
                  Prediction Recommendations
                </h2>

                <p>
                  Recommendations derived from the
                  historical conditions used by the engine.
                </p>
              </div>
            </div>

            {recommendations.length > 0 ? (
              <div className="recommendations-list">
                {recommendations.map(
                  (recommendation, index) => (
                    <div
                      className="recommendation-item"
                      key={index}
                    >
                      {recommendation}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="predict-empty">
                No additional recommendations returned.
              </div>
            )}

            <div className="method-box">
              <strong>
                Prediction Method
              </strong>

              <p>
                MINQORA compares the entered mine,
                seam, thickness, depth, ash and moisture
                conditions against historical mining
                records. The closest records receive the
                highest similarity weights. Predicted
                production, recovery and coal-quality
                indicators are calculated from those
                historical references.
              </p>
            </div>

          </section>
        </>
      )}
    </div>
  );
}

export default Predict;