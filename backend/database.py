import csv
import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "minqora.db")
CSV_PATH = os.path.join(BASE_DIR, "data", "minqora_unified_1200.csv")

_db = None

COLUMNS = [
    "record_id",
    "date",
    "year",
    "month",
    "mine",
    "mine_name",
    "state",
    "location",
    "seam",
    "thickness_m",
    "coal_thickness_m",
    "depth_m",
    "production_tonnes",
    "recovery",
    "recovery_percent",
    "ash_content",
    "ash_percent",
    "moisture",
    "moisture_percent",
    "calorific_value",
    "geological_reserve_mt",
    "reserve_mt",
    "grade",
    "exploration_grade",
    "risk_level",
    "source",
    "source_url",
    "source_status",
    "record_type"
]


def get_connection():
    global _db

    if _db is None:
        _db = sqlite3.connect(
            DATABASE_PATH,
            timeout=30,
            check_same_thread=False
        )
        _db.row_factory = sqlite3.Row
        _db.execute("PRAGMA busy_timeout=30000")

    return _db


def num(value):
    try:
        if value is None or str(value).strip() == "":
            return None
        return float(str(value).strip())
    except Exception:
        return None


def create_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS mining_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            record_id TEXT,
            date TEXT,
            year INTEGER,
            month TEXT,
            mine TEXT,
            mine_name TEXT,
            state TEXT,
            location TEXT,
            seam TEXT,
            thickness_m REAL,
            coal_thickness_m REAL,
            depth_m REAL,
            production_tonnes REAL,
            recovery REAL,
            recovery_percent REAL,
            ash_content REAL,
            ash_percent REAL,
            moisture REAL,
            moisture_percent REAL,
            calorific_value REAL,
            geological_reserve_mt REAL,
            reserve_mt REAL,
            grade TEXT,
            exploration_grade TEXT,
            risk_level TEXT,
            source TEXT,
            source_url TEXT,
            source_status TEXT,
            record_type TEXT
        )
    """)

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_mining_mine "
        "ON mining_records(mine)"
    )

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_mining_seam "
        "ON mining_records(seam)"
    )

    conn.commit()


def seed_database(conn):

    if not os.path.exists(CSV_PATH):
        raise RuntimeError(
            f"Mining dataset not found: {CSV_PATH}"
        )

    with open(
        CSV_PATH,
        encoding="utf-8-sig",
        newline=""
    ) as f:
        rows = list(csv.DictReader(f))

    if len(rows) != 1200:
        raise RuntimeError(
            f"Expected 1200 CSV records, found {len(rows)}"
        )

    conn.execute("DELETE FROM mining_records")

    placeholders = ",".join(["?"] * len(COLUMNS))

    sql = f"""
        INSERT INTO mining_records (
            {",".join(COLUMNS)}
        )
        VALUES (
            {placeholders}
        )
    """

    for row in rows:

        values = [
            row.get("record_id"),
            row.get("date"),
            int(row["year"]) if row.get("year") else None,
            row.get("month"),
            row.get("mine_name"),
            row.get("mine_name"),
            row.get("state"),
            row.get("location"),
            row.get("seam"),
            num(row.get("thickness_m")),
            num(row.get("coal_thickness_m")),
            num(row.get("depth_m")),
            num(row.get("production_tonnes")),
            num(row.get("recovery")),
            num(row.get("recovery_percent")),
            num(row.get("ash_content")),
            num(row.get("ash_percent")),
            num(row.get("moisture")),
            num(row.get("moisture_percent")),
            num(row.get("calorific_value_kcal_kg")),
            num(row.get("geological_reserve_mt")),
            num(row.get("geological_reserve_mt")),
            row.get("grade"),
            row.get("exploration_grade"),
            row.get("risk_level"),
            row.get("source"),
            row.get("source_url"),
            row.get("source_status"),
            "cmpdi_derived_analytical"
        ]

        if len(values) != len(COLUMNS):
            raise RuntimeError(
                f"Column/value mismatch: {len(COLUMNS)} columns, "
                f"{len(values)} values"
            )

        conn.execute(sql, values)

    conn.commit()

    print("=" * 60)
    print("MINQORA DATABASE SEEDED")
    print("Source:", CSV_PATH)
    print("Records:", len(rows))
    print("Status: DATABASE-BACKED")
    print("=" * 60)


def initialize_database():

    conn = get_connection()

    create_table(conn)

    total = conn.execute(
        "SELECT COUNT(*) FROM mining_records"
    ).fetchone()[0]

    if total != 1200:
        seed_database(conn)

    total = conn.execute(
        "SELECT COUNT(*) FROM mining_records"
    ).fetchone()[0]

    if total != 1200:
        raise RuntimeError(
            f"Database contains {total} records; expected 1200"
        )

    print(
        "MINQORA PERSISTENT DATABASE READY:",
        total,
        "records"
    )

    return total


def _record(row):

    data = dict(row)

    data["mine"] = data.get("mine_name")
    data["thickness"] = data.get("thickness_m")
    data["depth"] = data.get("depth_m")
    data["production"] = data.get("production_tonnes")
    data["calorific_value"] = data.get("calorific_value")
    data["calorific_value_kcal_kg"] = data.get("calorific_value")
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

    initialize_database()

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
        "table": "mining_records",
        "total_records": total,
        "unique_mines": mines,
        "unique_seams": seams,
        "source": CSV_PATH
    }
