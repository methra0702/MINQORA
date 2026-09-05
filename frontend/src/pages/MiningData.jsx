import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function MiningData() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
  });

  const [dateFilter, setDateFilter] = useState("");
  const [mineFilter, setMineFilter] = useState("");
  const [seamFilter, setSeamFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  const loadMiningData = async (
    requestedPage = 1,
    filters = {
      date: dateFilter,
      mine: mineFilter,
      seam: seamFilter,
      risk: riskFilter,
    }
  ) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: requestedPage,
        limit: 25,
      });

      if (filters.date) {
        params.append("date", filters.date);
      }

      if (filters.mine) {
        params.append("mine_name", filters.mine);
      }

      if (filters.seam) {
        params.append("seam", filters.seam);
      }

      if (filters.risk) {
        params.append("risk_level", filters.risk);
      }

      const response = await fetch(
        `${API_URL}/mining-data?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Could not load mining data.");
      }

      const data = await response.json();

      setRecords(data.records || []);

      setPagination(
        data.pagination || {
          page: requestedPage,
          total: 0,
          total_pages: 1,
        }
      );

      setPage(requestedPage);
    } catch (err) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMiningData(1);
  }, []);

  const applyFilters = () => {
    loadMiningData(1);
  };

  const clearFilters = () => {
    const emptyFilters = {
      date: "",
      mine: "",
      seam: "",
      risk: "",
    };

    setDateFilter("");
    setMineFilter("");
    setSeamFilter("");
    setRiskFilter("");

    loadMiningData(1, emptyFilters);
  };

  const deleteRecord = async (id) => {
    const confirmed = window.confirm(
      "Delete this mining record?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/mining-data/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Could not delete record.");
      }

      loadMiningData(page);
    } catch (err) {
      alert(err.message);
    }
  };

  const refreshData = () => {
    loadMiningData(page);
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA CENTER</p>

          <h1>Mining Data</h1>

          <p className="page-description">
            Historical and operational mining records
            used by MINQORA Brain 1.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={refreshData}
        >
          Refresh Data
        </button>
      </div>

      <section className="filters-panel">
        <input
          type="date"
          value={dateFilter}
          onChange={(event) =>
            setDateFilter(event.target.value)
          }
        />

        <input
          type="text"
          placeholder="Search mine"
          value={mineFilter}
          onChange={(event) =>
            setMineFilter(event.target.value)
          }
        />

        <input
          type="text"
          placeholder="Search seam"
          value={seamFilter}
          onChange={(event) =>
            setSeamFilter(event.target.value)
          }
        />

        <select
          value={riskFilter}
          onChange={(event) =>
            setRiskFilter(event.target.value)
          }
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
          onClick={applyFilters}
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

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <section className="data-table-container">
        {loading ? (
          <div className="loading-state">
            Loading mining records...
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
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan="11"
                    className="empty-table"
                  >
                    No mining records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.id}</td>

                    <td>{record.date}</td>

                    <td>{record.mine_name}</td>

                    <td>{record.seam}</td>

                    <td>
                      {Number(
                        record.thickness || 0
                      ).toFixed(2)}
                    </td>

                    <td>
                      {Number(
                        record.depth || 0
                      ).toFixed(2)}
                    </td>

                    <td>
                      {Number(
                        record.production || 0
                      ).toLocaleString()}
                    </td>

                    <td>
                      {Number(
                        record.recovery || 0
                      ).toFixed(2)}
                      %
                    </td>

                    <td>
                      {Number(
                        record.ash_content || 0
                      ).toFixed(2)}
                      %
                    </td>

                    <td>
                      <span
                        className={`risk-badge ${String(
                          record.risk_level || ""
                        ).toLowerCase()}`}
                      >
                        {record.risk_level}
                      </span>
                    </td>

                    <td>
                      <button
                        className="remove-button"
                        onClick={() =>
                          deleteRecord(record.id)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      <div className="pagination">
        <button
          disabled={page <= 1}
          onClick={() =>
            loadMiningData(page - 1)
          }
        >
          Previous
        </button>

        <span>
          Page {pagination.page || page} of{" "}
          {pagination.total_pages || 1}
        </span>

        <button
          disabled={
            page >=
            (pagination.total_pages || 1)
          }
          onClick={() =>
            loadMiningData(page + 1)
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}