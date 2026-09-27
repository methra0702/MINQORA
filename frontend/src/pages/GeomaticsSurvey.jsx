import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const ALIASES = {
  latitude: ["latitude", "lat", "gps_latitude", "gps_lat", "y_lat"],
  longitude: ["longitude", "lon", "lng", "gps_longitude", "gps_lon", "x_lon"],
  easting: ["easting", "east", "utm_easting", "coord_x"],
  northing: ["northing", "north", "utm_northing", "coord_y"],
  elevation: [
    "elevation",
    "elevation_m",
    "rl",
    "reduced_level",
    "ground_elevation",
    "surface_elevation",
  ],
  surveyDate: ["survey_date", "surveyDate", "surveydate", "date", "record_date"],
  pointId: ["point_id", "pointid", "point", "id", "survey_id", "station"],
};

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

function findField(records, aliases) {
  if (!records.length) return null;

  const keys = Object.keys(records[0] || {});
  const normalized = keys.map((key) => ({
    key,
    normalized: normalizeKey(key),
  }));

  for (const alias of aliases) {
    const target = normalizeKey(alias);
    const exact = normalized.find((item) => item.normalized === target);
    if (exact) return exact.key;
  }

  return null;
}

function toNumber(value) {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/,/g, "");

  if (!cleaned) return null;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function percent(value, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(digits)}%`;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i += 1;

      row.push(cell.trim());
      cell = "";

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell.trim());

    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  if (rows.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row.");
  }

  const headers = rows[0].map((header, index) =>
    header || `column_${index + 1}`
  );

  return rows.slice(1).map((values, rowIndex) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    record.__row = rowIndex + 2;
    return record;
  });
}

export default function GeomaticsSurvey() {
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedMine, setSelectedMine] = useState("ALL");
  const [selectedSeam, setSelectedSeam] = useState("ALL");

  const [surveyRecords, setSurveyRecords] = useState([]);
  const [surveyFileName, setSurveyFileName] = useState("");
  const [surveyError, setSurveyError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/mining-data`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not load mining data.");
        }

        setAllRecords(Array.isArray(data.records) ? data.records : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const mines = useMemo(
    () => [
      "ALL",
      ...new Set(
        allRecords
          .map((record) => record.mine_name || record.mine || record.mineName)
          .filter(Boolean)
      ),
    ],
    [allRecords]
  );

  const seams = useMemo(() => {
    const source =
      selectedMine === "ALL"
        ? allRecords
        : allRecords.filter(
            (record) =>
              (record.mine_name || record.mine || record.mineName) ===
              selectedMine
          );

    return [
      "ALL",
      ...new Set(
        source
          .map((record) => record.seam || record.seam_name || record.seamName)
          .filter(Boolean)
      ),
    ];
  }, [allRecords, selectedMine]);

  const filteredMiningRecords = useMemo(
    () =>
      allRecords.filter((record) => {
        const mine = record.mine_name || record.mine || record.mineName;
        const seam = record.seam || record.seam_name || record.seamName;

        return (
          (selectedMine === "ALL" || mine === selectedMine) &&
          (selectedSeam === "ALL" || seam === selectedSeam)
        );
      }),
    [allRecords, selectedMine, selectedSeam]
  );

  const fields = useMemo(
    () => ({
      latitude: findField(surveyRecords, ALIASES.latitude),
      longitude: findField(surveyRecords, ALIASES.longitude),
      easting: findField(surveyRecords, ALIASES.easting),
      northing: findField(surveyRecords, ALIASES.northing),
      elevation: findField(surveyRecords, ALIASES.elevation),
      surveyDate: findField(surveyRecords, ALIASES.surveyDate),
      pointId: findField(surveyRecords, ALIASES.pointId),
    }),
    [surveyRecords]
  );

  const analysis = useMemo(() => {
    const latCount = fields.latitude
      ? surveyRecords.filter((r) => toNumber(r[fields.latitude]) !== null).length
      : 0;

    const lonCount = fields.longitude
      ? surveyRecords.filter((r) => toNumber(r[fields.longitude]) !== null).length
      : 0;

    const eastCount = fields.easting
      ? surveyRecords.filter((r) => toNumber(r[fields.easting]) !== null).length
      : 0;

    const northCount = fields.northing
      ? surveyRecords.filter((r) => toNumber(r[fields.northing]) !== null).length
      : 0;

    const elevationValues = fields.elevation
      ? surveyRecords
          .map((r) => toNumber(r[fields.elevation]))
          .filter((value) => value !== null)
      : [];

    const geographicCoordinates =
      fields.latitude && fields.longitude
        ? surveyRecords.filter(
            (r) =>
              toNumber(r[fields.latitude]) !== null &&
              toNumber(r[fields.longitude]) !== null
          )
        : [];

    const projectedCoordinates =
      fields.easting && fields.northing
        ? surveyRecords.filter(
            (r) =>
              toNumber(r[fields.easting]) !== null &&
              toNumber(r[fields.northing]) !== null
          )
        : [];

    const coordinateRecords = Math.max(
      geographicCoordinates.length,
      projectedCoordinates.length
    );

    const latValues = geographicCoordinates.map((r) =>
      toNumber(r[fields.latitude])
    );
    const lonValues = geographicCoordinates.map((r) =>
      toNumber(r[fields.longitude])
    );

    const eastValues = projectedCoordinates.map((r) =>
      toNumber(r[fields.easting])
    );
    const northValues = projectedCoordinates.map((r) =>
      toNumber(r[fields.northing])
    );

    const hasLatLon = geographicCoordinates.length > 0;
    const hasEastNorth = projectedCoordinates.length > 0;

    return {
      latCount,
      lonCount,
      eastCount,
      northCount,
      coordinateRecords,
      coordinateType: hasLatLon
        ? "Latitude / Longitude"
        : hasEastNorth
        ? "Easting / Northing"
        : "Not detected",
      minLatitude: latValues.length ? Math.min(...latValues) : null,
      maxLatitude: latValues.length ? Math.max(...latValues) : null,
      minLongitude: lonValues.length ? Math.min(...lonValues) : null,
      maxLongitude: lonValues.length ? Math.max(...lonValues) : null,
      minEasting: eastValues.length ? Math.min(...eastValues) : null,
      maxEasting: eastValues.length ? Math.max(...eastValues) : null,
      minNorthing: northValues.length ? Math.min(...northValues) : null,
      maxNorthing: northValues.length ? Math.max(...northValues) : null,
      minElevation: elevationValues.length ? Math.min(...elevationValues) : null,
      maxElevation: elevationValues.length ? Math.max(...elevationValues) : null,
      averageElevation: elevationValues.length
        ? elevationValues.reduce((a, b) => a + b, 0) / elevationValues.length
        : null,
      surveyDateCount: fields.surveyDate
        ? surveyRecords.filter(
            (r) => r[fields.surveyDate] !== null && r[fields.surveyDate] !== ""
          ).length
        : 0,
      hasCoordinates: hasLatLon || hasEastNorth,
    };
  }, [surveyRecords, fields]);

  const handleSurveyUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSurveyError("");
    setSurveyRecords([]);
    setSurveyFileName("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSurveyError("Please upload a CSV survey file in this step.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result || ""));

        setSurveyRecords(parsed);
        setSurveyFileName(file.name);
      } catch (err) {
        setSurveyError(err.message);
      }
    };

    reader.onerror = () => {
      setSurveyError("The survey file could not be read.");
    };

    reader.readAsText(file);
  };

  const clearSurveyData = () => {
    setSurveyRecords([]);
    setSurveyFileName("");
    setSurveyError("");
  };

  const previewRecords = surveyRecords.slice(0, 10);

  const surveyQuality = useMemo(() => {
    const total = surveyRecords.length;

    if (!total) {
      return {
        validCoordinateRows: 0,
        invalidCoordinateRows: 0,
        missingCoordinateRows: 0,
        validElevationRows: 0,
        missingElevationRows: 0,
        completeRows: 0,
        qualityScore: 0,
        coordinateCompleteness: 0,
        elevationCompleteness: 0,
        dateCompleteness: 0,
        status: "WAITING FOR SURVEY DATA",
      };
    }

    let validCoordinateRows = 0;
    let invalidCoordinateRows = 0;
    let missingCoordinateRows = 0;
    let validElevationRows = 0;
    let completeRows = 0;

    surveyRecords.forEach((record) => {
      const hasLatLon = fields.latitude && fields.longitude;
      const hasEastNorth = fields.easting && fields.northing;

      const lat = fields.latitude ? toNumber(record[fields.latitude]) : null;
      const lon = fields.longitude ? toNumber(record[fields.longitude]) : null;
      const east = fields.easting ? toNumber(record[fields.easting]) : null;
      const north = fields.northing ? toNumber(record[fields.northing]) : null;

      const geographicComplete = hasLatLon && lat !== null && lon !== null;
      const projectedComplete = hasEastNorth && east !== null && north !== null;
      const coordinateComplete = geographicComplete || projectedComplete;

      if (coordinateComplete) {
        validCoordinateRows += 1;
      } else {
        const coordinateFieldsExist = Boolean(hasLatLon || hasEastNorth);
        if (coordinateFieldsExist) {
          invalidCoordinateRows += 1;
        } else {
          missingCoordinateRows += 1;
        }
      }

      const elevation = fields.elevation
        ? toNumber(record[fields.elevation])
        : null;

      if (elevation !== null) {
        validElevationRows += 1;
      }

      const dateComplete =
        !fields.surveyDate ||
        String(record[fields.surveyDate] ?? "").trim() !== "";

      if (coordinateComplete && (elevation !== null || !fields.elevation) && dateComplete) {
        completeRows += 1;
      }
    });

    const coordinateCompleteness =
      (validCoordinateRows / total) * 100;
    const elevationCompleteness = fields.elevation
      ? (validElevationRows / total) * 100
      : 0;
    const dateCompleteness = fields.surveyDate
      ? (analysis.surveyDateCount / total) * 100
      : 100;

    const qualityScore =
      coordinateCompleteness * 0.5 +
      elevationCompleteness * 0.3 +
      dateCompleteness * 0.2;

    const status =
      qualityScore >= 95
        ? "HIGH QUALITY"
        : qualityScore >= 80
        ? "GOOD — REVIEW MINOR GAPS"
        : "REVIEW REQUIRED";

    return {
      validCoordinateRows,
      invalidCoordinateRows,
      missingCoordinateRows,
      validElevationRows,
      missingElevationRows: total - validElevationRows,
      completeRows,
      qualityScore,
      coordinateCompleteness,
      elevationCompleteness,
      dateCompleteness,
      status,
    };
  }, [surveyRecords, fields, analysis.surveyDateCount]);

  const surveyExtent = useMemo(() => {
    if (!surveyRecords.length) {
      return {
        horizontal: null,
        vertical: null,
        pointDensity: null,
      };
    }

    if (
      analysis.coordinateType === "Latitude / Longitude" &&
      analysis.minLatitude !== null &&
      analysis.maxLatitude !== null &&
      analysis.minLongitude !== null &&
      analysis.maxLongitude !== null
    ) {
      return {
        horizontal: {
          x: analysis.maxLongitude - analysis.minLongitude,
          y: analysis.maxLatitude - analysis.minLatitude,
          unit: "degrees",
        },
        vertical:
          analysis.minElevation !== null && analysis.maxElevation !== null
            ? analysis.maxElevation - analysis.minElevation
            : null,
        pointDensity: analysis.coordinateRecords,
      };
    }

    if (
      analysis.coordinateType === "Easting / Northing" &&
      analysis.minEasting !== null &&
      analysis.maxEasting !== null &&
      analysis.minNorthing !== null &&
      analysis.maxNorthing !== null
    ) {
      return {
        horizontal: {
          x: analysis.maxEasting - analysis.minEasting,
          y: analysis.maxNorthing - analysis.minNorthing,
          unit: "m",
        },
        vertical:
          analysis.minElevation !== null && analysis.maxElevation !== null
            ? analysis.maxElevation - analysis.minElevation
            : null,
        pointDensity: analysis.coordinateRecords,
      };
    }

    return {
      horizontal: null,
      vertical: null,
      pointDensity: 0,
    };
  }, [surveyRecords, analysis]);


  const geometry = useMemo(() => {
    const points = surveyRecords.map((record, index) => {
      const lat = fields.latitude ? toNumber(record[fields.latitude]) : null;
      const lon = fields.longitude ? toNumber(record[fields.longitude]) : null;
      const east = fields.easting ? toNumber(record[fields.easting]) : null;
      const north = fields.northing ? toNumber(record[fields.northing]) : null;

      const useProjected = east !== null && north !== null;
      const x = useProjected ? east : lon;
      const y = useProjected ? north : lat;

      return {
        id: fields.pointId ? record[fields.pointId] || `P-${index + 1}` : `P-${index + 1}`,
        x,
        y,
        elevation: fields.elevation ? toNumber(record[fields.elevation]) : null,
      };
    }).filter((point) => point.x !== null && point.y !== null);

    if (!points.length) {
      return { points: [], bounds: null, width: null, height: null, area: null, perimeter: null, ready: false };
    }

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;

    return {
      points,
      bounds: { minX, maxX, minY, maxY },
      width,
      height,
      area: width * height,
      perimeter: 2 * (width + height),
      ready: points.length >= 3,
    };
  }, [surveyRecords, fields]);


  const visualization = useMemo(() => {
    const points = geometry.points;

    if (!points.length || !geometry.bounds) {
      return {
        points: [],
        minElevation: null,
        maxElevation: null,
        averageElevation: null,
        hasElevation: false,
      };
    }

    const elevationValues = points
      .map((point) => point.elevation)
      .filter((value) => value !== null);

    const minElevation = elevationValues.length
      ? Math.min(...elevationValues)
      : null;
    const maxElevation = elevationValues.length
      ? Math.max(...elevationValues)
      : null;
    const averageElevation = elevationValues.length
      ? elevationValues.reduce((sum, value) => sum + value, 0) /
        elevationValues.length
      : null;

    const xRange = geometry.bounds.maxX - geometry.bounds.minX || 1;
    const yRange = geometry.bounds.maxY - geometry.bounds.minY || 1;

    const mappedPoints = points.map((point) => {
      const x = 35 + ((point.x - geometry.bounds.minX) / xRange) * 550;
      const y = 265 - ((point.y - geometry.bounds.minY) / yRange) * 230;

      let normalizedElevation = 0.5;

      if (
        point.elevation !== null &&
        minElevation !== null &&
        maxElevation !== null &&
        maxElevation !== minElevation
      ) {
        normalizedElevation =
          (point.elevation - minElevation) /
          (maxElevation - minElevation);
      }

      return {
        ...point,
        x,
        y,
        normalizedElevation,
      };
    });

    return {
      points: mappedPoints,
      minElevation,
      maxElevation,
      averageElevation,
      hasElevation: elevationValues.length > 0,
    };
  }, [geometry]);

  const styles = {
    page: {
      padding: "30px",
      maxWidth: "1400px",
      margin: "0 auto",
    },
    eyebrow: {
      fontSize: "12px",
      letterSpacing: "2px",
      fontWeight: 700,
      margin: 0,
    },
    title: {
      fontSize: "32px",
      margin: "8px 0 6px",
      fontWeight: 800,
    },
    description: {
      margin: 0,
      opacity: 0.68,
      maxWidth: "850px",
      lineHeight: 1.6,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
      gap: "14px",
      marginTop: "22px",
    },
    card: {
      border: "1px solid rgba(127,127,127,.25)",
      borderRadius: "12px",
      padding: "18px",
      background: "rgba(127,127,127,.04)",
    },
    label: {
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "1.2px",
      opacity: 0.62,
      fontWeight: 700,
    },
    value: {
      fontSize: "25px",
      fontWeight: 800,
      marginTop: "8px",
    },
    section: {
      marginTop: "24px",
      border: "1px solid rgba(127,127,127,.25)",
      borderRadius: "14px",
      padding: "20px",
    },
    sectionTitle: {
      margin: "0 0 5px",
      fontSize: "18px",
    },
    sectionText: {
      margin: "0 0 18px",
      opacity: 0.65,
      fontSize: "13px",
    },
    controls: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: "14px",
    },
    select: {
      width: "100%",
      padding: "11px 12px",
      borderRadius: "8px",
      border: "1px solid rgba(127,127,127,.35)",
      background: "transparent",
      fontSize: "14px",
    },
    uploadBox: {
      border: "1px dashed rgba(127,127,127,.45)",
      borderRadius: "12px",
      padding: "24px",
      textAlign: "center",
      background: "rgba(127,127,127,.03)",
    },
    uploadButton: {
      display: "inline-block",
      padding: "11px 16px",
      borderRadius: "8px",
      border: "1px solid rgba(127,127,127,.35)",
      cursor: "pointer",
      fontWeight: 700,
      marginTop: "10px",
    },
    clearButton: {
      padding: "10px 14px",
      borderRadius: "8px",
      border: "1px solid rgba(127,127,127,.35)",
      background: "transparent",
      cursor: "pointer",
      fontWeight: 700,
      marginTop: "12px",
    },
    badge: {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: "999px",
      border: "1px solid rgba(127,127,127,.3)",
      fontSize: "12px",
      fontWeight: 700,
    },
    tableWrap: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "12px",
    },
    th: {
      textAlign: "left",
      padding: "10px",
      borderBottom: "1px solid rgba(127,127,127,.3)",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "10px",
      borderBottom: "1px solid rgba(127,127,127,.16)",
      whiteSpace: "nowrap",
    },
    error: {
      marginTop: "14px",
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid rgba(180,60,60,.35)",
    },
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Geomatics & Survey Intelligence</h1>
        <p>Connecting to MINQORA mining data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <p style={styles.eyebrow}>PHASE 07 · GEOMATICS & SURVEY</p>
        <h1 style={styles.title}>Survey Data Connection</h1>
        <div style={styles.section}>
          <strong>Backend connection error</strong>
          <p>{error}</p>
          <p style={{ opacity: 0.65 }}>
            Make sure the FastAPI backend is running at {API_URL}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <p style={styles.eyebrow}>PHASE 07 · GEOMATICS & SURVEY INTELLIGENCE</p>
      <h1 style={styles.title}>Survey Data Connection</h1>
      <p style={styles.description}>
        Connect real survey observations to MINQORA. The platform analyzes
        coordinates and elevation only when they are supplied by the survey file.
      </p>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Mining Data Connection</h2>
        <p style={styles.sectionText}>
          Existing MINQORA mining records remain available for mine and seam context.
        </p>

        <div style={styles.controls}>
          <div>
            <div style={styles.label}>Mine</div>
            <select
              style={styles.select}
              value={selectedMine}
              onChange={(event) => setSelectedMine(event.target.value)}
            >
              {mines.map((mine) => (
                <option key={mine} value={mine}>
                  {mine}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={styles.label}>Seam</div>
            <select
              style={styles.select}
              value={selectedSeam}
              onChange={(event) => setSelectedSeam(event.target.value)}
            >
              {seams.map((seam) => (
                <option key={seam} value={seam}>
                  {seam}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Matching Mining Records</div>
            <div style={styles.value}>
              {formatNumber(filteredMiningRecords.length, 0)}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Survey Data Input</h2>
        <p style={styles.sectionText}>
          Upload a real CSV survey file. Expected fields can include
          Latitude/Longitude or Easting/Northing, plus Elevation and Survey Date.
        </p>

        <div style={styles.uploadBox}>
          <div style={styles.label}>Survey CSV</div>

          <div style={{ marginTop: "10px", opacity: 0.7 }}>
            {surveyFileName
              ? `Loaded: ${surveyFileName}`
              : "No survey file loaded"}
          </div>

          <label style={styles.uploadButton}>
            Choose Survey CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleSurveyUpload}
              style={{ display: "none" }}
            />
          </label>

          {surveyRecords.length > 0 && (
            <div>
              <button style={styles.clearButton} onClick={clearSurveyData}>
                Clear Survey Data
              </button>
            </div>
          )}
        </div>

        {surveyError && <div style={styles.error}>{surveyError}</div>}
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.label}>Survey Records</div>
          <div style={styles.value}>
            {formatNumber(surveyRecords.length, 0)}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Coordinate Records</div>
          <div style={styles.value}>
            {formatNumber(analysis.coordinateRecords, 0)}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Coordinate Type</div>
          <div style={{ ...styles.value, fontSize: "19px" }}>
            {analysis.coordinateType}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Elevation Records</div>
          <div style={styles.value}>
            {formatNumber(
              fields.elevation ? analysis.averageElevation !== null ? surveyRecords.filter((r) => toNumber(r[fields.elevation]) !== null).length : 0 : 0,
              0
            )}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Coordinate Intelligence</h2>
        <p style={styles.sectionText}>
          MINQORA detects the coordinate system from the uploaded survey columns.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Latitude</div>
            <div style={{ marginTop: 9 }}>
              {fields.latitude || "Not detected"}
            </div>
            <div style={{ marginTop: 8, opacity: 0.65 }}>
              {analysis.latCount} usable values
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Longitude</div>
            <div style={{ marginTop: 9 }}>
              {fields.longitude || "Not detected"}
            </div>
            <div style={{ marginTop: 8, opacity: 0.65 }}>
              {analysis.lonCount} usable values
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Easting</div>
            <div style={{ marginTop: 9 }}>
              {fields.easting || "Not detected"}
            </div>
            <div style={{ marginTop: 8, opacity: 0.65 }}>
              {analysis.eastCount} usable values
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Northing</div>
            <div style={{ marginTop: 9 }}>
              {fields.northing || "Not detected"}
            </div>
            <div style={{ marginTop: 8, opacity: 0.65 }}>
              {analysis.northCount} usable values
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <span style={styles.badge}>
            {analysis.hasCoordinates
              ? "COORDINATES AVAILABLE"
              : "UPLOAD SURVEY COORDINATES"}
          </span>
        </div>

        {analysis.hasCoordinates && (
          <div style={styles.grid}>
            {analysis.coordinateType === "Latitude / Longitude" ? (
              <>
                <div style={styles.card}>
                  <div style={styles.label}>Latitude Range</div>
                  <div style={styles.value}>
                    {formatNumber(analysis.minLatitude, 6)} to{" "}
                    {formatNumber(analysis.maxLatitude, 6)}
                  </div>
                </div>
                <div style={styles.card}>
                  <div style={styles.label}>Longitude Range</div>
                  <div style={styles.value}>
                    {formatNumber(analysis.minLongitude, 6)} to{" "}
                    {formatNumber(analysis.maxLongitude, 6)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={styles.card}>
                  <div style={styles.label}>Easting Range</div>
                  <div style={styles.value}>
                    {formatNumber(analysis.minEasting, 2)} to{" "}
                    {formatNumber(analysis.maxEasting, 2)}
                  </div>
                </div>
                <div style={styles.card}>
                  <div style={styles.label}>Northing Range</div>
                  <div style={styles.value}>
                    {formatNumber(analysis.minNorthing, 2)} to{" "}
                    {formatNumber(analysis.maxNorthing, 2)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Elevation Intelligence</h2>
        <p style={styles.sectionText}>
          Elevation statistics are calculated only from uploaded survey values.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Detected Field</div>
            <div style={{ marginTop: 9 }}>
              {fields.elevation || "Not detected"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Minimum Elevation</div>
            <div style={styles.value}>
              {formatNumber(analysis.minElevation)} m
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Maximum Elevation</div>
            <div style={styles.value}>
              {formatNumber(analysis.maxElevation)} m
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Average Elevation</div>
            <div style={styles.value}>
              {formatNumber(analysis.averageElevation)} m
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>5. Survey Metadata</h2>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Point ID Field</div>
            <div style={{ marginTop: 9 }}>
              {fields.pointId || "Not detected"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Survey Date Field</div>
            <div style={{ marginTop: 9 }}>
              {fields.surveyDate || "Not detected"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Records With Date</div>
            <div style={styles.value}>
              {formatNumber(analysis.surveyDateCount, 0)}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>6. Survey Record Preview</h2>
        <p style={styles.sectionText}>
          First 10 records from the uploaded survey file.
        </p>

        {previewRecords.length === 0 ? (
          <p>No survey records uploaded yet.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Point</th>
                  <th style={styles.th}>Latitude</th>
                  <th style={styles.th}>Longitude</th>
                  <th style={styles.th}>Easting</th>
                  <th style={styles.th}>Northing</th>
                  <th style={styles.th}>Elevation</th>
                  <th style={styles.th}>Survey Date</th>
                </tr>
              </thead>

              <tbody>
                {previewRecords.map((record, index) => (
                  <tr key={record.__row ?? index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>
                      {fields.pointId ? record[fields.pointId] || "—" : "—"}
                    </td>
                    <td style={styles.td}>
                      {fields.latitude ? record[fields.latitude] || "—" : "—"}
                    </td>
                    <td style={styles.td}>
                      {fields.longitude ? record[fields.longitude] || "—" : "—"}
                    </td>
                    <td style={styles.td}>
                      {fields.easting ? record[fields.easting] || "—" : "—"}
                    </td>
                    <td style={styles.td}>
                      {fields.northing ? record[fields.northing] || "—" : "—"}
                    </td>
                    <td style={styles.td}>
                      {fields.elevation ? record[fields.elevation] || "—" : "—"}
                    </td>
                    <td style={styles.td}>
                      {fields.surveyDate ? record[fields.surveyDate] || "—" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>7. Mine Survey Analysis</h2>
        <p style={styles.sectionText}>
          MINQORA validates survey-point completeness and summarizes the spatial
          and elevation coverage of the uploaded observation set.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Valid Coordinate Rows</div>
            <div style={styles.value}>
              {formatNumber(surveyQuality.validCoordinateRows, 0)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Invalid / Incomplete Coordinates</div>
            <div style={styles.value}>
              {formatNumber(
                surveyQuality.invalidCoordinateRows +
                  surveyQuality.missingCoordinateRows,
                0
              )}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Complete Survey Rows</div>
            <div style={styles.value}>
              {formatNumber(surveyQuality.completeRows, 0)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Survey Quality Score</div>
            <div style={styles.value}>
              {percent(surveyQuality.qualityScore)}
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Coordinate Completeness</div>
            <div style={styles.value}>
              {percent(surveyQuality.coordinateCompleteness)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Elevation Completeness</div>
            <div style={styles.value}>
              {fields.elevation
                ? percent(surveyQuality.elevationCompleteness)
                : "FIELD NOT FOUND"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Date Completeness</div>
            <div style={styles.value}>
              {fields.surveyDate
                ? percent(surveyQuality.dateCompleteness)
                : "FIELD NOT FOUND"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Analysis Status</div>
            <div style={{ ...styles.value, fontSize: "17px" }}>
              {surveyQuality.status}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>8. Survey Coverage</h2>
        <p style={styles.sectionText}>
          Coverage is derived from the uploaded coordinates. No mine boundary
          or area is assumed without survey evidence.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Horizontal X Span</div>
            <div style={styles.value}>
              {surveyExtent.horizontal
                ? `${formatNumber(surveyExtent.horizontal.x, 4)} ${surveyExtent.horizontal.unit}`
                : "—"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Horizontal Y Span</div>
            <div style={styles.value}>
              {surveyExtent.horizontal
                ? `${formatNumber(surveyExtent.horizontal.y, 4)} ${surveyExtent.horizontal.unit}`
                : "—"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Elevation Relief</div>
            <div style={styles.value}>
              {surveyExtent.vertical !== null
                ? `${formatNumber(surveyExtent.vertical, 2)} m`
                : "—"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Points Used</div>
            <div style={styles.value}>
              {formatNumber(surveyExtent.pointDensity, 0)}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>9. Survey Quality Checks</h2>
        <p style={styles.sectionText}>
          These checks identify missing or unusable survey values before later
          geometry and visualization stages.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Coordinate Check</div>
            <div style={{ marginTop: 10 }}>
              {surveyQuality.validCoordinateRows === surveyRecords.length &&
              surveyRecords.length > 0
                ? "PASS — ALL COORDINATES USABLE"
                : surveyQuality.validCoordinateRows > 0
                ? "REVIEW — SOME COORDINATES UNUSABLE"
                : "WAITING FOR VALID COORDINATES"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Elevation Check</div>
            <div style={{ marginTop: 10 }}>
              {!fields.elevation
                ? "FIELD NOT DETECTED"
                : surveyQuality.validElevationRows === surveyRecords.length &&
                  surveyRecords.length > 0
                ? "PASS — ELEVATION COMPLETE"
                : surveyQuality.validElevationRows > 0
                ? "REVIEW — ELEVATION GAPS FOUND"
                : "NO VALID ELEVATION VALUES"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Survey Date Check</div>
            <div style={{ marginTop: 10 }}>
              {!fields.surveyDate
                ? "FIELD NOT DETECTED"
                : analysis.surveyDateCount === surveyRecords.length &&
                  surveyRecords.length > 0
                ? "PASS — DATE COMPLETE"
                : analysis.surveyDateCount > 0
                ? "REVIEW — DATE GAPS FOUND"
                : "NO SURVEY DATES FOUND"}
            </div>
          </div>
        </div>
      </div>


      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>10. Pit / Mine Geometry</h2>
        <p style={styles.sectionText}>
          MINQORA creates a transparent survey-coverage geometry from valid
          uploaded points. This is a bounding representation, not a certified
          mine boundary or final pit design.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Valid Geometry Points</div>
            <div style={styles.value}>{formatNumber(geometry.points.length, 0)}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Horizontal Width</div>
            <div style={styles.value}>
              {geometry.width !== null
                ? `${formatNumber(geometry.width, 2)} ${analysis.coordinateType === "Easting / Northing" ? "m" : "deg"}`
                : "—"}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Horizontal Height</div>
            <div style={styles.value}>
              {geometry.height !== null
                ? `${formatNumber(geometry.height, 2)} ${analysis.coordinateType === "Easting / Northing" ? "m" : "deg"}`
                : "—"}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Geometry Readiness</div>
            <div style={{ ...styles.value, fontSize: "16px" }}>
              {geometry.ready ? "READY FOR VISUALIZATION" : "WAITING FOR 3+ VALID POINTS"}
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Bounding Area</div>
            <div style={styles.value}>
              {geometry.area !== null
                ? `${formatNumber(geometry.area, 2)} ${analysis.coordinateType === "Easting / Northing" ? "m²" : "deg²"}`
                : "—"}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Bounding Perimeter</div>
            <div style={styles.value}>
              {geometry.perimeter !== null
                ? `${formatNumber(geometry.perimeter, 2)} ${analysis.coordinateType === "Easting / Northing" ? "m" : "deg"}`
                : "—"}
            </div>
          </div>
        </div>

        {geometry.points.length > 0 && (
          <div style={{ marginTop: "20px", border: "1px solid rgba(127,127,127,.25)", borderRadius: "12px", padding: "16px", overflowX: "auto" }}>
            <div style={styles.label}>Survey Coverage Preview</div>
            <svg viewBox="0 0 620 300" width="100%" height="300" style={{ display: "block", marginTop: "12px" }}>
              <rect x="1" y="1" width="618" height="298" fill="none" stroke="currentColor" opacity="0.25" />
              {geometry.points.map((point) => {
                const minX = geometry.bounds.minX;
                const maxX = geometry.bounds.maxX;
                const minY = geometry.bounds.minY;
                const maxY = geometry.bounds.maxY;
                const px = 30 + ((point.x - minX) / ((maxX - minX) || 1)) * 560;
                const py = 270 - ((point.y - minY) / ((maxY - minY) || 1)) * 240;

                return (
                  <g key={point.id}>
                    <circle cx={px} cy={py} r="4" fill="currentColor" />
                    <text x={px + 7} y={py - 7} fontSize="9" fill="currentColor" opacity="0.7">{point.id}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>11. Geometry Interpretation</h2>
        <p style={styles.sectionText}>
          The displayed geometry represents the spatial extent of the uploaded
          survey observations. It must not be interpreted as a legal boundary,
          pit shell, or certified engineering design.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Boundary Source</div>
            <div style={{ marginTop: 10 }}>Uploaded survey points</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Boundary Method</div>
            <div style={{ marginTop: 10 }}>Survey bounding geometry</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Engineering Boundary</div>
            <div style={{ marginTop: 10 }}>NOT CLAIMED</div>
          </div>
          <div style={styles.card}>
            <div style={styles.label}>Next Phase</div>
            <div style={{ marginTop: 10 }}>Survey Visualization</div>
          </div>
        </div>
      </div>


      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>12. Survey Visualization</h2>
        <p style={styles.sectionText}>
          MINQORA provides a 2D survey-point view using the uploaded coordinate
          observations. Elevation is used as an analytical attribute when it is
          available.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Points Visualized</div>
            <div style={styles.value}>
              {formatNumber(visualization.points.length, 0)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Minimum Elevation</div>
            <div style={styles.value}>
              {visualization.minElevation !== null
                ? `${formatNumber(visualization.minElevation, 2)} m`
                : "—"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Maximum Elevation</div>
            <div style={styles.value}>
              {visualization.maxElevation !== null
                ? `${formatNumber(visualization.maxElevation, 2)} m`
                : "—"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Average Elevation</div>
            <div style={styles.value}>
              {visualization.averageElevation !== null
                ? `${formatNumber(visualization.averageElevation, 2)} m`
                : "—"}
            </div>
          </div>
        </div>

        {visualization.points.length > 0 ? (
          <div
            style={{
              marginTop: "20px",
              border: "1px solid rgba(127,127,127,.25)",
              borderRadius: "12px",
              padding: "16px",
              overflowX: "auto",
            }}
          >
            <div style={styles.label}>2D Survey Point Map</div>

            <svg
              viewBox="0 0 620 300"
              width="100%"
              height="300"
              role="img"
              aria-label="Two dimensional survey point visualization"
              style={{ display: "block", marginTop: "12px" }}
            >
              <rect
                x="1"
                y="1"
                width="618"
                height="298"
                fill="none"
                stroke="currentColor"
                opacity="0.25"
              />

              {visualization.points.length >= 3 && (
                <polygon
                  points={visualization.points
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                  fill="currentColor"
                  fillOpacity="0.06"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                />
              )}

              {visualization.points.map((point) => {
                const radius = point.elevation !== null ? 5 : 4;

                return (
                  <g key={`viz-${point.id}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={radius}
                      fill="currentColor"
                      opacity="0.9"
                    />
                    <text
                      x={point.x + 8}
                      y={point.y - 8}
                      fontSize="9"
                      fill="currentColor"
                      opacity="0.72"
                    >
                      {point.id}
                    </text>
                  </g>
                );
              })}

              <text
                x="310"
                y="290"
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity="0.55"
              >
                X / Easting / Longitude
              </text>

              <text
                x="12"
                y="150"
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity="0.55"
                transform="rotate(-90 12 150)"
              >
                Y / Northing / Latitude
              </text>
            </svg>

            <div
              style={{
                marginTop: "8px",
                fontSize: "11px",
                opacity: 0.62,
              }}
            >
              Each marker represents one valid survey observation. The polygon
              is a visual coverage aid only.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "18px", opacity: 0.65 }}>
            Upload a survey CSV with usable coordinates to generate the map.
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>13. Visualization Readiness</h2>
        <p style={styles.sectionText}>
          This stage prepares the survey dataset for the later 2D/3D
          visualization phase while keeping the source observations traceable.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>2D Point View</div>
            <div style={{ marginTop: 10 }}>
              {visualization.points.length > 0 ? "READY" : "WAITING FOR DATA"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Elevation Attribute</div>
            <div style={{ marginTop: 10 }}>
              {visualization.hasElevation ? "AVAILABLE" : "NOT AVAILABLE"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Source Traceability</div>
            <div style={{ marginTop: 10 }}>
              UPLOADED SURVEY CSV
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Next Phase</div>
            <div style={{ marginTop: 10 }}>
              Visualization & Real 2D/3D Models
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Step 3 Status</h2>
        <p style={styles.sectionText}>
          Survey analysis is now available for the uploaded dataset. Geometry
          generation should only use rows that pass the coordinate checks.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Survey Analysis</div>
            <div style={{ marginTop: 10 }}>
              {surveyRecords.length > 0 ? "COMPLETE" : "WAITING FOR CSV"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Valid Spatial Points</div>
            <div style={{ marginTop: 10 }}>
              {formatNumber(surveyQuality.validCoordinateRows, 0)}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Quality Status</div>
            <div style={{ marginTop: 10 }}>
              {surveyQuality.status}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Next Phase</div>
            <div style={{ marginTop: 10 }}>
              Pit / Mine Geometry
            </div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Step 2 Status</h2>
        <p style={styles.sectionText}>
          Survey data is kept separate from the existing 1,000-record mining
          dataset. No coordinates or elevations are fabricated.
        </p>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.label}>Survey Input</div>
            <div style={{ marginTop: 10 }}>
              {surveyRecords.length > 0 ? "CONNECTED" : "WAITING FOR CSV"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Spatial Analysis</div>
            <div style={{ marginTop: 10 }}>
              {analysis.hasCoordinates ? "READY" : "WAITING FOR COORDINATES"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Elevation Analysis</div>
            <div style={{ marginTop: 10 }}>
              {fields.elevation ? "READY" : "WAITING FOR ELEVATION"}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.label}>Next Phase</div>
            <div style={{ marginTop: 10 }}>
              Mine Survey Analysis
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
