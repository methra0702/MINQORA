from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import csv
import json
import math
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
CSV_FILE = PROJECT_DIR / "data" / "mining_data.csv"
CMPDI_FILE = PROJECT_DIR / "data" / "cmpdi" / "cmpdi_multi_mine.json"

app = FastAPI(
    title="MINQORA Unified Data Layer",
    version="1.1.0",
    description="Unified MINQORA data API with real-source, derived and demonstration provenance."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def to_float(value):
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "").replace("%", "").strip())
    except Exception:
        return None


def to_int(value):
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).replace(",", "").strip()))
    except Exception:
        return None


def clean_json_value(value):
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {k: clean_json_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [clean_json_value(v) for v in value]
    return value


def load_demo_records():
    """Existing prototype history. Explicitly kept as demonstration data."""
    if not CSV_FILE.exists():
        return []

    records = []
    with CSV_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader, start=1):
            record_id = to_int(row.get("record_id")) or index
            records.append({
                **dict(row),
                "id": record_id,
                "record_id": record_id,
                "mine": row.get("mine") or row.get("mine_name"),
                "mine_name": row.get("mine_name") or row.get("mine"),
                "seam": row.get("seam"),
                "year": to_int(row.get("year")),
                "thickness_m": to_float(row.get("thickness_m") or row.get("coal_thickness_m")),
                "depth_m": to_float(row.get("depth_m")),
                "production_tonnes": to_float(row.get("production_tonnes")),
                "recovery": to_float(row.get("recovery") or row.get("recovery_percent")),
                "ash_content": to_float(row.get("ash_content") or row.get("ash_percent")),
                "moisture": to_float(row.get("moisture") or row.get("moisture_percent")),
                "latitude": to_float(row.get("latitude")),
                "longitude": to_float(row.get("longitude")),
                "elevation_m": to_float(row.get("elevation_m")),
                "risk_level": (row.get("risk_level") or "").upper() or None,
                "data_status": "DEMONSTRATION",
                "record_type": "PROTOTYPE_HISTORY",
                "source_type": "MINQORA prototype dataset",
                "source_org": None,
                "source_id": "prototype_1000_record_dataset",
                "source_note": "Existing 1,000-record prototype dataset; not represented as official CMPDI/CIL source data.",
                "field_provenance": {
                    "all_displayed_fields": "DEMONSTRATION"
                },
            })
    return records


def load_cmpdi_package():
    if not CMPDI_FILE.exists():
        return {"mines": [], "source_metadata": {}}
    with CMPDI_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


# These are UI-completion values, not claimed CMPDI measurements.
# They exist so the prototype demonstrates a complete mining-data workflow.
# Every such field is explicitly marked DEMONSTRATION below.
GRADE_BENCHMARKS = {
    "B": {"recovery": 86.0, "ash": 15.0, "moisture": 3.5},
    "C": {"recovery": 85.0, "ash": 18.0, "moisture": 4.0},
    "D": {"recovery": 83.0, "ash": 23.0, "moisture": 4.5},
    "E": {"recovery": 81.0, "ash": 28.0, "moisture": 5.0},
    "F": {"recovery": 79.0, "ash": 33.0, "moisture": 5.5},
    "G": {"recovery": 77.0, "ash": 38.0, "moisture": 6.0},
}


def primary_grade(grade):
    text = str(grade or "").upper()
    for letter in "BCDEFG":
        if letter in text:
            return letter
    return "E"


def benchmark_values(grade, depth_max=None, thickness_max=None):
    base = GRADE_BENCHMARKS.get(primary_grade(grade), GRADE_BENCHMARKS["E"]).copy()

    # Small deterministic adjustment keeps different records visually distinct.
    if thickness_max is not None:
        base["recovery"] += min(2.0, max(-2.0, (float(thickness_max) - 5.0) * 0.15))
    if depth_max is not None:
        base["moisture"] += min(1.0, max(0.0, (float(depth_max) - 100.0) / 500.0))

    return {
        "recovery": round(base["recovery"], 1),
        "ash": round(base["ash"], 1),
        "moisture": round(base["moisture"], 1),
    }



def demo_geology_fallback(mine_name, seam_name, index, grade=None):
    """Presentation-completion values used only when public seam thickness/depth are unavailable.
    These are explicitly DEMONSTRATION values and are never presented as CMPDI measurements.
    """
    text = f"{mine_name}|{seam_name}|{index}"
    seed = sum(ord(ch) for ch in text)
    grade_letter = primary_grade(grade)
    grade_adjust = {"B": 0.35, "C": 0.20, "D": 0.10, "E": 0.0, "F": -0.10, "G": -0.20}.get(grade_letter, 0.0)
    thickness = round(max(0.85, 2.40 + ((seed % 320) / 100.0) + grade_adjust), 2)
    depth = round(55.0 + (seed % 210) + (index % 7) * 3.5, 2)
    return thickness, depth


def demo_production(mine_name, seam_name, reserve_mt, index):
    """Non-zero illustrative annual production when no PRC is published in the package."""
    if reserve_mt is not None and reserve_mt > 0:
        value = min(900000.0, max(75000.0, reserve_mt * 1000000.0 * 0.0035))
    else:
        value = 100000.0 + (index % 8) * 25000.0
    # deterministic small variation by name/seam
    seed = sum(ord(ch) for ch in f"{mine_name}|{seam_name}")
    value *= 0.92 + (seed % 17) / 100.0
    return round(max(50000.0, value), 0)

def screening_risk(depth_max=None, thickness_min=None, thickness_max=None):
    """
    MINQORA screening classification for demonstration/decision-support UI.
    It is not an official CMPDI risk rating.
    """
    d = float(depth_max or 0)
    t = float(thickness_max or 0)

    if d >= 240 or (t > 0 and t < 0.75):
        return "HIGH"
    if d >= 180 or (t > 0 and t < 1.25):
        return "MEDIUM"
    return "LOW"


def seam_metrics_for_mine(seams):
    valid = []
    for s in seams:
        tmin = to_float(s.get("thickness_min_m"))
        tmax = to_float(s.get("thickness_max_m"))
        dmin = to_float(s.get("depth_min_m"))
        dmax = to_float(s.get("depth_max_m"))
        reserve = to_float(s.get("geological_reserve_mt"))
        if tmin is not None or tmax is not None or dmin is not None or dmax is not None:
            valid.append({
                "tmin": tmin, "tmax": tmax, "dmin": dmin, "dmax": dmax,
                "reserve": reserve or 0.0
            })

    if not valid:
        return {"avg_thickness": None, "avg_depth": None}

    weights = [max(0.001, x["reserve"]) for x in valid]
    total_w = sum(weights)

    def midpoint(a, b):
        if a is not None and b is not None:
            return (a + b) / 2.0
        return a if a is not None else b

    weighted_t = sum(midpoint(x["tmin"], x["tmax"]) * w for x, w in zip(valid, weights)
                     if midpoint(x["tmin"], x["tmax"]) is not None)
    weighted_d = sum(midpoint(x["dmin"], x["dmax"]) * w for x, w in zip(valid, weights)
                     if midpoint(x["dmin"], x["dmax"]) is not None)

    return {
        "avg_thickness": round(weighted_t / total_w, 2) if total_w else None,
        "avg_depth": round(weighted_d / total_w, 2) if total_w else None,
    }


def build_real_cmpdi_records(package):
    """
    Converts source-traceable CMPDI/public information into the legacy Mining
    Data shape while preserving per-field provenance.

    Important:
    - Published seam thickness/depth ranges are source-backed.
    - Their midpoint is a MINQORA-derived display metric.
    - Production is an illustrative planned allocation derived from mine PRC
      and seam reserve share, not historical production.
    - Recovery/ash/moisture are demonstration benchmarks.
    - Risk is a MINQORA screening classification, not an official rating.
    """
    output = []
    next_id = 100000

    for mine in package.get("mines", []):
        mine_name = mine.get("name") or "Unknown Mine"
        block = mine.get("block") or {}
        exploration = mine.get("exploration") or {}
        spatial = mine.get("spatial") or {}
        snapshots = mine.get("historical_snapshots") or []
        seams = mine.get("seams") or []

        latest = snapshots[-1] if snapshots else {}
        source_year = latest.get("year")
        prc_mtpa = to_float(block.get("prc_mtpa"))
        resource_mt = to_float(block.get("geological_resource_mt"))
        metrics = seam_metrics_for_mine(seams)

        # Block summary is useful for the data-center UI, but it is not a seam.
        next_id += 1
        summary_t = metrics.get("avg_thickness")
        summary_d = metrics.get("avg_depth")
        summary_t_prov = "DERIVED"
        summary_d_prov = "DERIVED"
        if summary_t is None or summary_d is None:
            demo_t, demo_d = demo_geology_fallback(mine_name, "BLOCK SUMMARY", next_id, block.get("grade"))
            summary_t = summary_t if summary_t is not None else demo_t
            summary_d = summary_d if summary_d is not None else demo_d
            if metrics.get("avg_thickness") is None:
                summary_t_prov = "DEMONSTRATION"
            if metrics.get("avg_depth") is None:
                summary_d_prov = "DEMONSTRATION"
        block_bench = benchmark_values(block.get("grade"), summary_d, summary_t)
        block_risk = screening_risk(
            depth_max=summary_d,
            thickness_min=None,
            thickness_max=summary_t,
        )
        block_production = round(prc_mtpa * 1_000_000, 0) if prc_mtpa is not None else demo_production(mine_name, "BLOCK SUMMARY", resource_mt, next_id)
        block_production_prov = "DERIVED_PLANNED" if prc_mtpa is not None else "DEMONSTRATION"

        output.append({
            "id": next_id,
            "record_id": next_id,
            "date": str(source_year) if source_year else None,
            "year": source_year,
            "mine": mine_name,
            "mine_name": mine_name,
            "seam": "BLOCK SUMMARY",
            "thickness_m": round(summary_t, 2),
            "depth_m": round(summary_d, 2),
            "production_tonnes": block_production,
            "recovery": block_bench["recovery"],
            "ash_content": block_bench["ash"],
            "moisture": block_bench["moisture"],
            "risk_level": block_risk,
            "area_km2": block.get("area_km2"),
            "geological_resource_mt": resource_mt,
            "grade": block.get("grade"),
            "exploration_status": block.get("exploration_status"),
            "exploration_grade": exploration.get("exploration_grade"),
            "prc_mtpa": prc_mtpa,
            "mining_method": block.get("mining_method"),
            "boreholes": exploration.get("boreholes"),
            "drilling_m": exploration.get("drilling_m"),
            "boreholes_per_km2": exploration.get("boreholes_per_km2"),
            "strike": exploration.get("strike"),
            "dip": exploration.get("dip"),
            "spatial_status": spatial.get("status"),
            "coordinates_available": spatial.get("coordinates_available"),
            "dtm_available": spatial.get("dtm_available"),
            "data_status": "REAL_SOURCE",
            "record_type": "BLOCK_SUMMARY",
            "source_type": "Government/CMPDI public source package",
            "source_org": "CMPDI / Ministry of Coal",
            "source_id": "cmpdi_multi_mine.json",
            "source_note": "Block identity, resource/capacity/exploration fields are source-backed. Displayed production is planned-capacity derived from PRC; recovery/ash/moisture are demonstration benchmarks; risk is MINQORA screening.",
            "field_provenance": {
                "mine_name": "REAL_SOURCE",
                "seam": "REAL_SOURCE",
                "thickness_m": summary_t_prov,
                "depth_m": summary_d_prov,
                "production_tonnes": block_production_prov,
                "recovery": "DEMONSTRATION",
                "ash_content": "DEMONSTRATION",
                "moisture": "DEMONSTRATION",
                "risk_level": "DERIVED_SCREENING",
            },
        })

        total_reserve = sum(
            to_float(s.get("geological_reserve_mt")) or 0.0 for s in seams
        )

        for seam in seams:
            next_id += 1
            tmin = to_float(seam.get("thickness_min_m"))
            tmax = to_float(seam.get("thickness_max_m"))
            dmin = to_float(seam.get("depth_min_m"))
            dmax = to_float(seam.get("depth_max_m"))
            reserve = to_float(seam.get("geological_reserve_mt"))

            thickness_mid = (tmin + tmax) / 2 if tmin is not None and tmax is not None else (tmin if tmin is not None else tmax)
            depth_mid = (dmin + dmax) / 2 if dmin is not None and dmax is not None else (dmin if dmin is not None else dmax)

            thickness_provenance = "DERIVED" if thickness_mid is not None else "DEMONSTRATION"
            depth_provenance = "DERIVED" if depth_mid is not None else "DEMONSTRATION"
            if thickness_mid is None or depth_mid is None:
                demo_t, demo_d = demo_geology_fallback(mine_name, seam.get("seam") or "SEAM", next_id, seam.get("grade"))
                thickness_mid = thickness_mid if thickness_mid is not None else demo_t
                depth_mid = depth_mid if depth_mid is not None else demo_d

            # Illustrative planned annual production allocation from the mine's
            # stated PRC, distributed by each seam's reserve share. If PRC is not
            # published, use an explicitly DEMONSTRATION value so the UI never
            # displays a misleading zero.
            planned_production = None
            production_provenance = "DERIVED_PLANNED"
            if prc_mtpa is not None and reserve is not None and total_reserve > 0:
                planned_production = round(
                    prc_mtpa * 1_000_000 * (reserve / total_reserve), 0
                )
            else:
                planned_production = demo_production(mine_name, seam.get("seam") or "SEAM", reserve, next_id)
                production_provenance = "DEMONSTRATION"

            bench = benchmark_values(seam.get("grade"), depth_mid, thickness_mid)
            risk = screening_risk(depth_mid, tmin, tmax)

            output.append({
                "id": next_id,
                "record_id": next_id,
                "date": str(source_year) if source_year else None,
                "year": source_year,
                "mine": mine_name,
                "mine_name": mine_name,
                "seam": seam.get("seam"),
                "thickness_m": round(thickness_mid, 2),
                "thickness_min_m": tmin,
                "thickness_max_m": tmax,
                "depth_m": round(depth_mid, 2),
                "depth_min_m": dmin,
                "depth_max_m": dmax,
                "production_tonnes": planned_production,
                "recovery": bench["recovery"],
                "ash_content": bench["ash"],
                "moisture": bench["moisture"],
                "risk_level": risk,
                "geological_reserve_mt": reserve,
                "grade": seam.get("grade"),
                "data_status": "REAL_SOURCE",
                "record_type": "SEAM",
                "source_type": "Government/CMPDI public source package",
                "source_org": "CMPDI / Ministry of Coal",
                "source_id": "cmpdi_multi_mine.json",
                "source_note": seam.get("source") or "Verified public seam information. Thickness/depth midpoints are MINQORA-derived; production is illustrative planned allocation from stated PRC; recovery/ash/moisture are demonstration benchmarks; risk is MINQORA screening.",
                "field_provenance": {
                    "mine_name": "REAL_SOURCE",
                    "seam": "REAL_SOURCE",
                    "thickness_range": "REAL_SOURCE",
                    "thickness_m": thickness_provenance,
                    "depth_range": "REAL_SOURCE" if dmin is not None or dmax is not None else "UNAVAILABLE_PUBLIC_SOURCE",
                    "depth_m": depth_provenance,
                    "geological_reserve_mt": "REAL_SOURCE",
                    "grade": "REAL_SOURCE",
                    "production_tonnes": production_provenance,
                    "recovery": "DEMONSTRATION",
                    "ash_content": "DEMONSTRATION",
                    "moisture": "DEMONSTRATION",
                    "risk_level": "DERIVED_SCREENING",
                },
            })

    return output


_DEMO_CACHE = None
_REAL_CACHE = None


def demo_records():
    global _DEMO_CACHE
    if _DEMO_CACHE is None:
        _DEMO_CACHE = load_demo_records()
    return list(_DEMO_CACHE)


def real_records():
    global _REAL_CACHE
    if _REAL_CACHE is None:
        _REAL_CACHE = build_real_cmpdi_records(load_cmpdi_package())
    return list(_REAL_CACHE)


def unified_records():
    return real_records() + demo_records()


def apply_filters(records, date=None, mine_name=None, seam=None, risk_level=None):
    result = records
    if date:
        result = [r for r in result if str(r.get("date") or "") == str(date)]
    if mine_name:
        q = mine_name.strip().lower()
        result = [r for r in result if q in str(r.get("mine_name") or r.get("mine") or "").lower()]
    if seam:
        q = seam.strip().lower()
        result = [r for r in result if q in str(r.get("seam") or "").lower()]
    if risk_level:
        q = risk_level.strip().upper()
        result = [r for r in result if str(r.get("risk_level") or "").upper() == q]
    return result


@app.get("/")
def root():
    return {
        "service": "MINQORA Unified Data Layer",
        "status": "online",
        "version": "1.1.0",
        "port": 8003,
        "data_policy": "REAL_SOURCE + DERIVED + DEMONSTRATION are explicitly separated",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "unified-data",
        "demo_records": len(demo_records()),
        "real_source_records": len(real_records()),
        "total_records": len(unified_records()),
        "cmpdi_file_available": CMPDI_FILE.exists(),
    }


@app.get("/data")
def data_summary():
    records = unified_records()
    production = [to_float(r.get("production_tonnes")) for r in records if to_float(r.get("production_tonnes")) is not None]
    return clean_json_value({
        "status": "online",
        "total_records": len(records),
        "real_source_records": len(real_records()),
        "demonstration_records": len(demo_records()),
        "production_display": "Real-source + MINQORA planned/illustrative values; not historical CMPDI production",
        "total_production_display": sum(production),
        "phase": "Unified Data Foundation",
    })


@app.get("/mining-data")
def mining_data(
    page: int = 1,
    limit: int = 25,
    date: Optional[str] = None,
    mine_name: Optional[str] = None,
    seam: Optional[str] = None,
    risk_level: Optional[str] = None,
    data_status: Optional[str] = None,
):
    page = max(1, page)
    limit = max(1, min(limit, 5000))

    records = apply_filters(
        unified_records(),
        date=date,
        mine_name=mine_name,
        seam=seam,
        risk_level=risk_level,
    )

    if data_status:
        wanted = data_status.strip().upper()
        records = [r for r in records if str(r.get("data_status") or "").upper() == wanted]

    total = len(records)
    total_pages = max(1, math.ceil(total / limit))
    page = min(page, total_pages)
    start = (page - 1) * limit
    end = start + limit

    return clean_json_value({
        "records": records[start:end],
        "count": total,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": total_pages,
        },
        "data_classes": {
            "REAL_SOURCE": len([r for r in records if r.get("data_status") == "REAL_SOURCE"]),
            "DEMONSTRATION": len([r for r in records if r.get("data_status") == "DEMONSTRATION"]),
            "DERIVED": 0,
        },
    })


@app.get("/mining-data/statistics/summary")
def statistics_summary():
    records = unified_records()
    demo = demo_records()
    real = real_records()

    production = [to_float(r.get("production_tonnes")) for r in records if to_float(r.get("production_tonnes")) is not None]
    recovery = [to_float(r.get("recovery")) for r in records if to_float(r.get("recovery")) is not None]

    mines = sorted({
        str(r.get("mine_name") or r.get("mine"))
        for r in records
        if r.get("mine_name") or r.get("mine")
    })

    return clean_json_value({
        "summary": {
            "total_records": len(records),
            "total_mines": len(mines),
            "real_source_records": len(real),
            "demonstration_records": len(demo),
            "records_with_display_production": len(production),
            "display_production_total": sum(production),
            "display_average_recovery": sum(recovery) / len(recovery) if recovery else None,
        },
        "data_quality": {
            "real_source": "CMPDI/Ministry of Coal source-traceable mine, exploration, seam and resource information",
            "derived": "MINQORA midpoint, planned production allocation and screening calculations",
            "demonstration": "Operational-looking values used to complete the prototype where public source data does not publish those measurements",
        },
    })


@app.get("/unified-data")
def unified_data():
    return clean_json_value({
        "status": "success",
        "data_classes": {
            "real_source": real_records(),
            "demonstration": demo_records(),
            "derived": [],
        },
        "cmpdi_package": load_cmpdi_package(),
    })


@app.get("/cmpdi/multi-mine/all")
def cmpdi_all():
    return clean_json_value(load_cmpdi_package())


@app.get("/cmpdi/real-records")
def cmpdi_real_records():
    records = real_records()
    return clean_json_value({
        "records": records,
        "count": len(records),
        "data_status": "REAL_SOURCE",
        "note": "Some displayed operational fields are explicitly marked DERIVED_PLANNED, DERIVED_SCREENING or DEMONSTRATION in field_provenance.",
    })


@app.get("/cmpdi/multi-mine/summary")
def cmpdi_summary():
    package = load_cmpdi_package()
    mines = package.get("mines", [])
    return clean_json_value({
        "status": "success",
        "count": len(mines),
        "mines": [
            {
                "id": m.get("id"),
                "name": m.get("name"),
                "block": m.get("block", {}),
                "exploration": m.get("exploration", {}),
            }
            for m in mines
        ],
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("unified_data_server:app", host="127.0.0.1", port=8003, reload=True)
