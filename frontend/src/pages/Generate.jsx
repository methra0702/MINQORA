import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../App.css";

const API_URL =
  "https://minqora-brain1.onrender.com";


function Generate() {

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const [selectedMine, setSelectedMine] =
    useState("ALL");

  const [selectedSeam, setSelectedSeam] =
    useState("ALL");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");


  const [generated, setGenerated] =
    useState(false);

  const [generatedRecords, setGeneratedRecords] =
    useState([]);

  const [reportMode, setReportMode] =
    useState("EXECUTIVE");


  // =========================================================
  // HELPERS
  // =========================================================

  const getMineName = (record) => {
    return (
      record.mine_name ||
      record.mine ||
      record.mineName ||
      "Unknown Mine"
    );
  };


  const getSeamName = (record) => {
    return (
      record.seam_name ||
      record.seam ||
      record.seamName ||
      "Unknown Seam"
    );
  };


  const getThickness = (record) => {
    return Number(
      record.thickness ??
      record.thickness_m ??
      0
    );
  };


  const getDepth = (record) => {
    return Number(
      record.depth ??
      record.depth_m ??
      0
    );
  };


  const getProduction = (record) => {
    return Number(
      record.production ??
      record.production_tonnes ??
      0
    );
  };


  const getRecovery = (record) => {
    return Number(
      record.recovery ??
      record.recovery_percentage ??
      0
    );
  };


  const getAsh = (record) => {
    return Number(
      record.ash_content ??
      record.ash ??
      record.ash_percentage ??
      0
    );
  };


  const getReserve = (record) => {
    return Number(
      record.geological_reserve_mt ??
      record.reserve_mt ??
      record.reserve ??
      0
    );
  };


  const getRisk = (record) => {
    return String(
      record.risk_level ??
      record.risk ??
      "LOW"
    ).toUpperCase();
  };


  const normalizeDate = (value) => {

    if (!value) {
      return "";
    }

    const raw = String(value).trim();

    const ddmmyy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);

    if (ddmmyy) {
      const [, day, month, year] = ddmmyy;
      return `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return raw.split("T")[0];
    }

    return date.toISOString().split("T")[0];
  };


  const formatDisplayDate = (value) => {
    const iso = normalizeDate(value);

    if (!iso) {
      return "All Dates";
    }

    const [year, month, day] = iso.split("-");

    return `${day}-${Number(month)}-${year.slice(2)}`;
  };


  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {

    const loadData = async () => {

      try {

        setLoading(true);
        setError("");


        let allData = [];
        let page = 1;
        let totalPages = 1;


        do {

          const response =
            await fetch(
              `${API_URL}/mining-data?page=${page}&limit=100`
            );


          if (!response.ok) {

            throw new Error(
              `Server returned ${response.status}`
            );

          }


          const data =
            await response.json();


          const pageRecords =
            Array.isArray(data)
              ? data
              : Array.isArray(data.records)
              ? data.records
              : [];


          allData = [
            ...allData,
            ...pageRecords,
          ];


          totalPages =
            Number(
              data.total_pages ||
              data.pagination?.total_pages ||
              1
            );


          if (
            pageRecords.length === 0
          ) {
            break;
          }


          page += 1;

        } while (
          page <= totalPages &&
          page <= 100
        );


        setRecords(allData);

      } catch (err) {

        console.error(err);

        setError(
          `Failed to load mining data: ${err.message}`
        );

      } finally {

        setLoading(false);

      }

    };


    loadData();

  }, []);


  // =========================================================
  // MINES
  // =========================================================

  const mines = useMemo(() => {

    return [
      ...new Set(
        records
          .map(getMineName)
          .filter(Boolean)
      ),
    ].sort();

  }, [records]);


  // =========================================================
  // SEAMS
  // =========================================================

  const seams = useMemo(() => {

    let source =
      records;


    if (
      selectedMine !== "ALL"
    ) {

      source =
        source.filter(
          (record) =>
            getMineName(record) ===
            selectedMine
        );

    }


    return [
      ...new Set(
        source
          .map(getSeamName)
          .filter(Boolean)
      ),
    ].sort();

  }, [
    records,
    selectedMine,
  ]);


  // =========================================================
  // MINE CHANGE
  // =========================================================

  const handleMineChange = (
    event
  ) => {

    setSelectedMine(
      event.target.value
    );

    setSelectedSeam("ALL");

  };


  // =========================================================
  // GENERATE REPORT
  // =========================================================

  const generateReport = () => {

    setError("");


    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {

      setError(
        "Start date cannot be later than end date."
      );

      return;
    }


    let filtered =
      [...records];


    // Mine

    if (
      selectedMine !== "ALL"
    ) {

      filtered =
        filtered.filter(
          (record) =>
            getMineName(record) ===
            selectedMine
        );

    }


    // Seam

    if (
      selectedSeam !== "ALL"
    ) {

      filtered =
        filtered.filter(
          (record) =>
            getSeamName(record) ===
            selectedSeam
        );

    }


    // Start date

    if (startDate) {

      filtered =
        filtered.filter(
          (record) => {

            const date =
              normalizeDate(
                record.date
              );

            return date >= startDate;

          }
        );

    }


    // End date

    if (endDate) {

      filtered =
        filtered.filter(
          (record) => {

            const date =
              normalizeDate(
                record.date
              );

            return date <= endDate;

          }
        );

    }


    // Sort chronologically

    filtered.sort(
      (a, b) =>
        normalizeDate(a.date).localeCompare(
          normalizeDate(b.date)
        )
    );


    setGeneratedRecords(
      filtered
    );

    setGenerated(true);

  };


  // =========================================================
  // CLEAR
  // =========================================================

  const clearFilters = () => {

    setSelectedMine("ALL");
    setSelectedSeam("ALL");
    setStartDate("");
    setEndDate("");

    setGenerated(false);

    setGeneratedRecords([]);

    setError("");

  };


  // =========================================================
  // ANALYTICS
  // =========================================================

  const analytics =
    useMemo(() => {

      if (
        generatedRecords.length === 0
      ) {

        return {
          totalProduction: 0,
          averageProduction: 0,
          averageRecovery: 0,
          averageThickness: 0,
          averageDepth: 0,
          averageAsh: 0,
        };

      }


      const count =
        generatedRecords.length;


      const totalProduction =
        generatedRecords.reduce(
          (sum, record) =>
            sum +
            getProduction(record),
          0
        );


      const averageProduction =
        totalProduction /
        count;


      const averageRecovery =
        generatedRecords.reduce(
          (sum, record) =>
            sum +
            getRecovery(record),
          0
        ) / count;


      const averageThickness =
        generatedRecords.reduce(
          (sum, record) =>
            sum +
            getThickness(record),
          0
        ) / count;


      const averageDepth =
        generatedRecords.reduce(
          (sum, record) =>
            sum +
            getDepth(record),
          0
        ) / count;


      const averageAsh =
        generatedRecords.reduce(
          (sum, record) =>
            sum +
            getAsh(record),
          0
        ) / count;


      return {
        totalProduction,
        averageProduction,
        averageRecovery,
        averageThickness,
        averageDepth,
        averageAsh,
      };

    }, [
      generatedRecords,
    ]);

  // =========================================================
  // TOPIC IDENTIFICATION + WORD CLOUD
  // =========================================================

  const topicAnalysis = useMemo(() => {
    if (!generatedRecords.length) {
      return { topics: [], keywords: [] };
    }

    const scores = {
      "Production Performance": 0,
      "Recovery Efficiency": 0,
      "Geological Depth": 0,
      "Seam Thickness": 0,
      "Quality / Ash": 0,
      "Mining Risk": 0,
      "Resource Potential": 0,
    };

    const keywordMap = {};

    const addKeyword = (word, weight = 1) => {
      const clean = String(word || "").toLowerCase().trim();
      if (!clean || clean.length < 3) return;
      keywordMap[clean] = (keywordMap[clean] || 0) + weight;
    };

    generatedRecords.forEach((record) => {
      const production = getProduction(record);
      const recovery = getRecovery(record);
      const depth = getDepth(record);
      const thickness = getThickness(record);
      const ash = getAsh(record);
      const risk = getRisk(record);

      if (production > 0) {
        scores["Production Performance"] += production;
        addKeyword("production", 3);
      }
      if (recovery > 0) {
        scores["Recovery Efficiency"] += recovery;
        addKeyword("recovery", 3);
      }
      if (depth > 0) {
        scores["Geological Depth"] += depth;
        addKeyword("depth", 3);
      }
      if (thickness > 0) {
        scores["Seam Thickness"] += thickness;
        addKeyword("seam", 2);
        addKeyword("thickness", 3);
      }
      if (ash > 0) {
        scores["Quality / Ash"] += ash;
        addKeyword("ash", 3);
        addKeyword("quality", 2);
      }
      if (risk === "HIGH") {
        scores["Mining Risk"] += 3;
        addKeyword("risk", 4);
      } else if (risk === "MEDIUM") {
        scores["Mining Risk"] += 1;
        addKeyword("risk", 2);
      }
      if (getReserve(record) > 0) {
        scores["Resource Potential"] += getReserve(record);
        addKeyword("reserve", 3);
        addKeyword("resource", 2);
      }

      addKeyword(getSeamName(record), 1);
    });

    return {
      topics: Object.entries(scores)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => b.score - a.score),
      keywords: Object.entries(keywordMap)
        .map(([word, weight]) => ({ word, weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 18),
    };
  }, [generatedRecords]);

  const executiveInsights = useMemo(() => {
    if (!generatedRecords.length) return [];

    const deepest = [...generatedRecords].sort(
      (a, b) => getDepth(b) - getDepth(a)
    )[0];

    const thickest = [...generatedRecords].sort(
      (a, b) => getThickness(b) - getThickness(a)
    )[0];

    const highestProduction = [...generatedRecords].sort(
      (a, b) => getProduction(b) - getProduction(a)
    )[0];

    const highRisk = generatedRecords.filter(
      (record) => getRisk(record) === "HIGH"
    ).length;

    return [
      `The report contains ${generatedRecords.length.toLocaleString()} mining records.`,
      `Average production is ${analytics.averageProduction.toFixed(2)} with average recovery of ${analytics.averageRecovery.toFixed(2)}%.`,
      `The deepest observed record is ${getSeamName(deepest)} at ${getDepth(deepest).toFixed(2)} m.`,
      `The thickest observed record is ${getSeamName(thickest)} at ${getThickness(thickest).toFixed(2)} m.`,
      `The highest production observation is associated with ${getSeamName(highestProduction)} at ${getProduction(highestProduction).toLocaleString()}.`,
      `${highRisk.toLocaleString()} records are classified as HIGH risk and warrant additional review.`,
    ];
  }, [generatedRecords, analytics]);


  // =========================================================
  // MODE-SPECIFIC REPORT INTELLIGENCE
  // =========================================================

  const modeIntelligence = useMemo(() => {
    const count = generatedRecords.length;

    if (!count) {
      return {
        title: "Executive Intelligence",
        description: "Generate a report to view intelligence.",
        metrics: [],
      };
    }

    const highRisk = generatedRecords.filter(
      (record) => getRisk(record) === "HIGH"
    ).length;

    const mediumRisk = generatedRecords.filter(
      (record) => getRisk(record) === "MEDIUM"
    ).length;

    const lowRisk = generatedRecords.filter(
      (record) => getRisk(record) === "LOW"
    ).length;

    // Reserve is a seam-level attribute. Avoid double-counting it
    // when the same seam appears in multiple analytical records.
    const reserveBySeam = {};

    generatedRecords.forEach((record) => {
      const seam = getSeamName(record);
      const reserve = getReserve(record);

      if (reserve > 0) {
        reserveBySeam[seam] = Math.max(
          reserveBySeam[seam] || 0,
          reserve
        );
      }
    });

    const totalReserve = Object.values(reserveBySeam).reduce(
      (sum, reserve) => sum + reserve,
      0
    );

    const deepest = [...generatedRecords].sort(
      (a, b) => getDepth(b) - getDepth(a)
    )[0];

    const thickest = [...generatedRecords].sort(
      (a, b) => getThickness(b) - getThickness(a)
    )[0];

    if (reportMode === "GEOLOGICAL") {
      return {
        title: "Geological Intelligence",
        description:
          "Geological indicators extracted from the selected mining records, focused on seam geometry, depth and resource potential.",
        metrics: [
          ["Records Analyzed", count.toLocaleString(), "records"],
          ["Average Depth", `${analytics.averageDepth.toFixed(2)} m`, "depth"],
          ["Average Thickness", `${analytics.averageThickness.toFixed(2)} m`, "seam thickness"],
          ["Geological Reserve", `${totalReserve.toFixed(2)} MT`, "resource"],
        ],
        detail:
          `The deepest observed record is ${getSeamName(deepest)} at ${getDepth(deepest).toFixed(2)} m. The thickest observed record is ${getSeamName(thickest)} at ${getThickness(thickest).toFixed(2)} m.`,
      };
    }

    if (reportMode === "OPERATIONAL") {
      return {
        title: "Operational Intelligence",
        description:
          "Production and recovery indicators for assessing operational performance across the selected records.",
        metrics: [
          ["Records Analyzed", count.toLocaleString(), "records"],
          ["Total Production", analytics.totalProduction.toLocaleString(undefined, { maximumFractionDigits: 2 }), "production"],
          ["Average Production", analytics.averageProduction.toFixed(2), "per record"],
          ["Average Recovery", `${analytics.averageRecovery.toFixed(2)}%`, "recovery"],
        ],
        detail:
          `The selected records show an average production of ${analytics.averageProduction.toFixed(2)} with an average recovery of ${analytics.averageRecovery.toFixed(2)}%.`,
      };
    }

    if (reportMode === "RISK") {
      return {
        title: "Risk Intelligence",
        description:
          "Risk distribution and quality indicators requiring engineering or operational review.",
        metrics: [
          ["High Risk", highRisk.toLocaleString(), "records"],
          ["Medium Risk", mediumRisk.toLocaleString(), "records"],
          ["Low Risk", lowRisk.toLocaleString(), "records"],
          ["Average Ash", `${analytics.averageAsh.toFixed(2)}%`, "quality"],
        ],
        detail:
          `${highRisk.toLocaleString()} records are classified as HIGH risk, ${mediumRisk.toLocaleString()} as MEDIUM risk and ${lowRisk.toLocaleString()} as LOW risk.`,
      };
    }

    return {
      title: "Executive Mining Intelligence",
      description:
        "A consolidated view of production, recovery, geological and risk indicators from the selected records.",
      metrics: [
        ["Records Analyzed", count.toLocaleString(), "records"],
        ["Total Production", analytics.totalProduction.toLocaleString(undefined, { maximumFractionDigits: 2 }), "production"],
        ["Average Recovery", `${analytics.averageRecovery.toFixed(2)}%`, "recovery"],
        ["Average Ash", `${analytics.averageAsh.toFixed(2)}%`, "quality"],
      ],
      detail:
        `MINQORA analyzed ${count.toLocaleString()} records and identified production, recovery, geological, resource and risk themes.`,
    };
  }, [generatedRecords, analytics, reportMode]);

  // =========================================================
  // DOWNLOAD
  // =========================================================

  const downloadReport = () => {

    if (
      !generated
    ) {
      return;
    }


    const lines = [];


    lines.push(
      "MINQORA MINING INTELLIGENCE REPORT"
    );

    lines.push(
      "=================================================="
    );

    lines.push("");


    lines.push(
      `Mine: ${
        selectedMine === "ALL"
          ? "All Mines"
          : selectedMine
      }`
    );


    lines.push(
      `Seam: ${
        selectedSeam === "ALL"
          ? "All Seams"
          : selectedSeam
      }`
    );


    lines.push(
      `Start Date: ${
        startDate ||
        "All Available Dates"
      }`
    );


    lines.push(
      `End Date: ${
        endDate ||
        "All Available Dates"
      }`
    );


    lines.push("");


    lines.push(
      "REPORT SUMMARY"
    );

    lines.push(
      "--------------------------------------------------"
    );


    lines.push(
      `Total Records: ${generatedRecords.length}`
    );


    lines.push(
      `Total Production: ${analytics.totalProduction.toFixed(2)}`
    );


    lines.push(
      `Average Production: ${analytics.averageProduction.toFixed(2)}`
    );


    lines.push(
      `Average Recovery: ${analytics.averageRecovery.toFixed(2)}%`
    );


    lines.push(
      `Average Thickness: ${analytics.averageThickness.toFixed(2)} m`
    );


    lines.push(
      `Average Depth: ${analytics.averageDepth.toFixed(2)} m`
    );


    lines.push(
      `Average Ash: ${analytics.averageAsh.toFixed(2)}%`
    );


    lines.push("");


    lines.push("");
    lines.push("EXECUTIVE INTELLIGENCE");
    lines.push("--------------------------------------------------");
    executiveInsights.forEach((insight, index) => {
      lines.push(`${index + 1}. ${insight}`);
    });

    lines.push("");
    lines.push("TOPIC IDENTIFICATION");
    lines.push("--------------------------------------------------");
    topicAnalysis.topics.forEach((topic, index) => {
      lines.push(`${index + 1}. ${topic.name}`);
    });

    lines.push("");
    lines.push("KEYWORDS");
    lines.push("--------------------------------------------------");
    lines.push(
      topicAnalysis.keywords
        .map((item) => `${item.word} (${item.weight})`)
        .join(", ")
    );

    lines.push("");
    lines.push("COMPLETE SOURCE DATA");

    lines.push(
      "--------------------------------------------------"
    );


    lines.push(
      "ID | Date | Mine | Seam | Thickness | Depth | Production | Recovery | Ash | Risk"
    );


    generatedRecords.forEach(
      (record) => {

        lines.push(
          [
            record.id ?? "",
            formatDisplayDate(
              record.date
            ),
            getMineName(record),
            getSeamName(record),
            getThickness(record).toFixed(2),
            getDepth(record).toFixed(2),
            getProduction(record).toFixed(2),
            getRecovery(record).toFixed(2),
            getAsh(record).toFixed(2),
            getRisk(record),
          ].join(" | ")
        );

      }
    );


    lines.push("");

    lines.push(
      "Generated by MINQORA"
    );

    lines.push(
      "Mining Intelligence Platform"
    );


    const blob =
      new Blob(
        [lines.join("\n")],
        {
          type: "text/plain",
        }
      );


    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href = url;


    link.download =
      "minqora-mining-intelligence-report.txt";


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  };


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <div className="generate-page">

      <style>{`
        .generate-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          color: #172033;
        }

        .generated-report-section,
        .generate-section {
          box-sizing: border-box;
        }

        .report-info-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin-top: 20px !important;
        }

        .report-info-card {
          box-sizing: border-box;
          padding: 16px 18px !important;
          background: #f7fafc !important;
          border: 1px solid #e3e9ef !important;
          border-radius: 12px !important;
          min-width: 0;
        }

        .report-info-card span {
          display: block !important;
          color: #718096 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: .05em !important;
          margin-bottom: 7px !important;
        }

        .report-info-card strong {
          display: block !important;
          color: #172033 !important;
          font-size: 14px !important;
          line-height: 1.35 !important;
          word-break: break-word !important;
        }

        .report-summary-grid {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 14px !important;
          margin-top: 20px !important;
        }

        .report-summary-card {
          box-sizing: border-box;
          min-width: 0;
          padding: 18px !important;
          background: #fff !important;
          border: 1px solid #e3e9ef !important;
          border-radius: 12px !important;
        }

        .report-summary-card span {
          display: block !important;
          color: #718096 !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: .04em !important;
          margin-bottom: 8px !important;
        }

        .report-summary-card strong {
          display: block !important;
          color: #172033 !important;
          font-size: 21px !important;
          line-height: 1.2 !important;
          word-break: break-word !important;
        }

        .report-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e3e9ef;
          border-radius: 12px;
          margin-top: 18px;
        }

        .report-table {
          width: 100%;
          min-width: 950px;
          border-collapse: collapse;
          background: #fff;
        }

        .report-table th {
          background: #f5f8fa;
          color: #53657a;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .04em;
          padding: 13px 12px;
          text-align: left;
          border-bottom: 1px solid #e3e9ef;
        }

        .report-table td {
          padding: 12px;
          color: #43566b;
          font-size: 13px;
          border-bottom: 1px solid #edf1f4;
          white-space: nowrap;
        }

        .report-table tbody tr:last-child td {
          border-bottom: none;
        }

        @media (max-width: 900px) {
          .report-info-grid,
          .report-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 600px) {
          .report-info-grid,
          .report-summary-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="page-heading">

        <div>

          <p className="eyebrow">
            MINQORA GENERATE
          </p>

          <h1>
            Generate Mining Report
          </h1>

          <p className="page-description">
            Generate a complete mining
            intelligence report using
            actual historical mining data.
          </p>

        </div>

      </div>


      {/* PARAMETERS */}

      <section className="generate-section">

        <p className="eyebrow">
          REPORT PARAMETERS
        </p>

        <h2>
          Select Mining Data
        </h2>


        {loading && (
          <p className="loading-text">
            Loading mining data...
          </p>
        )}


        {error && (
          <div className="generate-error">
            {error}
          </div>
        )}


        {!loading && (

          <>

            <div className="filter-grid">

              {/* MINE */}

              <div className="filter-group">

                <label>
                  Mine
                </label>

                <select
                  value={selectedMine}
                  onChange={
                    handleMineChange
                  }
                >

                  <option value="ALL">
                    All Mines
                  </option>

                  {mines.map(
                    (mine) => (

                      <option
                        key={mine}
                        value={mine}
                      >
                        {mine}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* SEAM */}

              <div className="filter-group">

                <label>
                  Seam
                </label>

                <select
                  value={selectedSeam}
                  onChange={(event) =>
                    setSelectedSeam(
                      event.target.value
                    )
                  }
                >

                  <option value="ALL">
                    All Seams
                  </option>

                  {seams.map(
                    (seam) => (

                      <option
                        key={seam}
                        value={seam}
                      >
                        {seam}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* START */}

              <div className="filter-group">

                <label>
                  Start Date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                />

              </div>


              {/* END */}

              <div className="filter-group">

                <label>
                  End Date
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            <div className="generate-buttons">

              <button
                className="primary-button"
                onClick={
                  generateReport
                }
              >
                Generate Report
              </button>


              <button
                className="secondary-button"
                onClick={
                  clearFilters
                }
              >
                Clear
              </button>

            </div>

          </>

        )}

      </section>


      {/* GENERATED REPORT */}

      {generated && (

        <>

          <section className="generated-report-section">

            <div className="report-top">

              <div>

                <p className="eyebrow">
                  GENERATED REPORT
                </p>

                <h2>
                  MINQORA Mining Intelligence Report
                </h2>

              </div>


              <button
                className="download-button"
                onClick={
                  downloadReport
                }
              >
                Download Report
              </button>

            </div>


            {/* PARAMETERS */}

            <div className="report-info-grid">

              <div className="report-info-card">

                <span>
                  Mine
                </span>

                <strong>
                  {selectedMine === "ALL"
                    ? "All Mines"
                    : selectedMine}
                </strong>

              </div>


              <div className="report-info-card">

                <span>
                  Seam
                </span>

                <strong>
                  {selectedSeam === "ALL"
                    ? "All Seams"
                    : selectedSeam}
                </strong>

              </div>


              <div className="report-info-card">

                <span>
                  Start Date
                </span>

                <strong>
                  {formatDisplayDate(startDate)}
                </strong>

              </div>


              <div className="report-info-card">

                <span>
                  End Date
                </span>

                <strong>
                  {formatDisplayDate(endDate)}
                </strong>

              </div>

            </div>


            {/* SUMMARY */}

            <div className="report-summary-grid">

              <div className="report-summary-card">

                <span>
                  Total Records
                </span>

                <strong>
                  {generatedRecords.length}
                </strong>

              </div>


              <div className="report-summary-card">

                <span>
                  Total Production
                </span>

                <strong>
                  {analytics.totalProduction.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )}
                </strong>

              </div>


              <div className="report-summary-card">

                <span>
                  Average Production
                </span>

                <strong>
                  {analytics.averageProduction.toFixed(
                    2
                  )}
                </strong>

              </div>


              <div className="report-summary-card">

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


              <div className="report-summary-card">

                <span>
                  Average Thickness
                </span>

                <strong>
                  {analytics.averageThickness.toFixed(
                    2
                  )} m
                </strong>

              </div>


              <div className="report-summary-card">

                <span>
                  Average Depth
                </span>

                <strong>
                  {analytics.averageDepth.toFixed(
                    2
                  )} m
                </strong>

              </div>


              <div className="report-summary-card">

                <span>
                  Average Ash
                </span>

                <strong>
                  {analytics.averageAsh.toFixed(
                    2
                  )}%
                </strong>

              </div>

            </div>

          </section>


          {/* COMPLETE TABLE */}

          {/* AI REPORT INTELLIGENCE */}

          <section
            className="generated-report-section"
            style={{
              marginTop: "24px",
              background: "#ffffff",
              border: "1px solid #e3e9ef",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 8px 30px rgba(20, 45, 70, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "24px",
                flexWrap: "wrap",
                marginBottom: "24px",
              }}
            >
              <div style={{ flex: "1 1 500px" }}>
                <p className="eyebrow" style={{ marginBottom: "8px" }}>
                  AI REPORT INTELLIGENCE
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    lineHeight: 1.2,
                    color: "#172033",
                  }}
                >
                  {modeIntelligence.title}
                </h2>
                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#66778a",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    maxWidth: "760px",
                  }}
                >
                  {modeIntelligence.description}
                </p>
              </div>

              <div
                style={{
                  minWidth: "190px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Intelligence View
                </label>

                <select
                  value={reportMode}
                  onChange={(event) => setReportMode(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 13px",
                    border: "1px solid #cfd9e3",
                    borderRadius: "9px",
                    background: "#fff",
                    color: "#172033",
                    fontSize: "14px",
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="EXECUTIVE">Executive View</option>
                  <option value="GEOLOGICAL">Geological View</option>
                  <option value="OPERATIONAL">Operational View</option>
                  <option value="RISK">Risk View</option>
                </select>
              </div>
            </div>

            {/* MODE METRICS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "14px",
                marginBottom: "22px",
              }}
            >
              {modeIntelligence.metrics.map(([label, value, sub], index) => (
                <div
                  key={label}
                  style={{
                    minWidth: 0,
                    padding: "18px",
                    background: "#f7fafc",
                    border: "1px solid #e4ebf1",
                    borderRadius: "13px",
                  }}
                >
                  <div
                    style={{
                      color: "#718096",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "9px",
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: "#172033",
                      fontSize: "23px",
                      fontWeight: 800,
                      lineHeight: 1.15,
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      marginTop: "5px",
                      color: "#8a98a8",
                      fontSize: "11px",
                    }}
                  >
                    {sub}
                  </div>
                </div>
              ))}
            </div>

            {/* KEY FINDINGS + TOPICS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
                gap: "18px",
              }}
            >
              <div
                style={{
                  border: "1px solid #e4ebf1",
                  borderRadius: "14px",
                  padding: "20px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#299bb0",
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                  }}
                >
                  KEY INTELLIGENCE FINDINGS
                </div>

                {executiveInsights.map((insight, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      gap: "11px",
                      padding: "12px 0",
                      borderBottom:
                        index === executiveInsights.length - 1
                          ? "none"
                          : "1px solid #edf1f4",
                      color: "#53657a",
                      fontSize: "14px",
                      lineHeight: 1.55,
                    }}
                  >
                    <span
                      style={{
                        flex: "0 0 24px",
                        width: "24px",
                        height: "24px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background: "#eef8fa",
                        color: "#23879a",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {index + 1}
                    </span>
                    <span>{insight}</span>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px 14px",
                    background: "#f7fafc",
                    borderRadius: "9px",
                    color: "#5d7083",
                    fontSize: "13px",
                    lineHeight: 1.6,
                  }}
                >
                  {modeIntelligence.detail}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e4ebf1",
                  borderRadius: "14px",
                  padding: "20px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#299bb0",
                    letterSpacing: "0.08em",
                    marginBottom: "18px",
                  }}
                >
                  TOPIC IDENTIFICATION
                </div>

                {topicAnalysis.topics.slice(0, 7).map((topic, index) => {
                  const maxScore =
                    topicAnalysis.topics[0]?.score || 1;
                  const width = Math.max(
                    8,
                    (topic.score / maxScore) * 100
                  );

                  return (
                    <div
                      key={topic.name}
                      style={{ marginBottom: "14px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                        }}
                      >
                        <span
                          style={{
                            color: "#27364a",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          {topic.name}
                        </span>
                        <span
                          style={{
                            color: "#8a98a8",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          #{index + 1}
                        </span>
                      </div>

                      <div
                        style={{
                          height: "7px",
                          background: "#e9eef2",
                          borderRadius: "20px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${width}%`,
                            height: "100%",
                            background: "#299bb0",
                            borderRadius: "20px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KEYWORDS */}
            <div
              style={{
                marginTop: "18px",
                border: "1px solid #e4ebf1",
                borderRadius: "14px",
                padding: "20px",
                background: "#fff",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "#299bb0",
                  letterSpacing: "0.08em",
                  marginBottom: "14px",
                }}
              >
                KEYWORD / WORD-CLOUD SIGNALS
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "9px",
                }}
              >
                {topicAnalysis.keywords.map((item, index) => (
                  <span
                    key={`${item.word}-${index}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                      padding: "7px 10px",
                      borderRadius: "8px",
                      background: "#f3f7fa",
                      border: "1px solid #e6edf2",
                      color: index % 3 === 0 ? "#23879a" : "#53657a",
                      fontSize: `${13 + Math.min(item.weight, 7) * 0.7}px`,
                      fontWeight: item.weight >= 4 ? 800 : 600,
                    }}
                  >
                    {item.word}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="generate-section detailed-data-section">

            <p className="eyebrow">
              DETAILED MINING DATA
            </p>

            <h2>
              Mining Records (
              {generatedRecords.length}
              )
            </h2>


            {generatedRecords.length === 0 ? (

              <div className="empty-data">

                No mining records found
                for the selected filters.

              </div>

            ) : (

              <div className="report-table-wrapper">

                <table className="report-table">

                  <thead>

                    <tr>

                      <th>
                        ID
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Mine
                      </th>

                      <th>
                        Seam
                      </th>

                      <th>
                        Thickness
                      </th>

                      <th>
                        Depth
                      </th>

                      <th>
                        Production
                      </th>

                      <th>
                        Recovery
                      </th>

                      <th>
                        Ash
                      </th>

                      <th>
                        Risk
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {generatedRecords.map(
                      (record, index) => {

                        const risk =
                          getRisk(record);

                        return (

                          <tr
                            key={
                              record.id ??
                              `${record.date}-${index}`
                            }
                          >

                            <td className="id-cell">
                              {record.id ??
                                index + 1}
                            </td>


                            <td>
                              {formatDisplayDate(
                                record.date
                              )}
                            </td>


                            <td className="mine-cell">
                              {getMineName(
                                record
                              )}
                            </td>


                            <td>
                              {getSeamName(
                                record
                              )}
                            </td>


                            <td>
                              {getThickness(
                                record
                              ).toFixed(2)} m
                            </td>


                            <td>
                              {getDepth(
                                record
                              ).toFixed(2)} m
                            </td>


                            <td className="production-cell">
                              {getProduction(
                                record
                              ).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </td>


                            <td>
                              {getRecovery(
                                record
                              ).toFixed(2)}%
                            </td>


                            <td>
                              {getAsh(
                                record
                              ).toFixed(2)}%
                            </td>


                            <td>

                              <span
                                className={`risk-badge ${risk.toLowerCase()}`}
                              >
                                {risk}
                              </span>

                            </td>

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </>

      )}

    </div>

  );
}


export default Generate;