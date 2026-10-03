import csv
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "minqora.db")
CSV_PATH = os.path.join(BASE_DIR, "data", "minqora_unified_1200.csv")
TABLE_NAME = "mining_records"

_db = None

def get_connection():
    global _db
    if _db is None:
        _db = sqlite3.connect(
            DATABASE_PATH,
            timeout=30,
            check_same_thread=False
        )
        _db.row_factory = sqlite3.Row
    return _db

def initialize_database():
    conn = get_connection()

    count = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='mining_records'"
    ).fetchone()[0]

    if not count:
        raise RuntimeError("mining_records table does not exist")

    total = conn.execute(
        "SELECT COUNT(*) FROM mining_records"
    ).fetchone()[0]

    if total != 1200:
        raise RuntimeError(
            f"Database contains {total} records; expected 1200"
        )

    print("MINQORA PERSISTENT DATABASE READY:", total, "records")
    print("SOURCE:", CSV_PATH)

    return total

def _record(row):
    data = dict(row)

    data["mine"] = data.get("mine_name")
    data["thickness"] = data.get("thickness_m")
    data["depth"] = data.get("depth_m")
    data["production"] = data.get("production_tonnes")
    data["calorific_value"] = data.get("calorific_value_kcal_kg")
    data["calorific_value_kcal_kg"] = data.get("calorific_value_kcal_kg")
    data["reserve_mt"] = data.get("geological_reserve_mt")

    return data

def fetch_mining_records(limit=None):
    initialize_database()

    conn = get_connection()

    if limit is None:
        rows = conn.execute(
            "SELECT * FROM mining_records ORDER BY id"
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM mining_records ORDER BY id LIMIT ?",
            (int(limit),)
        ).fetchall()

    return [_record(row) for row in rows]

def get_database_status():
    conn = get_connection()

    total = conn.execute(
        "SELECT COUNT(*) FROM mining_records"
    ).fetchone()[0]

    mines = conn.execute(
        "SELECT COUNT(DISTINCT mine_name) FROM mining_records"
    ).fetchone()[0]

    seams = conn.execute(
        "SELECT COUNT(DISTINCT seam) FROM mining_records"
    ).fetchone()[0]

    return {
        "database": "SQLite",
        "status": "online",
        "database_file": "minqora.db",
        "database_path": DATABASE_PATH,
        "table": TABLE_NAME,
        "total_records": total,
        "unique_mines": mines,
        "unique_seams": seams,
        "source": CSV_PATH
    }
