import { useEffect, useMemo, useState } from "react";

const DATA_API = "http://127.0.0.1:8000";

const firstValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim().toLowerCase() !== "nan"
    ) {
      return value;
    }
  }
  return "";
};

const numberValue = (...values) => {
  const value = firstValue(...values);

  if (value === "") return null;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
};

const getRawValue = (record, ...keys) => {
  const raw = record?.raw_fields;

  if (!raw || typeof raw !== "object") return "";

  for (const key of keys) {
    if (
      raw[key] !== undefined &&
      raw[key] !== null &&
      String(raw[key]).trim() !== ""
    ) {
      return raw[key];
    }
  }

  // Fuzzy key matching
  const normalizedKeys = Object.keys(raw);

  for (const wanted of keys) {
    const wantedClean = wanted
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const foundKey = normalizedKeys.find((key) => {
      const clean = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      return clean === wantedClean || clean.includes(wantedClean);
    });

    if (foundKey && raw[foundKey] !== undefined && raw[foundKey] !== null) {
      return raw[foundKey];
    }
  }

  return "";
};

const normalizeRecord = (record = {}, index = 0) => {
  const rawMine = getRawValue(
    record,
    "mine",
    "mine_name",
    "mine name",
    "colliery",
    "colliery_name"
  );

  const rawSeam = getRawValue(
    record,
    "seam",
    "seam_name",
    "seam name",
    "coal_seam"
  );

  const rawThickness = getRawValue(
    record,
    "thickness",
    "thickness_m",
    "seam_thickness",
    "seam thickness"
  );

  const rawDepth = getRawValue(
    record,
    "depth",
    "depth_m",
    "mining_depth",
    "depth from surface"
  );

  const rawProduction = getRawValue(
    record,
    "production",
    "production_tonnes",
    "output",
    "production tonnes",
    "production (tonnes)"
  );

  const rawRecovery = getRawValue(
    record,
    "recovery",
    "recovery_pct",
    "recovery_percent",
    "recovery factor"
  );

  const rawAsh = getRawValue(
    record,
    "ash",
    "ash_content",
    "ash_pct",
    "ash_percent",
    "ash content"
  );

  const rawMoisture = getRawValue(
    record,
    "moisture",
    "moisture_pct",
    "moisture_percent"
  );

  const rawYear = getRawValue(
    record,
    "year",
    "date",
    "financial_year",
    "year of reporting"
  );

  const mine = firstValue(
    record.mine_name,
    record.mine,
    record.mineName,
    rawMine
  );

  const seam = firstValue(
    record.seam,
    record.seam_name,
    record.seamName,
    rawSeam
  );

  const sourceUrl = firstValue(
    record.source_url,
    record.sourceUrl,
    record.url
  );

  const sourceChapter = firstValue(
    record.source_chapter,
    record.chapter
  );

  const sourceSheet = firstValue(
    record.source_sheet,
    record.sheet,
    record.table_title
  );

  // Official-source detection
  const sourceText = `${sourceUrl} ${record.source || ""} ${sourceChapter || ""} ${sourceSheet || ""}`.toLowerCase();

  const isOfficial =
    sourceText.includes("coal.gov.in") ||
    sourceText.includes("coal directory") ||
    sourceText.includes("ministry of coal") ||
    sourceText.includes("government");

  return {
    ...record,

    id: firstValue(
      record.id,
      record.record_id,
      index + 1
    ),

    date: firstValue(
      record.date,
      record.record_date,
      record.year,
      rawYear
    ),

    mine_name:
      mine ||
      firstValue(
        record.state,
        record.company,
        "Official Coal Record"
      ),

    seam:
      seam ||
      firstValue(
        record.table_title,
        record.source_sheet,
        record.record_type,
        "Official Record"
      ),

    thickness: numberValue(
      record.thickness,
      record.thickness_m,
      record.seam_thickness,
      rawThickness
    ),

    depth: numberValue(
      record.depth,
      record.depth_m,
      record.mining_depth,
      rawDepth
    ),

    production: numberValue(
      record.production,
      record.production_tonnes,
      record.output,
      rawProduction
    ),

    recovery: numberValue(
      record.recovery,
      record.recovery_pct,
      record.recovery_percent,
      record.recovery_factor,
      rawRecovery
    ),

    ash_content: numberValue(
      record.ash_content,
      record.ash,
      record.ash_pct,
      record.ash_percent,
      rawAsh
    ),

    moisture: numberValue(
      record.moisture,
      record.moisture_pct,
      record.moisture_percent,
      rawMoisture
    ),

    risk_level: firstValue(
      record.risk_level,
      record.risk
    ) || null,

    source_url: sourceUrl,
    source_chapter: sourceChapter,
    source_sheet: sourceSheet,

    // Correct provenance classification
    data_status: isOfficial ? "REAL_SOURCE" : "DEMONSTRATION",
  };
};

const display = (value, suffix = "") => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "N/A";
  }

  return `${value}${suffix}`;
};

function MiningData() {
  const [allRecords, setAllRecords] = useState([]);
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [dateFilter, setDateFilter] = useState("");
  const [mineFilter, setMineFilter] = useState("");
  const [seamFilter, setSeamFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  // ------------------------------------------------------------
  // LOAD OFFICIAL DATA
  // ------------------------------------------------------------

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${DATA_API}/mining-data`
      );

      if (!response.ok) {
        throw new Error(
          `Mining data request failed (${response.status}).`
        );
      }

      const data = await response.json();

      const sourceRecords = Array.isArray(data.records)
        ? data.records
        : [];

      const normalizedRecords = sourceRecords
        .slice(0, 1000)
        .map((record, index) =>
          normalizeRecord(record, index)
        );

      setAllRecords(normalizedRecords);
      setPage(1);

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Could not load mining data."
      );

      setAllRecords([]);
      setRecords([]);

    } finally {
      setLoading(false);
    }
  };

  // Load once
  useEffect(() => {
    loadData();
  }, []);

  // ------------------------------------------------------------
  // FILTER DATA
  // ------------------------------------------------------------

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {

      // Date / year
      if (dateFilter) {
        const searchDate = dateFilter
          .toLowerCase()
          .trim();

        const recordDate = String(
          record.date || ""
        )
          .toLowerCase()
          .trim();

        if (!recordDate.includes(searchDate)) {
          return false;
        }
      }

      // Mine
      if (mineFilter) {
        const mine = String(
          record.mine_name || ""
        ).toLowerCase();

        if (!mine.includes(mineFilter.toLowerCase())) {
          return false;
        }
      }

      // Seam
      if (seamFilter) {
        const seam = String(
          record.seam || ""
        ).toLowerCase();

        if (!seam.includes(seamFilter.toLowerCase())) {
          return false;
        }
      }

      // Risk
      if (riskFilter) {
        const risk = String(
          record.risk_level || ""
        ).toUpperCase();

        if (risk !== riskFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });
  }, [
    allRecords,
    dateFilter,
    mineFilter,
    seamFilter,
    riskFilter
  ]);

  // ------------------------------------------------------------
  // PAGINATION
  // ------------------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRecords.length / pageSize
    )
  );

  const paginatedRecords = useMemo(() => {
    const start =
      (page - 1) * pageSize;

    return filteredRecords.slice(
      start,
      start + pageSize
    );
  }, [
    filteredRecords,
    page,
    pageSize
  ]);

  // Keep page valid after filtering
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------

  const mines = useMemo(() => {
    return [
      ...new Set(
        filteredRecords
          .map((r) => r.mine_name)
          .filter(Boolean)
      )
    ];
  }, [filteredRecords]);

  const sourceCounts = useMemo(() => ({
    real: allRecords.filter(
      (r) =>
        r.data_status === "REAL_SOURCE"
    ).length,

    demo: allRecords.filter(
      (r) =>
        r.data_status === "DEMONSTRATION"
    ).length,

  }), [allRecords]);

  // ------------------------------------------------------------
  // FILTER CONTROLS
  // ------------------------------------------------------------

  const clearFilters = () => {
    setDateFilter("");
    setMineFilter("");
    setSeamFilter("");
    setRiskFilter("");
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
  };

  // ------------------------------------------------------------
  // SOURCE LABEL
  // ------------------------------------------------------------

  const sourceLabel = (record) => {
    if (
      record.data_status ===
      "REAL_SOURCE"
    ) {
      return "OFFICIAL";
    }

    return "DEMO";
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="page">

      {/* HEADER */}

      <div className="page-heading">

        <div>

          <p className="eyebrow">
            DATA CENTER
          </p>

          <h1>
            Mining Data
          </h1>

          <p className="page-description">
            Official coal and mining records used
            across MINQORA intelligence modules.
          </p>

        </div>

        <button
          className="primary-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : "Refresh Data"}
        </button>

      </div>


      {/* SUMMARY */}

      <div
        className="data-summary-grid"
        style={{ marginBottom: 24 }}
      >

        <div className="summary-card">

          <span>
            OFFICIAL SOURCE RECORDS
          </span>

          <strong>
            {sourceCounts.real}
          </strong>

          <small>
            Ministry of Coal / government source-backed records
          </small>

        </div>


        <div className="summary-card">

          <span>
            DEMONSTRATION RECORDS
          </span>

          <strong>
            {sourceCounts.demo}
          </strong>

          <small>
            Prototype records, if any
          </small>

        </div>


        <div className="summary-card">

          <span>
            TOTAL RECORDS
          </span>

          <strong>
            {allRecords.length}
          </strong>

          <small>
            Official records loaded into MINQORA
          </small>

        </div>


        <div className="summary-card">

          <span>
            MINES / SOURCES ON PAGE
          </span>

          <strong>
            {mines.length}
          </strong>

          <small>
            Current filtered dataset
          </small>

        </div>

      </div>


      {/* FILTERS */}

      <section className="filters-panel">

        <input
          type="text"
          placeholder="Year / Date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
        />

        <input
          type="text"
          placeholder="Search mine"
          value={mineFilter}
          onChange={(e) => {
            setMineFilter(e.target.value);
            setPage(1);
          }}
        />

        <input
          type="text"
          placeholder="Search seam"
          value={seamFilter}
          onChange={(e) => {
            setSeamFilter(e.target.value);
            setPage(1);
          }}
        />

        <select
          value={riskFilter}
          onChange={(e) => {
            setRiskFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">
            All Risk Levels
          </option>

          <option value="LOW">
            LOW
          </option>

          <option value="MEDIUM">
            MEDIUM
          </option>

          <option value="HIGH">
            HIGH
          </option>

        </select>

        <button
          className="primary-button"
          onClick={handleSearch}
        >
          Search
        </button>

        <button
          className="secondary-button"
          onClick={clearFilters}
        >
          Clear
        </button>

      </section>


      {/* ERROR */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}


      {/* TABLE */}

      <section className="data-table-container">

        {loading ? (

          <div className="loading-state">
            Loading official mining records...
          </div>

        ) : (

          <table className="mining-table">

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
                <th>Risk</th>
                <th>Source</th>
              </tr>

            </thead>


            <tbody>

              {paginatedRecords.length === 0 ? (

                <tr>

                  <td
                    colSpan="11"
                    className="empty-table"
                  >
                    No mining records found.
                  </td>

                </tr>

              ) : (

                paginatedRecords.map(
                  (record, index) => (

                    <tr
                      key={`${record.id}-${index}`}
                    >

                      <td>
                        {record.id}
                      </td>

                      <td>
                        {display(record.date)}
                      </td>

                      <td>
                        {display(record.mine_name)}
                      </td>

                      <td>
                        {display(record.seam)}
                      </td>

                      <td>
                        {display(record.thickness)}
                      </td>

                      <td>
                        {display(record.depth)}
                      </td>

                      <td>
                        {display(record.production)}
                      </td>

                      <td>
                        {display(
                          record.recovery,
                          "%"
                        )}
                      </td>

                      <td>
                        {display(
                          record.ash_content,
                          "%"
                        )}
                      </td>

                      <td>

                        <span
                          className={`risk-badge ${
                            String(
                              record.risk_level ||
                              "unknown"
                            ).toLowerCase()
                          }`}
                        >
                          {display(
                            record.risk_level
                          )}
                        </span>

                      </td>

                      <td>

                        <span
                          className={`risk-badge ${
                            record.data_status ===
                            "REAL_SOURCE"
                              ? "low"
                              : "medium"
                          }`}
                        >
                          {sourceLabel(record)}
                        </span>

                        {record.source_chapter && (
                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 10,
                              opacity: 0.65
                            }}
                          >
                            Chapter{" "}
                            {record.source_chapter}
                          </div>
                        )}

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        )}

      </section>


      {/* PROVENANCE */}

      <div
        className="data-provenance-note"
        style={{
          marginTop: 14,
          fontSize: 12,
          opacity: 0.8
        }}
      >

        <strong>
          Data provenance:
        </strong>{" "}

        Records marked{" "}
        <strong>OFFICIAL</strong>{" "}
        are loaded from the official Ministry
        of Coal Coal Directory source package.
        MINQORA does not fabricate missing
        geological or mining values; unavailable
        fields are displayed as N/A.

      </div>


      {/* PAGINATION */}

      <div className="pagination">

        <button
          disabled={page <= 1}
          onClick={() =>
            setPage((p) => p - 1)
          }
        >
          Previous
        </button>

        <span>
          Page {page} of {totalPages}
          {" "}•{" "}
          {filteredRecords.length} records
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() =>
            setPage((p) => p + 1)
          }
        >
          Next
        </button>

      </div>

    </div>
  );
}

export default MiningData;