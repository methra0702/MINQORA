import sqlite3
import os
import random
from datetime import datetime, timedelta


# ============================================================
# DATABASE
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "minqora.db")


# ============================================================
# CONFIGURATION
# ============================================================

MINES = [
    "Alpha Mine",
    "Beta Mine",
    "Gamma Mine",
    "Delta Mine",
    "Epsilon Mine",
    "Kappa Mine",
    "Orion Mine",
    "Titan Mine",
]

SEAMS = [
    "Seam A",
    "Seam B",
    "Seam C",
    "Seam D",
    "Upper Seam",
    "Lower Seam",
]

RISK_LEVELS = [
    "LOW",
    "MEDIUM",
    "HIGH",
]


# ============================================================
# CREATE DATABASE TABLE
# ============================================================

def create_table(cursor):

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS mining_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            date TEXT NOT NULL,

            mine_name TEXT NOT NULL,

            seam TEXT NOT NULL,

            thickness REAL,

            depth REAL,

            production REAL,

            recovery REAL,

            ash_content REAL,

            moisture REAL,

            risk_level TEXT,

            latitude REAL,

            longitude REAL,

            elevation REAL
        )
        """
    )


# ============================================================
# GENERATE RECORDS
# ============================================================

def generate_records(cursor, total_records=1000):

    print(f"Generating {total_records} mining records...")

    start_date = datetime(2021, 1, 1)

    records = []

    for i in range(total_records):

        # Multiple records can have the same date
        days_offset = random.randint(0, 2000)

        record_date = (
            start_date + timedelta(days=days_offset)
        ).strftime("%Y-%m-%d")

        mine_name = random.choice(MINES)

        seam = random.choice(SEAMS)

        thickness = round(
            random.uniform(1.2, 12.0),
            2
        )

        depth = round(
            random.uniform(50, 800),
            2
        )

        production = round(
            random.uniform(500, 15000),
            2
        )

        recovery = round(
            random.uniform(55, 98),
            2
        )

        ash_content = round(
            random.uniform(5, 35),
            2
        )

        moisture = round(
            random.uniform(1, 18),
            2
        )

        risk_level = random.choices(
            RISK_LEVELS,
            weights=[50, 35, 15],
            k=1
        )[0]

        latitude = round(
            random.uniform(-28.5000, -26.0000),
            6
        )

        longitude = round(
            random.uniform(29.0000, 31.5000),
            6
        )

        elevation = round(
            random.uniform(800, 1800),
            2
        )

        records.append(
            (
                record_date,
                mine_name,
                seam,
                thickness,
                depth,
                production,
                recovery,
                ash_content,
                moisture,
                risk_level,
                latitude,
                longitude,
                elevation,
            )
        )

    cursor.executemany(
        """
        INSERT INTO mining_data (

            date,

            mine_name,

            seam,

            thickness,

            depth,

            production,

            recovery,

            ash_content,

            moisture,

            risk_level,

            latitude,

            longitude,

            elevation

        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        records,
    )

    print(f"{total_records} records generated successfully.")


# ============================================================
# MAIN
# ============================================================

def seed_database():

    print()
    print("=" * 60)
    print("MINQORA MINING DATA SEEDER")
    print("=" * 60)
    print()

    connection = sqlite3.connect(DATABASE_PATH)

    cursor = connection.cursor()

    # Create table
    create_table(cursor)

    # Check existing records
    cursor.execute(
        "SELECT COUNT(*) FROM mining_data"
    )

    existing_records = cursor.fetchone()[0]

    print(f"Existing records: {existing_records}")

    # Clear existing data
    if existing_records > 0:

        print("Clearing existing mining records...")

        cursor.execute(
            "DELETE FROM mining_data"
        )

        connection.commit()

        print("Existing records cleared.")

    # Generate 1000 records
    generate_records(
        cursor,
        total_records=1000
    )

    connection.commit()

    # Verify
    cursor.execute(
        "SELECT COUNT(*) FROM mining_data"
    )

    total = cursor.fetchone()[0]

    connection.close()

    print()
    print("=" * 60)
    print("DATABASE SEEDING COMPLETE")
    print("=" * 60)
    print(f"TOTAL MINING RECORDS: {total}")
    print()
    print("MINQORA Mining Data Center is ready.")
    print()


if __name__ == "__main__":
    seed_database()