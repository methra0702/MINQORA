import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../App.css";

const API_URL =
  "http://127.0.0.1:8000";


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

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value)
        .split("T")[0];
    }

    return date
      .toISOString()
      .split("T")[0];
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


    lines.push(
      "COMPLETE SOURCE DATA"
    );

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
            normalizeDate(
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
                  {startDate ||
                    "All Dates"}
                </strong>

              </div>


              <div className="report-info-card">

                <span>
                  End Date
                </span>

                <strong>
                  {endDate ||
                    "All Dates"}
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
                              {normalizeDate(
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