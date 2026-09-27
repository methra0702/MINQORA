import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8002";

// MINQORA planning assumptions used only for scenario calculations.
const PLANNING_STRIPPING_RATIO = 2.75;
const PLANNING_RECOVERY_PERCENT = 85;
const PLANNING_OB_DENSITY_T_PER_M3 = 2.2;

/* ============================================================
   NUMBER FORMATTER
   ============================================================ */

function formatNumber(value, decimals = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = `
  .md-page {
    width: 100%;
    color: #172033;
  }

  .md-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 30px;
    margin-bottom: 30px;
  }

  .md-eyebrow {
    margin: 0 0 10px;
    color: #2799b1;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 3px;
  }

  .md-header h1 {
    margin: 0;
    color: #10233d;
    font-size: 42px;
    line-height: 1.1;
    font-weight: 800;
  }

  .md-description {
    max-width: 900px;
    margin: 14px 0 0;
    color: #64748b;
    font-size: 17px;
    line-height: 1.7;
  }

  .md-online {
    min-width: 210px;
    padding: 14px 20px;
    border: 1px solid #b8efd8;
    border-radius: 30px;
    background: #effcf6;
    color: #13804d;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .md-online-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #31c48d;
  }

  .md-section {
    margin-bottom: 24px;
    padding: 26px;
    border: 1px solid #dfe7ee;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 3px 12px rgba(16, 35, 61, 0.035);
  }

  .md-section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 22px;
  }

  .md-section-title {
    margin: 0;
    color: #10233d;
    font-size: 25px;
    font-weight: 800;
  }

  .md-helper {
    max-width: 850px;
    margin: 7px 0 0;
    color: #718096;
    font-size: 13px;
    line-height: 1.6;
  }

  .md-status {
    padding: 9px 14px;
    border-radius: 20px;
    background: #eef8fb;
    color: #238ca3;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .md-status-good {
    background: #effcf6;
    color: #16804f;
    border: 1px solid #b8efd8;
  }

  .md-status-warning {
    background: #fff9e9;
    color: #856404;
    border: 1px solid #f4d58b;
  }

  .md-grid-4 {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .md-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .md-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .md-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .md-field label {
    color: #52657b;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .md-field input,
  .md-field select {
    width: 100%;
    min-height: 46px;
    box-sizing: border-box;
    padding: 0 13px;
    border: 1px solid #cbd5df;
    border-radius: 9px;
    background: #ffffff;
    color: #172033;
    font-size: 14px;
    outline: none;
  }

  .md-field input:focus,
  .md-field select:focus {
    border-color: #3c9db1;
    box-shadow: 0 0 0 3px rgba(60, 157, 177, 0.12);
  }

  .md-readonly {
    min-height: 46px;
    box-sizing: border-box;
    padding: 13px;
    border: 1px solid #e0e7ed;
    border-radius: 9px;
    background: #f8fafc;
    color: #253448;
    font-size: 14px;
    font-weight: 700;
  }

  .md-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .md-button {
    min-height: 44px;
    padding: 0 18px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .md-button-primary {
    border: 1px solid #2f94aa;
    background: #2f94aa;
    color: #ffffff;
  }

  .md-button-primary:hover {
    background: #247f93;
  }

  .md-button-secondary {
    border: 1px solid #cbd5df;
    background: #ffffff;
    color: #253448;
  }

  .md-button-secondary:hover {
    border-color: #3c9db1;
    color: #247f93;
  }

  .md-metric {
    min-height: 125px;
    padding: 20px;
    border: 1px solid #dfe7ee;
    border-radius: 13px;
    background: #f9fbfc;
    box-sizing: border-box;
  }

  .md-metric span {
    display: block;
    margin-bottom: 12px;
    color: #6f8194;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1.3px;
  }

  .md-metric strong {
    display: block;
    color: #10233d;
    font-size: 27px;
    line-height: 1.15;
  }

  .md-metric small {
    display: block;
    margin-top: 9px;
    color: #8a98a7;
    font-size: 11px;
    line-height: 1.4;
  }

  .md-comparison,
  .schedule-scroll {
    overflow-x: auto;
  }

  .md-table,
  .schedule-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 750px;
  }

  .md-table th,
  .schedule-table th {
    padding: 15px;
    border-bottom: 1px solid #dfe7ee;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
    text-align: left;
  }

  .md-table td,
  .schedule-table td {
    padding: 15px;
    border-bottom: 1px solid #edf1f4;
    color: #253448;
    font-size: 13px;
  }

  .md-table td strong,
  .schedule-table td strong {
    color: #10233d;
  }

  .md-improvement {
    color: #16804f !important;
    font-weight: 900;
  }

  .md-neutral {
    color: #66778a !important;
  }

  .md-warning {
    margin-bottom: 20px;
    padding: 14px 16px;
    border: 1px solid #f4d58b;
    border-radius: 10px;
    background: #fff9e9;
    color: #856404;
    font-size: 13px;
    line-height: 1.6;
  }

  .md-success {
    padding: 14px 16px;
    border: 1px solid #b8efd8;
    border-radius: 10px;
    background: #effcf6;
    color: #176b49;
    font-size: 13px;
    line-height: 1.6;
  }

  .md-warning-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .md-warning-item {
    padding: 13px 15px;
    border-left: 4px solid #e3a52d;
    border-radius: 7px;
    background: #fff9e9;
    color: #765b1b;
    font-size: 13px;
    line-height: 1.5;
  }

  .md-method {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 30px;
  }

  .md-method p {
    margin: 0;
    padding: 12px 0;
    border-bottom: 1px solid #edf1f4;
    color: #5d7085;
    font-size: 13px;
    line-height: 1.6;
  }

  .md-method strong {
    color: #253448;
  }

  .md-note {
    margin-top: 18px;
    padding: 14px 16px;
    border: 1px solid #dfe7ee;
    border-radius: 10px;
    background: #f8fafc;
    color: #687a8e;
    font-size: 12px;
    line-height: 1.6;
  }

  .schedule-table {
    min-width: 1050px;
  }

  .schedule-table th {
    padding: 14px 12px;
    background: #f8fafc;
    font-size: 10px;
  }

  .schedule-table td {
    padding: 13px 12px;
  }

  .schedule-total td {
    background: #f8fafc;
    color: #10233d;
    font-weight: 900;
  }

  .schedule-progress {
    width: 130px;
    height: 7px;
    overflow: hidden;
    border-radius: 10px;
    background: #e8eef2;
  }

  .schedule-progress-bar {
    height: 100%;
    border-radius: 10px;
    background: #48a6b8;
  }

  .quarter-card {
    padding: 20px;
    border: 1px solid #dfe7ee;
    border-radius: 13px;
    background: #f9fbfc;
  }

  .quarter-card h3 {
    margin: 0 0 12px;
    color: #10233d;
    font-size: 15px;
  }

  .quarter-value {
    margin: 0;
    color: #10233d;
    font-size: 27px;
    font-weight: 800;
  }

  .quarter-label {
    margin-top: 5px;
    color: #7a8998;
    font-size: 11px;
  }

  /* ==========================================================
     STEP 7 PROGRESS STYLES
     ========================================================== */

  .progress-container {
    margin-top: 22px;
    padding: 20px;
    border: 1px solid #dfe7ee;
    border-radius: 13px;
    background: #f8fafc;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 12px;
  }

  .progress-title {
    color: #52657b;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .progress-percent {
    color: #10233d;
    font-size: 22px;
    font-weight: 900;
  }

  .progress-track {
    width: 100%;
    height: 14px;
    overflow: hidden;
    border-radius: 20px;
    background: #e6edf2;
  }

  .progress-fill {
    height: 100%;
    border-radius: 20px;
    background: #3c9db1;
    transition: width 0.3s ease;
  }

  .progress-caption {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-top: 10px;
    color: #7a8998;
    font-size: 11px;
  }

  .quarter-progress {
    margin-top: 15px;
  }

  .quarter-progress-row {
    display: grid;
    grid-template-columns: 45px 1fr 110px;
    align-items: center;
    gap: 12px;
    margin-bottom: 13px;
  }

  .quarter-progress-label {
    color: #52657b;
    font-size: 12px;
    font-weight: 900;
  }

  .quarter-progress-track {
    height: 8px;
    overflow: hidden;
    border-radius: 10px;
    background: #e6edf2;
  }

  .quarter-progress-fill {
    height: 100%;
    border-radius: 10px;
    background: #7896a5;
  }

  .quarter-progress-value {
    color: #5d7085;
    font-size: 11px;
    text-align: right;
  }

  .forecast-box {
    margin-top: 20px;
    padding: 18px;
    border: 1px solid #dfe7ee;
    border-radius: 12px;
    background: #ffffff;
  }

  .forecast-title {
    margin-bottom: 7px;
    color: #52657b;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .forecast-text {
    margin: 0;
    color: #253448;
    font-size: 14px;
    line-height: 1.6;
  }

  @media (max-width: 1100px) {
    .md-grid-4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .md-grid-3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 750px) {
    .md-header,
    .md-section-header {
      flex-direction: column;
    }

    .md-grid-4,
    .md-grid-3,
    .md-grid-2,
    .md-method {
      grid-template-columns: 1fr;
    }

    .quarter-progress-row {
      grid-template-columns: 40px 1fr;
    }

    .quarter-progress-value {
      grid-column: 2;
      text-align: left;
    }

    .md-header h1 {
      font-size: 32px;
    }

    .md-section {
      padding: 20px;
    }

    .md-online {
      width: 100%;
      box-sizing: border-box;
    }
  }
`;

/* ============================================================
   COMPONENT
   ============================================================ */

function MineDesignOptimization() {
  const [records, setRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  const [mine, setMine] = useState("");
  const [seam, setSeam] = useState("");

  /* ==========================================================
     BASE DESIGN
     ========================================================== */

  const [inputs, setInputs] = useState({
    miningArea: 0,
    seamThickness: 0,
    miningDepth: 0,
    benchHeight: 10,
    benchWidth: 25,
    productionTarget: 0,
    workingDays: 300,
    recoveryFactor: 0,
    overburden: 0,
  });

  /* ==========================================================
     OPTIMIZATION
     ========================================================== */

  const [optimization, setOptimization] = useState({
    benchHeight: 8,
    benchWidth: 30,
    productionTarget: 0,
    recoveryFactor: PLANNING_RECOVERY_PERCENT,
  });

  /* ==========================================================
     EQUIPMENT
     ========================================================== */

  const [equipment, setEquipment] = useState({
    truckPayload: 60,
    truckCount: 10,
    loadingTime: 4,
    unloadingTime: 2,
    equipmentUtilization: 80,
    operatingHoursPerDay: 20,
    loadedSpeed: 25,
    emptySpeed: 35,
    haulDistance: 5,
    delayTime: 3,
  });

  /* ==========================================================
     SCHEDULE
     ========================================================== */

  const [scheduleSettings, setScheduleSettings] =
    useState({
      scheduleYear: new Date().getFullYear(),
      startMonth: 1,
      rampUpPercent: 100,
    });

  /* ==========================================================
     LOAD DATA
     ========================================================== */

  useEffect(() => {
    async function loadCMPDIData() {
      try {
        setLoadingData(true);

        const response = await fetch(
          `${API_URL}/cmpdi/multi-mine/all`
        );

        if (!response.ok) {
          throw new Error(
            `CMPDI server returned ${response.status}`
          );
        }

        const data = await response.json();

        const loadedMines = Array.isArray(data?.mines)
          ? data.mines
          : Array.isArray(data)
          ? data
          : [];

        /*
         * Convert the source-traceable CMPDI mine package into the
         * lightweight records expected by the existing design UI.
         *
         * IMPORTANT:
         * - We only map values that actually exist in the CMPDI package.
         * - We do not invent production, recovery, haulage, density,
         *   coordinates or other engineering measurements.
         * - Seam-level thickness/depth values are preserved as ranges
         *   where available.
         */
        const loadedRecords = [];

        loadedMines.forEach((mineRecord) => {
          const mineName =
            mineRecord.name ??
            mineRecord.mine ??
            mineRecord.mine_name ??
            "Unknown Mine";

          const seams = Array.isArray(mineRecord.seams)
            ? mineRecord.seams
            : Array.isArray(mineRecord.seam_data)
            ? mineRecord.seam_data
            : [];

          if (seams.length) {
            seams.forEach((seamRecord, index) => {
              const thicknessMin = Number(
                seamRecord.thickness_min_m ??
                seamRecord.thicknessMinM ??
                seamRecord.thickness_min ??
                NaN
              );

              const thicknessMax = Number(
                seamRecord.thickness_max_m ??
                seamRecord.thicknessMaxM ??
                seamRecord.thickness_max ??
                NaN
              );

              const depthMin = Number(
                seamRecord.depth_min_m ??
                seamRecord.depthMinM ??
                seamRecord.depth_min ??
                NaN
              );

              const depthMax = Number(
                seamRecord.depth_max_m ??
                seamRecord.depthMaxM ??
                seamRecord.depth_max ??
                NaN
              );

              const thickness =
                Number.isFinite(thicknessMin) &&
                Number.isFinite(thicknessMax)
                  ? (thicknessMin + thicknessMax) / 2
                  : Number.isFinite(thicknessMin)
                  ? thicknessMin
                  : Number.isFinite(thicknessMax)
                  ? thicknessMax
                  : null;

              const depth =
                Number.isFinite(depthMin) &&
                Number.isFinite(depthMax)
                  ? (depthMin + depthMax) / 2
                  : Number.isFinite(depthMin)
                  ? depthMin
                  : Number.isFinite(depthMax)
                  ? depthMax
                  : null;

              loadedRecords.push({
                id: `${mineName}-seam-${index + 1}`,
                mine_name: mineName,
                prc_mtpa: Number.isFinite(Number(mineRecord?.block?.prc_mtpa))
                  ? Number(mineRecord.block.prc_mtpa)
                  : null,
                area_km2: Number.isFinite(Number(mineRecord?.block?.area_km2))
                  ? Number(mineRecord.block.area_km2)
                  : null,
                geological_resource_mt: Number.isFinite(Number(mineRecord?.block?.geological_resource_mt))
                  ? Number(mineRecord.block.geological_resource_mt)
                  : null,
                grade: mineRecord?.block?.grade ?? null,
                seam:
                  seamRecord.seam ??
                  seamRecord.name ??
                  seamRecord.seam_name ??
                  `Seam ${index + 1}`,
                thickness,
                thickness_min_m: Number.isFinite(thicknessMin)
                  ? thicknessMin
                  : null,
                thickness_max_m: Number.isFinite(thicknessMax)
                  ? thicknessMax
                  : null,
                depth,
                depth_min_m: Number.isFinite(depthMin)
                  ? depthMin
                  : null,
                depth_max_m: Number.isFinite(depthMax)
                  ? depthMax
                  : null,
                source_id:
                  seamRecord.source_id ??
                  mineRecord.source_id ??
                  null,
                source_year:
                  seamRecord.year ??
                  seamRecord.source_year ??
                  mineRecord.year ??
                  null,
              });
            });
          } else {
            /*
             * Keep mines without public seam-level data selectable.
             * Geological/design fields remain null rather than fabricated.
             */
            loadedRecords.push({
              id: `${mineName}-mine`,
              mine_name: mineName,
              prc_mtpa: Number.isFinite(Number(mineRecord?.block?.prc_mtpa))
                ? Number(mineRecord.block.prc_mtpa)
                : null,
              area_km2: Number.isFinite(Number(mineRecord?.block?.area_km2))
                ? Number(mineRecord.block.area_km2)
                : null,
              geological_resource_mt: Number.isFinite(Number(mineRecord?.block?.geological_resource_mt))
                ? Number(mineRecord.block.geological_resource_mt)
                : null,
              grade: mineRecord?.block?.grade ?? null,
              seam: "Mine-level data",
              thickness: null,
              depth: null,
              source_id: mineRecord.source_id ?? null,
              source_year: mineRecord.year ?? null,
            });
          }
        });

        setRecords(loadedRecords);
        setDataError("");
      } catch (error) {
        console.error(error);

        setDataError(
          "Real CMPDI data could not be loaded. Manual planning inputs remain available."
        );
      } finally {
        setLoadingData(false);
      }
    }

    loadCMPDIData();
  }, []);

  /* ==========================================================
     NORMALIZE RECORDS
     ========================================================== */

  const normalizedRecords = useMemo(() => {
    return records.map((record, index) => ({
      ...record,

      _id: record.id ?? index,

      _mine:
        record.mine_name ??
        record.mine ??
        record.mineName ??
        "Unknown Mine",

      _seam:
        record.seam ??
        record.seam_name ??
        record.seamName ??
        "Unknown Seam",

      _thickness: Number(
        record.thickness ??
          record.thickness_m ??
          record.seam_thickness ??
          0
      ),

      _depth: Number(
        record.depth ??
          record.depth_m ??
          record.mining_depth ??
          0
      ),
    }));
  }, [records]);

  /* ==========================================================
     OPTIONS
     ========================================================== */

  const mineOptions = useMemo(() => {
    return [
      ...new Set(
        normalizedRecords.map(
          (record) => record._mine
        )
      ),
    ]
      .filter(Boolean)
      .sort();
  }, [normalizedRecords]);

  const seamOptions = useMemo(() => {
    const filtered = mine
      ? normalizedRecords.filter(
          (record) =>
            record._mine === mine
        )
      : normalizedRecords;

    return [
      ...new Set(
        filtered.map(
          (record) => record._seam
        )
      ),
    ]
      .filter(Boolean)
      .sort();
  }, [normalizedRecords, mine]);

  const selectedRecords = useMemo(() => {
    return normalizedRecords.filter(
      (record) => {
        const mineMatch = mine
          ? record._mine === mine
          : true;

        const seamMatch = seam
          ? record._seam === seam
          : true;

        return mineMatch && seamMatch;
      }
    );
  }, [normalizedRecords, mine, seam]);

  /* ==========================================================
     SELECTED DATA SUMMARY
     ========================================================== */

  const selectedDataSummary = useMemo(() => {
    if (!selectedRecords.length) {
      return {
        count: 0,
        averageThickness: null,
        averageDepth: null,
        prcMtpa: null,
        areaKm2: null,
        resourceMt: null,
        grade: null,
      };
    }

    const thicknessValues =
      selectedRecords
        .map(
          (record) =>
            record._thickness
        )
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        );

    const depthValues =
      selectedRecords
        .map(
          (record) =>
            record._depth
        )
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        );

    const average = (values) =>
      values.length
        ? values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / values.length
        : null;

    const firstWithCapacity =
      selectedRecords.find((record) =>
        Number.isFinite(Number(record.prc_mtpa)) &&
        Number(record.prc_mtpa) > 0
      );

    const firstWithArea =
      selectedRecords.find((record) =>
        Number.isFinite(Number(record.area_km2)) &&
        Number(record.area_km2) > 0
      );

    const firstWithResource =
      selectedRecords.find((record) =>
        Number.isFinite(Number(record.geological_resource_mt)) &&
        Number(record.geological_resource_mt) > 0
      );

    return {
      count: selectedRecords.length,
      averageThickness:
        average(thicknessValues),
      averageDepth:
        average(depthValues),
      prcMtpa: firstWithCapacity
        ? Number(firstWithCapacity.prc_mtpa)
        : null,
      areaKm2: firstWithArea
        ? Number(firstWithArea.area_km2)
        : null,
      resourceMt: firstWithResource
        ? Number(firstWithResource.geological_resource_mt)
        : null,
      grade: selectedRecords.find((record) => record.grade)?.grade ?? null,
    };
  }, [selectedRecords]);

  /* ==========================================================
     SCENARIO CALCULATION
     ========================================================== */

  function calculateScenario(values) {
    const depth =
      Number(values.miningDepth) || 0;

    const benchHeight =
      Number(values.benchHeight) || 0;

    const productionTarget =
      Number(values.productionTarget) || 0;

    const workingDays =
      Number(values.workingDays) || 0;

    const area =
      Number(values.miningArea) || 0;

    const thickness =
      Number(values.seamThickness) || 0;

    const recovery =
      Number(values.recoveryFactor) || 0;

    const overburdenValue =
      Number(values.overburden);

    const hasOverburden =
      Number.isFinite(overburdenValue) &&
      overburdenValue > 0;

    const benchCount =
      benchHeight > 0
        ? Math.ceil(
            depth / benchHeight
          )
        : 0;

    const annualProduction =
      productionTarget *
      workingDays;

    const materialVolume =
      area * thickness;

    const recoverableVolume =
      materialVolume *
      (recovery / 100);

    const strippingRatio =
      hasOverburden && thickness > 0
        ? overburdenValue / thickness
        : thickness > 0
        ? PLANNING_STRIPPING_RATIO
        : null;

    return {
      benchCount,
      annualProduction,
      materialVolume,
      recoverableVolume,
      strippingRatio,
      dailyProduction:
        productionTarget,
    };
  }

  const baseScenario = useMemo(
    () => calculateScenario(inputs),
    [inputs]
  );

  const optimizedValues = useMemo(
    () => ({
      ...inputs,
      benchHeight:
        Number(
          optimization.benchHeight
        ),
      benchWidth:
        Number(
          optimization.benchWidth
        ),
      productionTarget:
        Number(
          optimization.productionTarget
        ),
      recoveryFactor:
        Number(
          optimization.recoveryFactor
        ),
    }),
    [inputs, optimization]
  );

  const optimizedScenario = useMemo(
    () =>
      calculateScenario(
        optimizedValues
      ),
    [optimizedValues]
  );

  /* ==========================================================
     HAULAGE ENGINE
     ========================================================== */

  const haulage = useMemo(() => {
    const payload =
      Number(
        equipment.truckPayload
      ) || 0;

    const truckCount =
      Number(
        equipment.truckCount
      ) || 0;

    const loadingTime =
      Number(
        equipment.loadingTime
      ) || 0;

    const unloadingTime =
      Number(
        equipment.unloadingTime
      ) || 0;

    const utilization =
      Number(
        equipment.equipmentUtilization
      ) || 0;

    const operatingHours =
      Number(
        equipment.operatingHoursPerDay
      ) || 0;

    const loadedSpeed =
      Number(
        equipment.loadedSpeed
      ) || 0;

    const emptySpeed =
      Number(
        equipment.emptySpeed
      ) || 0;

    const distance =
      Number(
        equipment.haulDistance
      ) || 0;

    const delay =
      Number(
        equipment.delayTime
      ) || 0;

    const loadedTravelMinutes =
      loadedSpeed > 0
        ? (distance / loadedSpeed) *
          60
        : 0;

    const emptyTravelMinutes =
      emptySpeed > 0
        ? (distance / emptySpeed) *
          60
        : 0;

    const cycleTime =
      loadingTime +
      loadedTravelMinutes +
      unloadingTime +
      emptyTravelMinutes +
      delay;

    const cyclesPerHour =
      cycleTime > 0
        ? 60 / cycleTime
        : 0;

    const effectiveCyclesPerHour =
      cyclesPerHour *
      (utilization / 100);

    const productionPerTruckPerHour =
      payload *
      effectiveCyclesPerHour;

    const productionPerTruckPerDay =
      productionPerTruckPerHour *
      operatingHours;

    const fleetCapacityPerHour =
      productionPerTruckPerHour *
      truckCount;

    const fleetCapacityPerDay =
      productionPerTruckPerDay *
      truckCount;

    const targetDailyProduction =
      Number(
        inputs.productionTarget
      ) || 0;

    const requiredTrucks =
      productionPerTruckPerDay > 0
        ? Math.ceil(
            targetDailyProduction /
              productionPerTruckPerDay
          )
        : 0;

    const capacityMargin =
      targetDailyProduction > 0
        ? (
            (
              fleetCapacityPerDay -
              targetDailyProduction
            ) /
            targetDailyProduction
          ) * 100
        : 0;

    const capacityUtilization =
      targetDailyProduction > 0
        ? (
            fleetCapacityPerDay /
            targetDailyProduction
          ) * 100
        : 0;

    return {
      loadedTravelMinutes,
      emptyTravelMinutes,
      cycleTime,
      cyclesPerHour,
      effectiveCyclesPerHour,
      productionPerTruckPerHour,
      productionPerTruckPerDay,
      fleetCapacityPerHour,
      fleetCapacityPerDay,
      targetDailyProduction,
      requiredTrucks,
      capacityMargin,
      capacityUtilization,
    };
  }, [
    equipment,
    inputs.productionTarget,
  ]);

  const additionalTrucksRequired =
    Math.max(
      0,
      haulage.requiredTrucks -
        Number(
          equipment.truckCount || 0
        )
    );

  /* ==========================================================
     OPTIMIZATION METRICS
     ========================================================== */

  const productionImprovement =
    baseScenario.annualProduction > 0
      ? (
          (
            optimizedScenario.annualProduction -
            baseScenario.annualProduction
          ) /
          baseScenario.annualProduction
        ) * 100
      : 0;

  const volumeImprovement =
    baseScenario.recoverableVolume > 0
      ? (
          (
            optimizedScenario.recoverableVolume -
            baseScenario.recoverableVolume
          ) /
          baseScenario.recoverableVolume
        ) * 100
      : 0;

  const benchChange =
    optimizedScenario.benchCount -
    baseScenario.benchCount;

  const strippingChange =
    optimizedScenario.strippingRatio != null &&
    baseScenario.strippingRatio != null
      ? optimizedScenario.strippingRatio - baseScenario.strippingRatio
      : null;

  /* ==========================================================
     SCHEDULE
     ========================================================== */

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const daysInMonth = [
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const schedule = useMemo(() => {
    const target =
      Number(
        inputs.productionTarget
      ) || 0;

    const workingDays =
      Number(
        inputs.workingDays
      ) || 0;

    const rampUp =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            scheduleSettings.rampUpPercent
          ) || 100
        )
      ) / 100;

    const startMonth =
      Math.min(
        12,
        Math.max(
          1,
          Number(
            scheduleSettings.startMonth
          ) || 1
        )
      );

    const yearlyTarget =
      target * workingDays;

    const activeCalendarDays =
      daysInMonth
        .slice(startMonth - 1)
        .reduce(
          (sum, days) =>
            sum + days,
          0
        );

    const rows = monthNames.map(
      (month, index) => {
        const monthNumber =
          index + 1;

        const active =
          monthNumber >= startMonth;

        const calendarDays =
          daysInMonth[index];

        let monthWorkingDays = 0;

        if (
          active &&
          activeCalendarDays > 0
        ) {
          monthWorkingDays =
            workingDays *
            (calendarDays /
              activeCalendarDays);
        }

        let production =
          monthWorkingDays *
          target;

        if (
          active &&
          monthNumber === startMonth
        ) {
          production *= rampUp;
        }

        return {
          monthNumber,
          month,
          quarter:
            Math.ceil(
              monthNumber / 3
            ),
          calendarDays,
          workingDays:
            monthWorkingDays,
          targetProduction:
            production,
          cumulativeProduction: 0,
          percentOfAnnual: 0,
        };
      }
    );

    /* Balance the schedule back to annual target */

    const firstMonth =
      rows.findIndex(
        (row) =>
          row.monthNumber ===
          startMonth
      );

    const activeRows =
      firstMonth >= 0
        ? rows.slice(firstMonth)
        : rows;

    const initialTotal =
      rows.reduce(
        (sum, row) =>
          sum +
          row.targetProduction,
        0
      );

    const difference =
      yearlyTarget -
      initialTotal;

    if (
      Math.abs(difference) >
        0.01 &&
      activeRows.length > 1
    ) {
      const adjustment =
        difference /
        (activeRows.length - 1);

      activeRows
        .slice(1)
        .forEach((row) => {
          row.targetProduction =
            Math.max(
              0,
              row.targetProduction +
                adjustment
            );
        });
    }

    let cumulative = 0;

    rows.forEach((row) => {
      cumulative +=
        row.targetProduction;

      row.cumulativeProduction =
        cumulative;

      row.percentOfAnnual =
        yearlyTarget > 0
          ? (row.targetProduction /
              yearlyTarget) *
            100
          : 0;
    });

    const annualScheduled =
      rows.reduce(
        (sum, row) =>
          sum +
          row.targetProduction,
        0
      );

    return {
      rows,
      yearlyTarget,
      annualScheduled,
    };
  }, [
    inputs.productionTarget,
    inputs.workingDays,
    scheduleSettings,
  ]);

  /* ==========================================================
     STEP 7 — CUMULATIVE PRODUCTION
     ========================================================== */

  const productionProgress =
    useMemo(() => {
      const annualTarget =
        Number(
          schedule.yearlyTarget
        ) || 0;

      const planned =
        Number(
          schedule.annualScheduled
        ) || 0;

      const completed =
        schedule.rows.length
          ? schedule.rows[
              schedule.rows.length - 1
            ].cumulativeProduction
          : 0;

      const progress =
        annualTarget > 0
          ? Math.min(
              100,
              (completed /
                annualTarget) *
                100
            )
          : 0;

      const remaining =
        Math.max(
          0,
          annualTarget -
            completed
        );

      const monthsWithProduction =
        schedule.rows.filter(
          (row) =>
            row.targetProduction >
            0
        );

      const averageMonthlyProduction =
        monthsWithProduction.length >
        0
          ? completed /
            monthsWithProduction.length
          : 0;

      const yearEndForecast =
        averageMonthlyProduction *
        12;

      const forecastVariance =
        yearEndForecast -
        annualTarget;

      return {
        annualTarget,
        planned,
        completed,
        progress,
        remaining,
        averageMonthlyProduction,
        yearEndForecast,
        forecastVariance,
      };
    }, [schedule]);

  /* ==========================================================
     QUARTERLY PROGRESS
     ========================================================== */

  const quarterlyProgress =
    useMemo(() => {
      return [1, 2, 3, 4].map(
        (quarter) => {
          const rows =
            schedule.rows.filter(
              (row) =>
                row.quarter ===
                quarter
            );

          const production =
            rows.reduce(
              (sum, row) =>
                sum +
                row.targetProduction,
              0
            );

          const cumulative =
            rows.length
              ? rows[
                  rows.length - 1
                ].cumulativeProduction
              : 0;

          const percentage =
            productionProgress
              .annualTarget > 0
              ? (production /
                  productionProgress.annualTarget) *
                100
              : 0;

          const cumulativePercentage =
            productionProgress
              .annualTarget > 0
              ? (cumulative /
                  productionProgress.annualTarget) *
                100
              : 0;

          return {
            quarter,
            production,
            cumulative,
            percentage,
            cumulativePercentage,
          };
        }
      );
    }, [
      schedule,
      productionProgress.annualTarget,
    ]);

  /* ==========================================================
     COAL + WASTE
     ========================================================== */

  const materialTracking =
    useMemo(() => {
      const strippingRatio =
        baseScenario.strippingRatio;

      let cumulativeCoal = 0;
      let cumulativeWaste = 0;
      let cumulativeMaterial = 0;

      const rows =
        schedule.rows.map((row) => {
          const coal = Math.max(0, row.targetProduction);
          const wasteVolumeM3 = strippingRatio != null
            ? coal * strippingRatio
            : null;
          const waste = wasteVolumeM3 != null
            ? wasteVolumeM3 * PLANNING_OB_DENSITY_T_PER_M3
            : null;
          const totalMaterial = waste != null
            ? coal + waste
            : null;

          cumulativeCoal += coal;

          if (waste != null) cumulativeWaste += waste;
          if (totalMaterial != null) cumulativeMaterial += totalMaterial;

          return {
            ...row,
            coal,
            waste,
            wasteVolumeM3,
            totalMaterial,
            cumulativeCoal,
            cumulativeWaste: waste != null ? cumulativeWaste : null,
            cumulativeMaterial: totalMaterial != null ? cumulativeMaterial : null,
            strippingRatio: coal > 0 && waste != null
              ? waste / coal
              : null,
          };
        });

      const annualCoal = rows.reduce((sum, row) => sum + row.coal, 0);
      const hasWaste = strippingRatio != null;
      const annualWaste = hasWaste
        ? rows.reduce((sum, row) => sum + (row.waste || 0), 0)
        : null;
      const annualMaterial = hasWaste
        ? rows.reduce((sum, row) => sum + (row.totalMaterial || 0), 0)
        : null;

      return {
        rows,
        annualCoal,
        annualWaste,
        annualMaterial,
        coalPercent: annualMaterial > 0 ? (annualCoal / annualMaterial) * 100 : null,
        wastePercent: annualMaterial > 0 ? ((annualWaste || 0) / annualMaterial) * 100 : null,
        strippingRatio,
        obDensity: PLANNING_OB_DENSITY_T_PER_M3,
        isDerived: true,
        wasteAvailable: hasWaste,
      };
    }, [
      schedule,
      baseScenario.strippingRatio,
    ]);

  /* ==========================================================
     QUARTERLY MATERIAL
     ========================================================== */

  const quarterlyMaterial =
    useMemo(() => {
      return [1, 2, 3, 4].map(
        (quarter) => {
          const rows =
            materialTracking.rows.filter(
              (row) =>
                row.quarter ===
                quarter
            );

          return {
            quarter,
            coal: rows.reduce(
              (sum, row) =>
                sum + row.coal,
              0
            ),
            waste: rows.some((row) => row.waste != null)
              ? rows.reduce(
                  (sum, row) =>
                    sum + (row.waste || 0),
                  0
                )
              : null,
            total: rows.some((row) => row.totalMaterial != null)
              ? rows.reduce(
                  (sum, row) =>
                    sum + (row.totalMaterial || 0),
                  0
                )
              : null,
          };
        }
      );
    }, [materialTracking]);

  /* ==========================================================
     CAPACITY
     ========================================================== */

  const scheduleCapacity =
    useMemo(() => {
      const fleetDaily =
        haulage.fleetCapacityPerDay;

      const targetDaily =
        inputs.productionTarget;

      const annualFleetCapacity =
        fleetDaily *
        inputs.workingDays;

      const annualGap =
        annualFleetCapacity -
        schedule.yearlyTarget;

      return {
        feasible:
          fleetDaily >=
          targetDaily,
        annualFleetCapacity,
        annualGap,
      };
    }, [
      haulage.fleetCapacityPerDay,
      inputs.productionTarget,
      inputs.workingDays,
      schedule.yearlyTarget,
    ]);

  /* ==========================================================
     WARNINGS
     ========================================================== */

  const warnings = useMemo(() => {
    const result = [];

    if (inputs.benchHeight <= 0) {
      result.push(
        "Base bench height must be greater than zero."
      );
    }

    if (
      optimization.benchHeight <= 0
    ) {
      result.push(
        "Optimized bench height must be greater than zero."
      );
    }

    if (inputs.benchWidth <= 0) {
      result.push(
        "Base bench width must be greater than zero."
      );
    }

    if (
      optimization.benchWidth <= 0
    ) {
      result.push(
        "Optimized bench width must be greater than zero."
      );
    }

    if (
      inputs.recoveryFactor < 0 ||
      inputs.recoveryFactor > 100
    ) {
      result.push(
        "Base recovery factor should be between 0% and 100%."
      );
    }

    if (
      optimization.recoveryFactor < 0 ||
      optimization.recoveryFactor > 100
    ) {
      result.push(
        "Optimized recovery factor should be between 0% and 100%."
      );
    }

    if (
      haulage.cycleTime <= 0
    ) {
      result.push(
        "Haulage cycle time is invalid. Check haulage parameters."
      );
    }

    if (
      haulage.fleetCapacityPerDay <
      inputs.productionTarget
    ) {
      result.push(
        `Current truck fleet capacity is below the daily production target. Estimated capacity: ${formatNumber(
          haulage.fleetCapacityPerDay
        )} t/day versus target ${formatNumber(
          inputs.productionTarget
        )} t/day. Additional trucks required: ${formatNumber(
          additionalTrucksRequired
        )}.`
      );
    }

    if (
      equipment.operatingHoursPerDay >
      24
    ) {
      result.push(
        "Operating hours per day cannot exceed 24 hours."
      );
    }

    if (
      equipment.equipmentUtilization >
      95
    ) {
      result.push(
        "Equipment utilization above 95% may be unrealistic for planning."
      );
    }

    if (
      scheduleCapacity.annualGap < 0
    ) {
      result.push(
        `Annual fleet capacity is below the scheduled annual production target by ${formatNumber(
          Math.abs(
            scheduleCapacity.annualGap
          )
        )} tonnes.`
      );
    }

    return result;
  }, [
    inputs,
    optimization,
    haulage,
    equipment,
    scheduleCapacity,
    additionalTrucksRequired,
  ]);

  /* ==========================================================
     UPDATE FUNCTIONS
     ========================================================== */

  function updateInput(
    field,
    value
  ) {
    setInputs((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateOptimization(
    field,
    value
  ) {
    setOptimization(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function updateEquipment(
    field,
    value
  ) {
    setEquipment(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function updateScheduleSetting(
    field,
    value
  ) {
    setScheduleSettings(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  function applySelectedDataToInputs(current) {
    const nextInputs = {
      ...current,
      miningArea:
        selectedDataSummary.areaKm2 != null
          ? selectedDataSummary.areaKm2 * 1000000
          : current.miningArea,
      seamThickness:
        selectedDataSummary.averageThickness != null
          ? selectedDataSummary.averageThickness
          : current.seamThickness,
      miningDepth:
        selectedDataSummary.averageDepth != null
          ? selectedDataSummary.averageDepth
          : current.miningDepth,
      productionTarget:
        selectedDataSummary.prcMtpa != null && Number(current.workingDays) > 0
          ? (selectedDataSummary.prcMtpa * 1000000) / Number(current.workingDays)
          : current.productionTarget,
      recoveryFactor:
        Number(current.recoveryFactor) > 0
          ? current.recoveryFactor
          : PLANNING_RECOVERY_PERCENT,
      overburden:
        selectedDataSummary.averageThickness != null
          ? selectedDataSummary.averageThickness * PLANNING_STRIPPING_RATIO
          : current.overburden,
    };

    setInputs(nextInputs);

    // Immediately initialize the optimized scenario from the selected CMPDI inputs
    // so the BEFORE -> AFTER section never starts with zero production.
    const baseProduction = Number(nextInputs.productionTarget) || 0;
    const baseRecovery = Number(nextInputs.recoveryFactor) || PLANNING_RECOVERY_PERCENT;
    setOptimization({
      benchHeight: Math.max(1, Number(nextInputs.benchHeight) * 0.8),
      benchWidth: Math.max(1, Number(nextInputs.benchWidth) * 1.2),
      productionTarget: Math.round(baseProduction * 1.1),
      recoveryFactor: Math.min(100, baseRecovery + 4),
    });
  }

  function useSelectedData() {
    applySelectedDataToInputs(inputs);
  }

  useEffect(() => {
    if (!mine || !selectedDataSummary.count) return;

    setInputs((current) => {
      const nextInputs = {
        ...current,
        miningArea:
          selectedDataSummary.areaKm2 != null
            ? selectedDataSummary.areaKm2 * 1000000
            : current.miningArea,
        seamThickness:
          selectedDataSummary.averageThickness != null
            ? selectedDataSummary.averageThickness
            : current.seamThickness,
        miningDepth:
          selectedDataSummary.averageDepth != null
            ? selectedDataSummary.averageDepth
            : current.miningDepth,
        productionTarget:
          selectedDataSummary.prcMtpa != null && Number(current.workingDays) > 0
            ? (selectedDataSummary.prcMtpa * 1000000) / Number(current.workingDays)
            : current.productionTarget,
        recoveryFactor:
          Number(current.recoveryFactor) > 0
            ? current.recoveryFactor
            : PLANNING_RECOVERY_PERCENT,
        overburden:
          selectedDataSummary.averageThickness != null
            ? selectedDataSummary.averageThickness * PLANNING_STRIPPING_RATIO
            : current.overburden,
      };

      setOptimization({
        benchHeight: Math.max(1, Number(nextInputs.benchHeight) * 0.8),
        benchWidth: Math.max(1, Number(nextInputs.benchWidth) * 1.2),
        productionTarget: Math.round((Number(nextInputs.productionTarget) || 0) * 1.1),
        recoveryFactor: Math.min(100, (Number(nextInputs.recoveryFactor) || PLANNING_RECOVERY_PERCENT) + 4),
      });

      return nextInputs;
    });
  }, [
    mine,
    selectedDataSummary.count,
    selectedDataSummary.areaKm2,
    selectedDataSummary.averageThickness,
    selectedDataSummary.averageDepth,
    selectedDataSummary.prcMtpa,
  ]);

  function resetOptimization() {
    setOptimization({
      benchHeight:
        inputs.benchHeight,
      benchWidth:
        inputs.benchWidth,
      productionTarget:
        inputs.productionTarget,
      recoveryFactor:
        Number(inputs.recoveryFactor) || PLANNING_RECOVERY_PERCENT,
    });
  }

  function runOptimizationScenario() {
    setOptimization({
      benchHeight: Math.max(
        1,
        Number(
          inputs.benchHeight
        ) * 0.8
      ),

      benchWidth: Math.max(
        1,
        Number(
          inputs.benchWidth
        ) * 1.2
      ),

      productionTarget:
        Math.round(
          Number(
            inputs.productionTarget
          ) * 1.1
        ),

      recoveryFactor:
        Math.min(
          100,
          Number(
            inputs.recoveryFactor
          ) + 4
        ),
    });
  }


  /* ==========================================================
     STEP 8 — FINAL DESIGN DECISION
     ========================================================== */

  const finalDecision = (() => {
    const invalidDesign =
      Number(inputs.benchHeight) <= 0 ||
      Number(inputs.benchWidth) <= 0 ||
      Number(optimization.benchHeight) <= 0 ||
      Number(optimization.benchWidth) <= 0 ||
      Number(inputs.recoveryFactor) < 0 ||
      Number(inputs.recoveryFactor) > 100 ||
      Number(optimization.recoveryFactor) < 0 ||
      Number(optimization.recoveryFactor) > 100;

    const capacityShortfall =
      Number(haulage.fleetCapacityPerDay) <
      Number(inputs.productionTarget);

    const scheduleShortfall =
      Number(scheduleCapacity.annualGap) < 0;

    const operationalWarning =
      Number(equipment.operatingHoursPerDay) <= 0 ||
      Number(equipment.operatingHoursPerDay) > 24 ||
      Number(equipment.equipmentUtilization) > 95 ||
      Number(haulage.cycleTime) <= 0;

    if (
      invalidDesign ||
      capacityShortfall ||
      scheduleShortfall ||
      operationalWarning ||
      warnings.length > 0
    ) {
      return "REVIEW REQUIRED";
    }

    return "FEASIBLE";
  })();

  const finalDecisionReason =
    finalDecision === "FEASIBLE"
      ? "The current design passes the basic parameter, fleet-capacity and scheduling checks."
      : Number(haulage.fleetCapacityPerDay) <
        Number(inputs.productionTarget)
      ? `Fleet capacity is below the daily target. Approximately ${formatNumber(
          haulage.requiredTrucks
        )} trucks are required versus ${formatNumber(
          equipment.truckCount
        )} currently configured.`
      : Number(scheduleCapacity.annualGap) < 0
      ? `Annual fleet capacity is below the scheduled annual target by ${formatNumber(
          Math.abs(scheduleCapacity.annualGap)
        )} tonnes.`
      : warnings.length > 0
      ? "One or more engineering or operational constraints require review before implementation."
      : "The selected design contains parameters that require correction.";

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="md-page">

      <style>
        {styles}
      </style>

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="md-header">

        <div>

          <p className="md-eyebrow">
            PHASE 06 · MINE DESIGN & OPTIMIZATION
          </p>

          <h1>
            Mine Design & Optimization
          </h1>

          <p className="md-description">
            Design mining configurations,
            evaluate equipment capacity,
            build production schedules,
            track material movement and
            monitor cumulative mine progress.
          </p>

        </div>

        <div className="md-online">

          <span className="md-online-dot"></span>

          DESIGN ENGINE ONLINE

        </div>

      </div>

      {/* ======================================================
          DATA CONNECTION
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              CMPDI DATA CONNECTION
            </p>

            <h2 className="md-section-title">
              Mine & Seam Selection
            </h2>

            <p className="md-helper">
              Select a mine or seam from the
              connected real CMPDI multi-mine dataset.
            </p>

          </div>

          <div className="md-status">

            {loadingData
              ? "LOADING CMPDI"
              : `${records.length} CMPDI RECORDS`}

          </div>

        </div>

        {dataError && (
          <div className="md-warning">
            {dataError}
          </div>
        )}

        <div className="md-grid-4">

          <div className="md-field">

            <label>MINE</label>

            <select
              value={mine}
              onChange={(event) => {
                setMine(
                  event.target.value
                );
                setSeam("");
              }}
            >

              <option value="">
                All Mines
              </option>

              {mineOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="md-field">

            <label>SEAM</label>

            <select
              value={seam}
              onChange={(event) =>
                setSeam(
                  event.target.value
                )
              }
            >

              <option value="">
                All Seams
              </option>

              {seamOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="md-field">

            <label>
              MATCHING RECORDS
            </label>

            <div className="md-readonly">
              {selectedDataSummary.count}
            </div>

          </div>

          <div className="md-field">

            <label>
              DATA-DERIVED THICKNESS
            </label>

            <div className="md-readonly">

              {selectedDataSummary.averageThickness !==
              null
                ? `${selectedDataSummary.averageThickness.toFixed(
                    2
                  )} m`
                : "N/A"}

            </div>

          </div>

        </div>

        <div
          className="md-grid-2"
          style={{
            marginTop: 16,
          }}
        >

          <div className="md-field">

            <label>
              DATA-DERIVED DEPTH
            </label>

            <div className="md-readonly">

              {selectedDataSummary.averageDepth !==
              null
                ? `${selectedDataSummary.averageDepth.toFixed(
                    2
                  )} m`
                : "N/A"}

            </div>

          </div>

          <div className="md-field">

            <label>
              DATA STATUS
            </label>

            <div className="md-readonly">

              {selectedDataSummary.count > 0
                ? `Connected CMPDI source data${selectedDataSummary.prcMtpa != null ? ` · PRC ${selectedDataSummary.prcMtpa} MTPA` : ""}`
                : "No filtered records selected"}

            </div>

          </div>

        </div>

        <div className="md-note">
          <strong>REAL-DATA RULE:</strong> CMPDI geological/resource/capacity values are source data. Monthly production, waste movement, fleet performance and optimization outputs are planning calculations. Where Machhakata-specific engineering inputs are unavailable, MINQORA uses explicit benchmark assumptions and labels them as scenario values.
        </div>

        <div className="md-actions">

          <button
            className="md-button md-button-secondary"
            onClick={
              useSelectedData
            }
            disabled={
              !selectedDataSummary.count
            }
          >
            Use Selected Data
          </button>

        </div>

      </section>

      {/* ======================================================
          BASE DESIGN
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              BASE DESIGN
            </p>

            <h2 className="md-section-title">
              Mine Planning Inputs
            </h2>

          </div>

          <div className="md-status">
            SOURCE + ENGINEERING INPUTS
          </div>

        </div>

        <div className="md-grid-3">

          {[
            [
              "miningArea",
              "MINING AREA (m²)",
              0,
              0,
            ],
            [
              "seamThickness",
              "SEAM THICKNESS (m)",
              0,
              0.1,
            ],
            [
              "miningDepth",
              "MINING DEPTH (m)",
              0,
              0,
            ],
            [
              "benchHeight",
              "BENCH HEIGHT (m)",
              0,
              0.5,
            ],
            [
              "benchWidth",
              "BENCH WIDTH (m)",
              0,
              1,
            ],
            [
              "productionTarget",
              "PLANNED PRODUCTION TARGET (t/day)",
              0,
              0,
            ],
            [
              "workingDays",
              "WORKING DAYS / YEAR",
              0,
              0,
            ],
            [
              "recoveryFactor",
              "RECOVERY FACTOR (%) — USER INPUT",
              0,
              1,
            ],
            [
              "overburden",
              "OVERBURDEN / WASTE (m) — USER INPUT",
              0,
              0.1,
            ],
          ].map(
            (field) => (
              <div
                className="md-field"
                key={field[0]}
              >

                <label>
                  {field[1]}
                </label>

                <input
                  type="number"
                  min={field[2]}
                  step={field[3]}
                  value={
                    inputs[field[0]]
                  }
                  onChange={(event) =>
                    updateInput(
                      field[0],
                      Number(
                        event.target.value
                      )
                    )
                  }
                />

              </div>
            )
          )}

        </div>

      </section>

      {/* ======================================================
          BASELINE
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              BASELINE ANALYSIS
            </p>

            <h2 className="md-section-title">
              Current Design Performance
            </h2>

          </div>

        </div>

        <div className="md-grid-4">

          <div className="md-metric">
            <span>BENCH COUNT</span>
            <strong>
              {formatNumber(
                baseScenario.benchCount
              )}
            </strong>
            <small>
              depth ÷ bench height
            </small>
          </div>

          <div className="md-metric">
            <span>DAILY PRODUCTION</span>
            <strong>
              {formatNumber(
                baseScenario.dailyProduction
              )}{" "}
              t
            </strong>
            <small>
              baseline target
            </small>
          </div>

          <div className="md-metric">
            <span>ANNUAL PLANNED PRODUCTION</span>
            <strong>
              {formatNumber(
                baseScenario.annualProduction
              )}{" "}
              t
            </strong>
            <small>
              derived planning value
            </small>
          </div>

          <div className="md-metric">
            <span>STRIPPING RATIO</span>
            <strong>
              {baseScenario.strippingRatio != null
                ? baseScenario.strippingRatio.toFixed(2)
                : "N/A"}
            </strong>
            <small>
              scenario benchmark · editable
            </small>
          </div>

        </div>

      </section>

      {/* ======================================================
          EQUIPMENT
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              EQUIPMENT & HAULAGE
            </p>

            <h2 className="md-section-title">
              Fleet Planning Inputs
            </h2>

          </div>

          <div className="md-status">
            CAPACITY MODEL
          </div>

        </div>

        <div className="md-grid-3">

          {[
            [
              "truckPayload",
              "TRUCK PAYLOAD (t)",
              0,
              0,
            ],
            [
              "truckCount",
              "NUMBER OF TRUCKS",
              0,
              1,
            ],
            [
              "loadingTime",
              "LOADING TIME (min)",
              0,
              0.5,
            ],
            [
              "unloadingTime",
              "UNLOADING TIME (min)",
              0,
              0.5,
            ],
            [
              "equipmentUtilization",
              "EQUIPMENT UTILIZATION (%)",
              0,
              1,
            ],
            [
              "operatingHoursPerDay",
              "OPERATING HOURS / DAY",
              1,
              0.5,
            ],
            [
              "haulDistance",
              "HAUL DISTANCE ONE-WAY (km)",
              0,
              0.1,
            ],
            [
              "loadedSpeed",
              "LOADED SPEED (km/h)",
              0,
              1,
            ],
            [
              "emptySpeed",
              "EMPTY SPEED (km/h)",
              0,
              1,
            ],
            [
              "delayTime",
              "DELAY / QUEUE TIME (min)",
              0,
              0.5,
            ],
          ].map(
            (field) => (
              <div
                className="md-field"
                key={field[0]}
              >

                <label>
                  {field[1]}
                </label>

                <input
                  type="number"
                  min={field[2]}
                  step={field[3]}
                  value={
                    equipment[field[0]]
                  }
                  onChange={(event) =>
                    updateEquipment(
                      field[0],
                      Number(
                        event.target.value
                      )
                    )
                  }
                />

              </div>
            )
          )}

        </div>

      </section>

      {/* ======================================================
          HAULAGE ENGINE
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              HAULAGE ENGINE
            </p>

            <h2 className="md-section-title">
              Truck Cycle Analysis
            </h2>

          </div>

          <div
            className={`md-status ${
              haulage.fleetCapacityPerDay >=
              inputs.productionTarget
                ? "md-status-good"
                : "md-status-warning"
            }`}
          >

            {haulage.fleetCapacityPerDay >=
            inputs.productionTarget
              ? "SUFFICIENT CAPACITY"
              : "CAPACITY GAP"}

          </div>

        </div>

        <div className="md-grid-4">

          <div className="md-metric">
            <span>LOADED TRAVEL</span>
            <strong>
              {haulage.loadedTravelMinutes.toFixed(
                1
              )}{" "}
              min
            </strong>
            <small>
              one-way travel
            </small>
          </div>

          <div className="md-metric">
            <span>EMPTY RETURN</span>
            <strong>
              {haulage.emptyTravelMinutes.toFixed(
                1
              )}{" "}
              min
            </strong>
            <small>
              return travel
            </small>
          </div>

          <div className="md-metric">
            <span>TOTAL CYCLE TIME</span>
            <strong>
              {haulage.cycleTime.toFixed(
                1
              )}{" "}
              min
            </strong>
            <small>
              complete truck cycle
            </small>
          </div>

          <div className="md-metric">
            <span>EFFECTIVE CYCLES / HOUR</span>
            <strong>
              {haulage.effectiveCyclesPerHour.toFixed(
                2
              )}
            </strong>
            <small>
              after utilization
            </small>
          </div>

        </div>

        <div
          className="md-grid-4"
          style={{
            marginTop: 16,
          }}
        >

          <div className="md-metric">
            <span>
              PRODUCTION / TRUCK
            </span>
            <strong>
              {formatNumber(
                haulage.productionPerTruckPerHour
              )}{" "}
              t/h
            </strong>
            <small>
              {formatNumber(
                haulage.productionPerTruckPerDay
              )}{" "}
              t/day
            </small>
          </div>

          <div className="md-metric">
            <span>FLEET CAPACITY</span>
            <strong>
              {formatNumber(
                haulage.fleetCapacityPerDay
              )}{" "}
              t/day
            </strong>
            <small>
              estimated fleet output
            </small>
          </div>

          <div className="md-metric">
            <span>REQUIRED TRUCKS</span>
            <strong>
              {formatNumber(
                haulage.requiredTrucks
              )}
            </strong>
            <small>
              for daily target
            </small>
          </div>

          <div className="md-metric">
            <span>
              CAPACITY UTILIZATION
            </span>
            <strong>
              {haulage.capacityUtilization.toFixed(
                1
              )}%
            </strong>
            <small>
              fleet capacity ÷ target
            </small>
          </div>

        </div>

        <div
          className="md-grid-2"
          style={{
            marginTop: 16,
          }}
        >

          <div className="md-metric">
            <span>
              CURRENT TRUCK FLEET
            </span>
            <strong>
              {formatNumber(
                equipment.truckCount
              )}
            </strong>
            <small>
              trucks configured
            </small>
          </div>

          <div className="md-metric">
            <span>
              ADDITIONAL TRUCKS REQUIRED
            </span>
            <strong>
              {formatNumber(
                additionalTrucksRequired
              )}
            </strong>
            <small>
              required minus current
            </small>
          </div>

        </div>

      </section>

      {/* ======================================================
          PRODUCTION CAPACITY
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              PRODUCTION CAPACITY
            </p>

            <h2 className="md-section-title">
              Fleet vs Production Target
            </h2>

          </div>

        </div>

        {haulage.fleetCapacityPerDay >=
        inputs.productionTarget ? (

          <div className="md-success">

            <strong>
              Capacity check passed.
            </strong>{" "}

            Fleet capacity is{" "}
            <strong>
              {formatNumber(
                haulage.fleetCapacityPerDay
              )} t/day
            </strong>{" "}
            against target{" "}
            <strong>
              {formatNumber(
                inputs.productionTarget
              )} t/day
            </strong>
            .

          </div>

        ) : (

          <div className="md-warning">

            <strong>
              Capacity gap detected.
            </strong>{" "}

            Fleet capacity is{" "}
            <strong>
              {formatNumber(
                haulage.fleetCapacityPerDay
              )} t/day
            </strong>{" "}
            against target{" "}
            <strong>
              {formatNumber(
                inputs.productionTarget
              )} t/day
            </strong>
            .

            <br />

            Fleet covers only{" "}
            <strong>
              {haulage.capacityUtilization.toFixed(
                1
              )}%
            </strong>{" "}
            of the target.

            <br />

            Additional trucks required:{" "}
            <strong>
              {formatNumber(
                additionalTrucksRequired
              )}
            </strong>
            .

          </div>

        )}

      </section>

      {/* ======================================================
          OPTIMIZATION
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              OPTIMIZATION ENGINE
            </p>

            <h2 className="md-section-title">
              Optimized Design Scenario
            </h2>

          </div>

          <div className="md-status">
            SCENARIO MODEL · +10% PRODUCTION
          </div>

        </div>

        <div className="md-grid-2">

          <div className="md-field">
            <label>
              OPTIMIZED BENCH HEIGHT (m)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={
                optimization.benchHeight
              }
              onChange={(event) =>
                updateOptimization(
                  "benchHeight",
                  Number(
                    event.target.value
                  )
                )
              }
            />
          </div>

          <div className="md-field">
            <label>
              OPTIMIZED BENCH WIDTH (m)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={
                optimization.benchWidth
              }
              onChange={(event) =>
                updateOptimization(
                  "benchWidth",
                  Number(
                    event.target.value
                  )
                )
              }
            />
          </div>

          <div className="md-field">
            <label>
              OPTIMIZED PRODUCTION TARGET (t/day)
            </label>
            <input
              type="number"
              min="0"
              value={
                optimization.productionTarget
              }
              onChange={(event) =>
                updateOptimization(
                  "productionTarget",
                  Number(
                    event.target.value
                  )
                )
              }
            />
          </div>

          <div className="md-field">
            <label>
              OPTIMIZED RECOVERY FACTOR (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={
                optimization.recoveryFactor
              }
              onChange={(event) =>
                updateOptimization(
                  "recoveryFactor",
                  Number(
                    event.target.value
                  )
                )
              }
            />
          </div>

        </div>

        <div className="md-actions">

          <button
            className="md-button md-button-primary"
            onClick={
              runOptimizationScenario
            }
          >
            Run Optimization Scenario
          </button>

          <button
            className="md-button md-button-secondary"
            onClick={
              resetOptimization
            }
          >
            Reset to Base
          </button>

        </div>

      </section>

      {/* ======================================================
          COMPARISON
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              BEFORE → AFTER
            </p>

            <h2 className="md-section-title">
              Base vs Optimized Design
            </h2>

          </div>

        </div>

        <div className="md-comparison">

          <table className="md-table">

            <thead>

              <tr>
                <th>PARAMETER</th>
                <th>BASE DESIGN</th>
                <th>OPTIMIZED DESIGN</th>
                <th>CHANGE</th>
              </tr>

            </thead>

            <tbody>

              <tr>
                <td>
                  <strong>
                    Bench Height
                  </strong>
                </td>
                <td>
                  {inputs.benchHeight} m
                </td>
                <td>
                  {optimization.benchHeight} m
                </td>
                <td>
                  {(
                    optimization.benchHeight -
                    inputs.benchHeight
                  ).toFixed(2)}{" "}
                  m
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Bench Width
                  </strong>
                </td>
                <td>
                  {inputs.benchWidth} m
                </td>
                <td>
                  {optimization.benchWidth} m
                </td>
                <td>
                  {(
                    optimization.benchWidth -
                    inputs.benchWidth
                  ).toFixed(2)}{" "}
                  m
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Bench Count
                  </strong>
                </td>
                <td>
                  {formatNumber(
                    baseScenario.benchCount
                  )}
                </td>
                <td>
                  {formatNumber(
                    optimizedScenario.benchCount
                  )}
                </td>
                <td>
                  {benchChange > 0
                    ? `+${benchChange}`
                    : benchChange}
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Daily Production
                  </strong>
                </td>
                <td>
                  {formatNumber(
                    baseScenario.dailyProduction
                  )}{" "}
                  t
                </td>
                <td>
                  {formatNumber(
                    optimizedScenario.dailyProduction
                  )}{" "}
                  t
                </td>
                <td className="md-improvement">
                  +
                  {formatNumber(
                    optimizedScenario.dailyProduction -
                      baseScenario.dailyProduction
                  )}{" "}
                  t
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Annual Production
                  </strong>
                </td>
                <td>
                  {formatNumber(
                    baseScenario.annualProduction
                  )}{" "}
                  t
                </td>
                <td>
                  {formatNumber(
                    optimizedScenario.annualProduction
                  )}{" "}
                  t
                </td>
                <td className="md-improvement">
                  +
                  {productionImprovement.toFixed(
                    2
                  )}%
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Recovery Factor
                  </strong>
                </td>
                <td>
                  {inputs.recoveryFactor}%
                </td>
                <td>
                  {optimization.recoveryFactor}%
                </td>
                <td>
                  {(
                    optimization.recoveryFactor -
                    inputs.recoveryFactor
                  ).toFixed(1)}{" "}
                  points
                </td>
              </tr>

              <tr>
                <td>
                  <strong>
                    Stripping Ratio
                  </strong>
                </td>
                <td>
                  {baseScenario.strippingRatio != null
                    ? baseScenario.strippingRatio.toFixed(2)
                    : "N/A"}
                </td>
                <td>
                  {optimizedScenario.strippingRatio != null
                    ? optimizedScenario.strippingRatio.toFixed(2)
                    : "N/A"}
                </td>
                <td>
                  {strippingChange != null
                    ? strippingChange.toFixed(2)
                    : "N/A"}
                </td>
              </tr>

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          PRODUCTION SCHEDULING
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              PRODUCTION SCHEDULING
            </p>

            <h2 className="md-section-title">
              Annual Mine Production Plan
            </h2>

            <p className="md-helper">
              Convert the daily production target
              into monthly and quarterly targets.
            </p>

          </div>

          <div className="md-status">
            SCHEDULE ENGINE
          </div>

        </div>

        <div className="md-grid-3">

          <div className="md-field">

            <label>
              SCHEDULE YEAR
            </label>

            <input
              type="number"
              value={
                scheduleSettings.scheduleYear
              }
              onChange={(event) =>
                updateScheduleSetting(
                  "scheduleYear",
                  Number(
                    event.target.value
                  )
                )
              }
            />

          </div>

          <div className="md-field">

            <label>
              START MONTH
            </label>

            <select
              value={
                scheduleSettings.startMonth
              }
              onChange={(event) =>
                updateScheduleSetting(
                  "startMonth",
                  Number(
                    event.target.value
                  )
                )
              }
            >

              {monthNames.map(
                (month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="md-field">

            <label>
              FIRST-MONTH RAMP-UP (%)
            </label>

            <input
              type="number"
              min="1"
              max="100"
              value={
                scheduleSettings.rampUpPercent
              }
              onChange={(event) =>
                updateScheduleSetting(
                  "rampUpPercent",
                  Number(
                    event.target.value
                  )
                )
              }
            />

          </div>

        </div>

        <div
          className="md-grid-4"
          style={{
            marginTop: 20,
          }}
        >

          <div className="md-metric">
            <span>ANNUAL TARGET</span>
            <strong>
              {formatNumber(
                schedule.yearlyTarget
              )}{" "}
              t
            </strong>
            <small>
              production target
            </small>
          </div>

          <div className="md-metric">
            <span>SCHEDULED PRODUCTION</span>
            <strong>
              {formatNumber(
                schedule.annualScheduled
              )}{" "}
              t
            </strong>
            <small>
              monthly schedule total
            </small>
          </div>

          <div className="md-metric">
            <span>FLEET ANNUAL CAPACITY</span>
            <strong>
              {formatNumber(
                scheduleCapacity.annualFleetCapacity
              )}{" "}
              t
            </strong>
            <small>
              estimated fleet output
            </small>
          </div>

          <div className="md-metric">
            <span>CAPACITY BALANCE</span>
            <strong>
              {scheduleCapacity.annualGap >=
              0
                ? "+"
                : ""}
              {formatNumber(
                scheduleCapacity.annualGap
              )}{" "}
              t
            </strong>
            <small>
              fleet capacity minus target
            </small>
          </div>

        </div>

      </section>

      {/* ======================================================
          MONTHLY PLAN
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              MONTHLY SCHEDULE
            </p>

            <h2 className="md-section-title">
              Month-by-Month Production Plan
            </h2>

          </div>

        </div>

        <div className="schedule-scroll">

          <table className="schedule-table">

            <thead>

              <tr>
                <th>MONTH</th>
                <th>QUARTER</th>
                <th>WORKING DAYS</th>
                <th>PRODUCTION TARGET</th>
                <th>% ANNUAL</th>
                <th>CUMULATIVE PRODUCTION</th>
                <th>PLAN LOAD</th>
              </tr>

            </thead>

            <tbody>

              {schedule.rows.map(
                (row) => (
                  <tr
                    key={
                      row.month
                    }
                  >

                    <td>
                      <strong>
                        {row.month}
                      </strong>
                    </td>

                    <td>
                      Q{row.quarter}
                    </td>

                    <td>
                      {row.workingDays.toFixed(
                        1
                      )}
                    </td>

                    <td>
                      {formatNumber(
                        row.targetProduction
                      )}{" "}
                      t
                    </td>

                    <td>
                      {row.percentOfAnnual.toFixed(
                        1
                      )}%
                    </td>

                    <td>
                      {formatNumber(
                        row.cumulativeProduction
                      )}{" "}
                      t
                    </td>

                    <td>

                      <div className="schedule-progress">

                        <div
                          className="schedule-progress-bar"
                          style={{
                            width: `${Math.min(
                              100,
                              row.percentOfAnnual *
                                4
                            )}%`,
                          }}
                        />

                      </div>

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          STEP 7 — CUMULATIVE PRODUCTION
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              STEP 07 · PRODUCTION PROGRESS
            </p>

            <h2 className="md-section-title">
              Cumulative Production & Mine Progress
            </h2>
            <p className="md-helper">
              This section shows MINQORA's derived plan from the selected CMPDI capacity. It is not an operational production history.
            </p>

            <p className="md-helper">
              Track planned cumulative production
              against the annual mine production
              target and estimate year-end performance.
            </p>

          </div>

          <div
            className={`md-status ${
              productionProgress.progress >=
              100
                ? "md-status-good"
                : "md-status"
            }`}
          >

            {productionProgress.progress >=
            100
              ? "TARGET REACHED"
              : "PROGRESS TRACKING"}

          </div>

        </div>

        {/* MAIN PROGRESS METRICS */}

        <div className="md-grid-4">

          <div className="md-metric">

            <span>
              ANNUAL PRODUCTION TARGET
            </span>

            <strong>
              {formatNumber(
                productionProgress.annualTarget
              )}{" "}
              t
            </strong>

            <small>
              approved planning target
            </small>

          </div>

          <div className="md-metric">

            <span>
              CUMULATIVE PRODUCTION
            </span>

            <strong>
              {formatNumber(
                productionProgress.completed
              )}{" "}
              t
            </strong>

            <small>
              cumulative scheduled output
            </small>

          </div>

          <div className="md-metric">

            <span>
              PRODUCTION PROGRESS
            </span>

            <strong>
              {productionProgress.progress.toFixed(
                1
              )}%
            </strong>

            <small>
              cumulative ÷ annual target
            </small>

          </div>

          <div className="md-metric">

            <span>
              REMAINING PRODUCTION
            </span>

            <strong>
              {formatNumber(
                productionProgress.remaining
              )}{" "}
              t
            </strong>

            <small>
              target yet to be scheduled
            </small>

          </div>

        </div>

        {/* MAIN PROGRESS BAR */}

        <div className="progress-container">

          <div className="progress-header">

            <div className="progress-title">
              ANNUAL PRODUCTION PROGRESS
            </div>

            <div className="progress-percent">
              {productionProgress.progress.toFixed(
                1
              )}%
            </div>

          </div>

          <div className="progress-track">

            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  100,
                  productionProgress.progress
                )}%`,
              }}
            />

          </div>

          <div className="progress-caption">

            <span>
              0 t
            </span>

            <span>
              Target:{" "}
              {formatNumber(
                productionProgress.annualTarget
              )}{" "}
              t
            </span>

          </div>

        </div>

        {/* QUARTERLY CUMULATIVE PROGRESS */}

        <div
          style={{
            marginTop: 26,
          }}
        >

          <p className="md-eyebrow">
            QUARTER-WISE PROGRESS
          </p>

          <div className="quarter-progress">

            {quarterlyProgress.map(
              (quarter) => (

                <div
                  className="quarter-progress-row"
                  key={
                    quarter.quarter
                  }
                >

                  <div className="quarter-progress-label">

                    Q{quarter.quarter}

                  </div>

                  <div className="quarter-progress-track">

                    <div
                      className="quarter-progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          quarter.cumulativePercentage
                        )}%`,
                      }}
                    />

                  </div>

                  <div className="quarter-progress-value">

                    {formatNumber(
                      quarter.cumulative
                    )}{" "}
                    t ·{" "}
                    {quarter.cumulativePercentage.toFixed(
                      1
                    )}%

                  </div>

                </div>

              )
            )}

          </div>

        </div>

        {/* FORECAST */}

        <div className="forecast-box">

          <div className="forecast-title">
            YEAR-END PRODUCTION FORECAST
          </div>

          <p className="forecast-text">

            Based on the current MINQORA planning
            allocation, the derived year-end production is{" "}

            <strong>
              {formatNumber(
                productionProgress.yearEndForecast
              )}{" "}
              t
            </strong>

            {" "}against the annual target of{" "}

            <strong>
              {formatNumber(
                productionProgress.annualTarget
              )}{" "}
              t
            </strong>
            .

            <br />

            Forecast variance:{" "}

            <strong
              className={
                productionProgress.forecastVariance >=
                0
                  ? "md-improvement"
                  : "md-neutral"
              }
            >

              {productionProgress.forecastVariance >=
              0
                ? "+"
                : ""}

              {formatNumber(
                productionProgress.forecastVariance
              )}{" "}
              t

            </strong>

          </p>

        </div>

        <div className="md-note">

          <strong>
            Important:
          </strong>{" "}
          The current cumulative values represent
          the production schedule generated by
          MINQORA. They are not actual mine
          production measurements. Actual-versus-plan
          tracking can be connected later to
          operational production records.

        </div>

      </section>

      {/* ======================================================
          COAL & WASTE
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              MATERIAL TRACKING
            </p>

            <h2 className="md-section-title">
              Coal & Waste Movement
            </h2>

          </div>

          <div className="md-status">
            DERIVED FROM CMPDI PRC
          </div>

        </div>

        <div className="md-grid-4">

          <div className="md-metric">
            <span>ANNUAL PLANNED COAL</span>
            <strong>
              {formatNumber(
                materialTracking.annualCoal
              )}{" "}
              t
            </strong>
            <small>
              derived from selected CMPDI PRC
            </small>
          </div>

          <div className="md-metric">
            <span>ANNUAL OB MASS (SCENARIO)</span>
            <strong>
              {materialTracking.annualWaste != null
                ? `${formatNumber(materialTracking.annualWaste)} t`
                : "N/A"}
            </strong>
            <small>
              2.75 m³/t benchmark × 2.2 t/m³ density assumption
            </small>
          </div>

          <div className="md-metric">
            <span>TOTAL MATERIAL (SCENARIO)</span>
            <strong>
              {materialTracking.annualMaterial != null
                ? `${formatNumber(materialTracking.annualMaterial)} t`
                : "N/A"}
            </strong>
            <small>
              coal + OB mass-equivalent
            </small>
          </div>

          <div className="md-metric">
            <span>STRIPPING RATIO</span>
            <strong>
              {materialTracking.strippingRatio != null
                ? materialTracking.strippingRatio.toFixed(2)
                : "N/A"}
            </strong>
            <small>
              waste / coal
            </small>
          </div>

        </div>

      </section>

      {/* ======================================================
          MONTHLY MATERIAL
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              MONTHLY MATERIAL MODEL
            </p>

            <h2 className="md-section-title">
              Coal, Waste & Cumulative Movement
            </h2>
            <p className="md-helper">
              Coal is a MINQORA planning allocation derived from the selected CMPDI PRC; it is not measured monthly production. For waste movement, MINQORA uses an editable 2.75 m³/t coal planning benchmark (Indian opencast average, 2021-22) and an assumed 2.2 t/m³ overburden bulk density to convert OB volume into a mass-equivalent scenario. Neither value is a Machhakata-specific measurement.
            </p>

          </div>

        </div>

        <div className="schedule-scroll">

          <table className="schedule-table">

            <thead>

              <tr>
                <th>MONTH</th>
                <th>PLANNED COAL</th>
                <th>OB MASS-EQUIVALENT</th>
                <th>TOTAL MATERIAL</th>
                <th>CUMULATIVE COAL</th>
                <th>CUMULATIVE WASTE</th>
                <th>CUMULATIVE TOTAL</th>
              </tr>

            </thead>

            <tbody>

              {materialTracking.rows.map(
                (row) => (

                  <tr
                    key={
                      row.month
                    }
                  >

                    <td>
                      <strong>
                        {row.month}
                      </strong>
                    </td>

                    <td>
                      {formatNumber(
                        row.coal
                      )}{" "}
                      t
                    </td>

                    <td>
                      {row.waste != null
                        ? `${formatNumber(row.waste)} t`
                        : "N/A — no public CMPDI waste data"}
                    </td>

                    <td>
                      {row.totalMaterial != null
                        ? `${formatNumber(row.totalMaterial)} t`
                        : "N/A"}
                    </td>

                    <td>
                      {formatNumber(
                        row.cumulativeCoal
                      )}{" "}
                      t
                    </td>

                    <td>
                      {row.cumulativeWaste != null
                        ? `${formatNumber(row.cumulativeWaste)} t`
                        : "N/A"}
                    </td>

                    <td>
                      {row.cumulativeMaterial != null
                        ? `${formatNumber(row.cumulativeMaterial)} t`
                        : "N/A"}
                    </td>

                  </tr>

                )
              )}

              <tr className="schedule-total">

                <td>
                  TOTAL
                </td>

                <td>
                  {formatNumber(
                    materialTracking.annualCoal
                  )}{" "}
                  t
                </td>

                <td>
                  {materialTracking.annualWaste != null
                    ? `${formatNumber(materialTracking.annualWaste)} t`
                    : "N/A"}
                </td>

                <td>
                  {materialTracking.annualMaterial != null
                    ? `${formatNumber(materialTracking.annualMaterial)} t`
                    : "N/A"}
                </td>

                <td>
                  {formatNumber(
                    materialTracking.annualCoal
                  )}{" "}
                  t
                </td>

                <td>
                  {materialTracking.annualWaste != null
                    ? `${formatNumber(materialTracking.annualWaste)} t`
                    : "N/A"}
                </td>

                <td>
                  {materialTracking.annualMaterial != null
                    ? `${formatNumber(materialTracking.annualMaterial)} t`
                    : "N/A"}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </section>

      {/* ======================================================
          QUARTERLY MATERIAL
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              QUARTERLY MATERIAL MOVEMENT
            </p>

            <h2 className="md-section-title">
              Quarterly Coal & Waste
            </h2>
            <p className="md-helper">
              Quarterly values are derived planning allocations. They are not historical CMPDI production or waste measurements.
            </p>

          </div>

        </div>

        <div className="md-grid-4">

          {quarterlyMaterial.map(
            (item) => (

              <div
                className="quarter-card"
                key={
                  item.quarter
                }
              >

                <h3>
                  Q{item.quarter}
                </h3>

                <p className="quarter-value">

                  {item.total != null
                    ? `${formatNumber(item.total)} t`
                    : "N/A"}

                </p>

                <div className="quarter-label">

                  Coal:{" "}
                  {formatNumber(
                    item.coal
                  )}{" "}
                  t

                </div>

                <div className="quarter-label">

                  Waste:{" "}
                  {item.waste != null
                    ? `${formatNumber(item.waste)} t`
                    : "N/A"}

                </div>

              </div>

            )
          )}

        </div>

      </section>

      {/* ======================================================
          SCHEDULE FEASIBILITY
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              SCHEDULE FEASIBILITY
            </p>

            <h2 className="md-section-title">
              Production Plan vs Fleet Capacity
            </h2>

          </div>

        </div>

        {scheduleCapacity.feasible ? (

          <div className="md-success">

            <strong>
              Annual capacity is sufficient.
            </strong>{" "}

            Estimated fleet capacity is{" "}
            <strong>
              {formatNumber(
                scheduleCapacity.annualFleetCapacity
              )} t/year
            </strong>{" "}
            against scheduled production of{" "}
            <strong>
              {formatNumber(
                schedule.yearlyTarget
              )} t/year
            </strong>
            .

          </div>

        ) : (

          <div className="md-warning">

            <strong>
              Annual capacity gap detected.
            </strong>{" "}

            The estimated fleet is short by{" "}
            <strong>
              {formatNumber(
                Math.abs(
                  scheduleCapacity.annualGap
                )
              )} t/year
            </strong>{" "}
            compared with the scheduled
            production target.

            <br />

            Additional trucks required:{" "}
            <strong>
              {formatNumber(
                additionalTrucksRequired
              )}
            </strong>
            .

          </div>

        )}

      </section>

      {/* ======================================================
          OPTIMIZATION RESULT
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              OPTIMIZATION RESULT
            </p>

            <h2 className="md-section-title">
              Scenario Impact
            </h2>

          </div>

        </div>

        <div className="md-grid-4">

          <div className="md-metric">
            <span>
              PRODUCTION IMPROVEMENT
            </span>
            <strong>
              {productionImprovement.toFixed(
                2
              )}%
            </strong>
            <small>
              annual production change
            </small>
          </div>

          <div className="md-metric">
            <span>ANNUAL GAIN</span>
            <strong>
              {formatNumber(
                optimizedScenario.annualProduction -
                  baseScenario.annualProduction
              )}{" "}
              t
            </strong>
            <small>
              optimized minus baseline
            </small>
          </div>

          <div className="md-metric">
            <span>BENCH CHANGE</span>
            <strong>
              {benchChange > 0
                ? `+${benchChange}`
                : benchChange}
            </strong>
            <small>
              optimized minus baseline
            </small>
          </div>

          <div className="md-metric">
            <span>STRIPPING CHANGE</span>
            <strong>
              {strippingChange != null
                ? strippingChange > 0
                  ? `+${strippingChange.toFixed(2)}`
                  : strippingChange.toFixed(2)
                : "N/A"}
            </strong>
            <small>
              scenario comparison
            </small>
          </div>

        </div>

      </section>

      {/* ======================================================
          CONSTRAINT CHECK
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              CONSTRAINT CHECK
            </p>

            <h2 className="md-section-title">
              Design & Operational Warnings
            </h2>

          </div>

        </div>

        {warnings.length === 0 ? (

          <div className="md-success">

            No basic parameter,
            fleet-capacity or scheduling
            warnings detected.

          </div>

        ) : (

          <div className="md-warning-list">

            {warnings.map(
              (warning, index) => (

                <div
                  key={index}
                  className="md-warning-item"
                >
                  {warning}
                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* ======================================================
          STEP 8 — FINAL DESIGN SUMMARY
          ====================================================== */}

      <section className="md-section">
        <div className="md-section-header">
          <div>
            <p className="md-eyebrow">
              STEP 08 · FINAL DESIGN SUMMARY
            </p>

            <h2 className="md-section-title">
              Mine Design Decision
            </h2>

            <p className="md-helper">
              Final engineering-style summary of the selected design,
              fleet capacity, production schedule and constraint status.
            </p>
          </div>

          <div
            className={
              finalDecision === "FEASIBLE"
                ? "md-status"
                : "md-status md-warning"
            }
          >
            {finalDecision}
          </div>
        </div>

        <div className="md-grid-4">
          <div className="md-metric">
            <span>SELECTED MINE</span>
            <strong>{mine || "All Mines"}</strong>
            <small>connected mining dataset</small>
          </div>

          <div className="md-metric">
            <span>SELECTED SEAM</span>
            <strong>{seam || "All Seams"}</strong>
            <small>selected geological unit</small>
          </div>

          <div className="md-metric">
            <span>BASE PRODUCTION</span>
            <strong>
              {formatNumber(inputs.productionTarget)} t/day
            </strong>
            <small>planning target</small>
          </div>

          <div className="md-metric">
            <span>FLEET CAPACITY</span>
            <strong>
              {formatNumber(haulage.fleetCapacityPerDay)} t/day
            </strong>
            <small>configured fleet</small>
          </div>
        </div>

        <div className="md-grid-4">
          <div className="md-metric">
            <span>BASE BENCH</span>
            <strong>{Number(inputs.benchHeight).toFixed(1)} m</strong>
            <small>bench height</small>
          </div>

          <div className="md-metric">
            <span>OPTIMIZED BENCH</span>
            <strong>
              {Number(optimization.benchHeight).toFixed(1)} m
            </strong>
            <small>scenario height</small>
          </div>

          <div className="md-metric">
            <span>RECOVERABLE VOLUME</span>
            <strong>
              {formatNumber(baseScenario.recoverableVolume)} m³
            </strong>
            <small>baseline calculation</small>
          </div>

          <div className="md-metric">
            <span>ANNUAL PLANNED PRODUCTION</span>
            <strong>
              {formatNumber(baseScenario.annualProduction)} t
            </strong>
            <small>derived from CMPDI capacity / planning inputs</small>
          </div>
        </div>

        <div className="md-warning-list">
          <div className="md-warning-item">
            <strong>Optimization summary:</strong>{" "}
            Production change{" "}
            {productionImprovement.toFixed(2)}%, recoverable-volume change{" "}
            {volumeImprovement.toFixed(2)}%, bench-count change{" "}
            {benchChange > 0 ? `+${benchChange}` : benchChange}, and stripping-ratio
            change {strippingChange != null ? strippingChange.toFixed(2) : "N/A"}.
          </div>

          <div className="md-warning-item">
            <strong>Engineering review:</strong>{" "}
            {finalDecisionReason}
          </div>

          <div className="md-warning-item">
            <strong>Annual schedule status:</strong>{" "}
            Fleet annual capacity is{" "}
            {formatNumber(scheduleCapacity.annualFleetCapacity)} t/year
            compared with a scheduled target of{" "}
            {formatNumber(schedule.yearlyTarget)} t/year.
          </div>
        </div>
      </section>

      {/* ======================================================
          METHODOLOGY
          ====================================================== */}

      <section className="md-section">

        <div className="md-section-header">

          <div>

            <p className="md-eyebrow">
              METHODOLOGY
            </p>

            <h2 className="md-section-title">
              Mine Design & Production Planning
            </h2>

          </div>

        </div>

        <div className="md-method">

          <p>
            <strong>
              Bench count
            </strong>{" "}
            =
            ceil(depth ÷ bench height).
          </p>

          <p>
            <strong>
              Annual production
            </strong>{" "}
            =
            daily target × working days.
          </p>

          <p>
            <strong>
              Truck cycle
            </strong>{" "}
            =
            loading + loaded travel +
            unloading + empty return +
            delay.
          </p>

          <p>
            <strong>
              Fleet capacity
            </strong>{" "}
            =
            truck production/day ×
            truck count.
          </p>

          <p>
            <strong>
              Required trucks
            </strong>{" "}
            =
            ceil(daily target ÷
            production/truck/day).
          </p>

          <p>
            <strong>
              Monthly production
            </strong>{" "}
            =
            daily target × allocated
            working days.
          </p>

          <p>
            <strong>
              Cumulative production
            </strong>{" "}
            =
            previous cumulative production
            + current production.
          </p>

          <p>
            <strong>
              Progress %
            </strong>{" "}
            =
            cumulative production ÷
            annual target × 100.
          </p>

          <p>
            <strong>
              Waste estimate
            </strong>{" "}
            =
            coal production ×
            stripping ratio.
          </p>

          <p>
            <strong>
              Total material
            </strong>{" "}
            =
            coal + waste.
          </p>

        </div>

        <div className="md-note">

          <strong>
            Planning disclaimer:
          </strong>{" "}
          Production, coal, waste and progress
          values shown in this prototype are
          planning calculations. Actual operational
          monitoring should use measured mine
          production records, survey data,
          equipment telemetry and approved mine
          plans.

        </div>

      </section>

    </div>
  );
}

export default MineDesignOptimization;