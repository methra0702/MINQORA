import csv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "minqora_unified_1200.csv")


def num(value):
    try:
        if value is None or str(value).strip() == "":
            return None
        return float(str(value).strip())
    except Exception:
        return None


def load_csv_records():
    if not os.path.exists(CSV_PATH):
        raise RuntimeError(f"Dataset not found: {CSV_PATH}")

    records = []

    with open(
        CSV_PATH,
        encoding="utf-8-sig",
        newline=""
    ) as f:

        rows = csv.DictReader(f)

        for row in rows:

            records.append({
                "id": row.get("record_id"),
                "record_id": row.get("record_id"),
                "date": row.get("date"),
                "year": num(row.get("year")),
                "month": row.get("month"),

                "mine": row.get("mine_name"),
                "mine_name": row.get("mine_name"),

                "state": row.get("state"),
                "location": row.get("location"),
                "seam": row.get("seam"),

                "thickness_m": num(row.get("thickness_m")),
                "coal_thickness_m": num(row.get("coal_thickness_m")),

                "depth_m": num(row.get("depth_m")),

                "production_tonnes": num(
                    row.get("production_tonnes")
                ),

                "recovery": num(row.get("recovery")),
                "recovery_percent": num(
                    row.get("recovery_percent")
                ),

                "ash_content": num(
                    row.get("ash_content")
                ),
                "ash_percent": num(
                    row.get("ash_percent")
                ),

                "moisture": num(row.get("moisture")),
                "moisture_percent": num(
                    row.get("moisture_percent")
                ),

                "calorific_value": num(
                    row.get("calorific_value_kcal_kg")
                ),
                "calorific_value_kcal_kg": num(
                    row.get("calorific_value_kcal_kg")
                ),

                "geological_reserve_mt": num(
                    row.get("geological_reserve_mt")
                ),
                "reserve_mt": num(
                    row.get("geological_reserve_mt")
                ),

                "grade": row.get("grade"),
                "exploration_grade": row.get(
                    "exploration_grade"
                ),

                "risk_level": row.get("risk_level"),

                "source": row.get("source"),
                "source_url": row.get("source_url"),
                "source_status": row.get(
                    "source_status"
                ),

                "record_type":
                    "cmpdi_derived_analytical"
            })

    if len(records) != 1200:
        raise RuntimeError(
            f"Expected 1200 records, found {len(records)}"
        )

    return records


def initialize_database():
    records = load_csv_records()

    print("=" * 60)
    print("MINQORA DATA SOURCE READY")
    print("Backend: CSV")
    print("Dataset: minqora_unified_1200.csv")
    print("Records:", len(records))
    print("Status: DATABASE-INDEPENDENT")
    print("=" * 60)

    return len(records)


def fetch_mining_records(limit=None):

    records = load_csv_records()

    if limit is not None:
        return records[:int(limit)]

    return records


def get_database_status():

    records = load_csv_records()

    mines = len(
        set(
            r["mine_name"]
            for r in records
            if r.get("mine_name")
        )
    )

    seams = len(
        set(
            r["seam"]
            for r in records
            if r.get("seam")
        )
    )

    return {
        "database": "CSV",
        "status": "online",
        "database_file": None,
        "database_path": None,
        "table": "mining_records",
        "total_records": len(records),
        "unique_mines": mines,
        "unique_seams": seams,
        "source": CSV_PATH
    }
