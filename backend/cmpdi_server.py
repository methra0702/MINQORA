from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json


# ---------------------------------------------------------
# MINQORA Real CMPDI Multi-Mine Data API
# ---------------------------------------------------------

app = FastAPI(
    title="MINQORA CMPDI Real Data API",
    description="API for source-traceable CMPDI geological and historical mine data",
    version="2.0.0",
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# DATA LOCATIONS
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

CMPDI_ROOT = BASE_DIR / "data" / "cmpdi"
MACHHAKATA_DIR = CMPDI_ROOT / "machhakata"

# This is the unified real-data file created for the six CMPDI mines.
MULTI_MINE_FILE = CMPDI_ROOT / "cmpdi_multi_mine.json"


# ---------------------------------------------------------
# SIX REAL CMPDI MINES
# ---------------------------------------------------------

EXPECTED_MINES = [
    "Machhakata (Revised)",
    "Mahanadi",
    "Chhendipada",
    "Chhendipada-II",
    "North of Arkhapal Srirampur",
    "Ramchandi Promotion Block",
]


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------

def read_json(file_path: Path):
    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Data file not found: {file_path}",
        )

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON in {file_path.name}: {str(exc)}",
        )


def load_json(filename: str):
    """
    Backward-compatible loader for the original Machhakata files.
    """
    return read_json(MACHHAKATA_DIR / filename)


def extract_mines_from_multi_file(data):
    """
    The unified JSON has been intentionally kept flexible here so the
    API can continue working if its top-level collection is represented
    as 'mines', 'blocks', or 'data'.
    """
    if isinstance(data, list):
        return data

    if not isinstance(data, dict):
        return []

    for key in ("mines", "blocks", "records"):
        value = data.get(key)
        if isinstance(value, list):
            return value

    value = data.get("data")
    if isinstance(value, list):
        return value

    if isinstance(value, dict):
        for key in ("mines", "blocks", "records"):
            nested = value.get(key)
            if isinstance(nested, list):
                return nested

    return []


def mine_name(mine):
    """
    Read the mine/block name without changing the underlying source data.
    """
    if not isinstance(mine, dict):
        return ""

    for key in (
        "mine_name",
        "name",
        "block_name",
        "block",
        "mine",
    ):
        value = mine.get(key)

        if isinstance(value, dict):
            value = value.get("value") or value.get("name")

        if value not in (None, ""):
            return str(value)

    # Some datasets store the name inside a nested block object.
    block = mine.get("block")

    if isinstance(block, dict):
        for key in ("mine_name", "name", "block_name", "block"):
            value = block.get(key)
            if value not in (None, ""):
                return str(value)

    return ""


def load_multi_mine_data():
    """
    Load the unified six-mine source file.
    """
    data = read_json(MULTI_MINE_FILE)
    mines = extract_mines_from_multi_file(data)

    if not mines:
        raise HTTPException(
            status_code=500,
            detail=(
                "cmpdi_multi_mine.json was found, but no mine collection "
                "could be read from it."
            ),
        )

    return data, mines


def find_mine(name: str):
    """
    Find a real mine by exact name first, then case-insensitively.
    """
    _, mines = load_multi_mine_data()

    for mine in mines:
        if mine_name(mine) == name:
            return mine

    wanted = name.strip().casefold()

    for mine in mines:
        if mine_name(mine).strip().casefold() == wanted:
            return mine

    raise HTTPException(
        status_code=404,
        detail=f"CMPDI mine not found: {name}",
    )


def nested_value(mine, key, default=None):
    """
    Return a top-level value first and then look inside the common
    nested objects used by the source package.
    """
    if not isinstance(mine, dict):
        return default

    if key in mine:
        return mine[key]

    for container_key in (
        "block",
        "block_data",
        "exploration",
        "exploration_data",
        "spatial",
        "spatial_data",
    ):
        container = mine.get(container_key)

        if isinstance(container, dict) and key in container:
            return container[key]

    return default


def mine_summary(mine):
    """
    Produce a small API-friendly summary while retaining source data.
    No values are calculated or fabricated here.
    """
    return {
        "name": mine_name(mine),
        "state": nested_value(mine, "state"),
        "coalfield": nested_value(mine, "coalfield"),
        "area_km2": nested_value(mine, "area_km2"),
        "resource_mt": nested_value(mine, "geological_resource_mt"),
        "grade": nested_value(mine, "grade"),
        "exploration_status": nested_value(mine, "exploration_status"),
        "exploration_grade": nested_value(mine, "exploration_grade"),
        "prc_mtpa": nested_value(mine, "prc_mtpa"),
        "mining_method": nested_value(mine, "mining_method"),
    }


# ---------------------------------------------------------
# HEALTH
# ---------------------------------------------------------

@app.get("/cmpdi/health")
def health():
    machhakata_files = [
        "block.json",
        "seams.json",
        "exploration.json",
        "spatial.json",
        "sources.json",
    ]

    available_files = [
        filename
        for filename in machhakata_files
        if (MACHHAKATA_DIR / filename).exists()
    ]

    multi_mine_available = MULTI_MINE_FILE.exists()

    mine_count = 0

    if multi_mine_available:
        try:
            _, mines = load_multi_mine_data()
            mine_count = len(mines)
        except Exception:
            mine_count = 0

    return {
        "status": "healthy",
        "service": "MINQORA CMPDI Real Data API",
        "multi_mine_file_available": multi_mine_available,
        "real_mines_loaded": mine_count,
        "expected_real_mines": len(EXPECTED_MINES),
        "expected_mines": EXPECTED_MINES,
        "machhakata_files_available": len(available_files),
        "machhakata_files_expected": len(machhakata_files),
        "machhakata_files": available_files,
    }


# ---------------------------------------------------------
# MULTI-MINE INFORMATION
# ---------------------------------------------------------

@app.get("/cmpdi/multi-mine")
def get_multi_mine():
    data, mines = load_multi_mine_data()

    return {
        "status": "success",
        "mine_count": len(mines),
        "mines": mines,
        "source_metadata": (
            data.get("source_metadata")
            if isinstance(data, dict)
            else None
        ),
    }


@app.get("/cmpdi/multi-mine/summary")
def get_multi_mine_summary():
    _, mines = load_multi_mine_data()

    return {
        "status": "success",
        "count": len(mines),
        "mines": [mine_summary(mine) for mine in mines],
    }


@app.get("/cmpdi/multi-mine/all")
def get_multi_mine_all():
    """
    Main endpoint used by the new Geological Intelligence page.
    """
    data, mines = load_multi_mine_data()

    return {
        "status": "success",
        "count": len(mines),
        "mines": mines,
        "source_metadata": (
            data.get("source_metadata")
            if isinstance(data, dict)
            else None
        ),
    }


@app.get("/cmpdi/multi-mine/{mine}")
def get_single_multi_mine(mine: str):
    return {
        "status": "success",
        "mine": find_mine(mine),
    }


# ---------------------------------------------------------
# ORIGINAL MACHHAKATA ENDPOINTS
# ---------------------------------------------------------
# These are intentionally retained so Resource Evaluation and
# CMPDIRealData continue working exactly as before.
# ---------------------------------------------------------

@app.get("/cmpdi/blocks")
def get_blocks():
    block = load_json("block.json")

    return {
        "status": "success",
        "count": 1,
        "blocks": [block],
    }


@app.get("/cmpdi/machhakata")
def get_machhakata():
    block = load_json("block.json")

    return {
        "status": "success",
        "block": block,
    }


@app.get("/cmpdi/machhakata/seams")
def get_seams():
    seams = load_json("seams.json")

    return {
        "status": "success",
        "block_name": seams.get("block_name"),
        "dataset_type": seams.get("dataset_type"),
        "seam_count": len(seams.get("seams", [])),
        "seams": seams.get("seams", []),
        "total_geological_reserve_mt": seams.get(
            "total_geological_reserve_mt"
        ),
        "source": seams.get("source"),
    }


@app.get("/cmpdi/machhakata/exploration")
def get_exploration():
    exploration = load_json("exploration.json")

    return {
        "status": "success",
        "exploration": exploration,
    }


@app.get("/cmpdi/machhakata/spatial")
def get_spatial():
    spatial = load_json("spatial.json")

    return {
        "status": "success",
        "spatial": spatial,
    }


@app.get("/cmpdi/machhakata/sources")
def get_sources():
    sources = load_json("sources.json")

    return {
        "status": "success",
        "sources": sources,
    }


@app.get("/cmpdi/machhakata/all")
def get_all_data():
    return {
        "status": "success",
        "block": load_json("block.json"),
        "seams": load_json("seams.json"),
        "exploration": load_json("exploration.json"),
        "spatial": load_json("spatial.json"),
        "sources": load_json("sources.json"),
    }


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "MINQORA CMPDI Real Data API",
        "status": "running",
        "version": "2.0.0",
        "real_mines": EXPECTED_MINES,
        "docs": "/docs",
    }
