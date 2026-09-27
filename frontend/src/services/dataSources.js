const UNIFIED_API = "http://127.0.0.1:8003";
const BRAIN1_API = "http://127.0.0.1:8000";
const CMPDI_API = "http://127.0.0.1:8002";

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const error = await response.json();
      message = error.detail || error.message || message;
    } catch {
      // Keep default message
    }

    throw new Error(message);
  }

  return response.json();
}

// ============================================================
// UNIFIED DATA LAYER
// ============================================================

export async function getUnifiedHealth() {
  return fetchJSON(`${UNIFIED_API}/unified/health`);
}

export async function getUnifiedSummary() {
  return fetchJSON(`${UNIFIED_API}/unified/summary`);
}

export async function getUnifiedData(limit = 1000) {
  return fetchJSON(`${UNIFIED_API}/unified/all?limit=${limit}`);
}

export async function getLargeMiningData({
  mine = "all",
  seam = "all",
  limit = 1000,
} = {}) {
  const params = new URLSearchParams();

  if (mine && mine !== "all") {
    params.set("mine", mine);
  }

  if (seam && seam !== "all") {
    params.set("seam", seam);
  }

  params.set("limit", String(limit));

  return fetchJSON(
    `${UNIFIED_API}/unified/mining-data?${params.toString()}`
  );
}

export async function getRealCMPDIData() {
  return fetchJSON(`${UNIFIED_API}/unified/cmpdi`);
}

// ============================================================
// ORIGINAL BRAIN 1 APIs
// ============================================================

export async function getBrain1Health() {
  return fetchJSON(`${BRAIN1_API}/health`);
}

export async function getBrain1MiningData() {
  return fetchJSON(`${BRAIN1_API}/mining-data`);
}

// ============================================================
// REAL CMPDI SERVER
// ============================================================

export async function getCMPDIAll() {
  return fetchJSON(`${CMPDI_API}/cmpdi/multi-mine/all`);
}

export async function getCMPDISummary() {
  return fetchJSON(`${CMPDI_API}/cmpdi/multi-mine/summary`);
}

// ============================================================
// DATA STATUS
// ============================================================

export const DATA_STATUS = {
  REAL: "REAL_SOURCE",
  EXISTING: "EXISTING_LARGE_DATASET",
  DERIVED: "MINQORA_DERIVED",
  DEMO: "DEMONSTRATION",
};

export function getDataStatusLabel(status) {
  switch (status) {
    case DATA_STATUS.REAL:
      return "Real Source Data";

    case DATA_STATUS.EXISTING:
      return "Existing Large Dataset";

    case DATA_STATUS.DERIVED:
      return "MINQORA-Derived";

    case DATA_STATUS.DEMO:
      return "Demonstration Scenario";

    default:
      return "Source Status Unknown";
  }
}

export function getDataStatusColor(status) {
  switch (status) {
    case DATA_STATUS.REAL:
      return "green";

    case DATA_STATUS.EXISTING:
      return "blue";

    case DATA_STATUS.DERIVED:
      return "purple";

    case DATA_STATUS.DEMO:
      return "orange";

    default:
      return "gray";
  }
}