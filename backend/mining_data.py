import csv
import random
from datetime import datetime, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATA_FILE = DATA_DIR / "mining_data.csv"


MINES = [
    {
        "mine_name": "Mine Alpha",
        "location": "Central Coalfield",
        "latitude": 23.450,
        "longitude": 85.320,
    },
    {
        "mine_name": "Mine Beta",
        "location": "Eastern Coal Basin",
        "latitude": 23.780,
        "longitude": 86.150,
    },
    {
        "mine_name": "Mine Gamma",
        "location": "Northern Coalfield",
        "latitude": 24.120,
        "longitude": 85.870,
    },
    {
        "mine_name": "Mine Delta",
        "location": "Western Coal Basin",
        "latitude": 22.950,
        "longitude": 84.980,
    },
    {
        "mine_name": "Mine Omega",
        "location": "Southern Coalfield",
        "latitude": 22.450,
        "longitude": 85.640,
    },
]


SEAMS = [
    "Seam A",
    "Seam B",
    "Seam C",
    "Seam D",
    "Seam E",
    "Upper Seam",
    "Lower Seam",
]


GEOLOGICAL_ZONES = [
    "Stable Zone",
    "Moderate Fault Zone",
    "High Fault Zone",
    "Folded Zone",
    "Boundary Zone",
]


RISK_LEVELS = [
    "Low",
    "Medium",
    "High",
]


HEADERS = [
    "record_id",
    "date",
    "year",
    "month",
    "mine_name",
    "location",
    "seam",
    "coal_thickness_m",
    "depth_m",
    "production_tonnes",
    "recovery_percent",
    "ash_percent",
    "moisture_percent",
    "calorific_value_kcal_kg",
    "latitude",
    "longitude",
    "elevation_m",
    "geological_zone",
    "risk_level",
]


def generate_mining_data(number_of_records=500):
    """
    Generate realistic sample coal mining records.

    Multiple records can exist on the same date because
    different mines and seams are recorded independently.
    """

    random.seed(42)

    start_date = datetime(2018, 1, 1)
    end_date = datetime(2026, 8, 31)

    total_days = (end_date - start_date).days

    records = []

    for record_id in range(1, number_of_records + 1):

        mine = random.choice(MINES)

        random_days = random.randint(0, total_days)
        record_date = start_date + timedelta(days=random_days)

        seam = random.choice(SEAMS)

        coal_thickness = round(random.uniform(1.2, 8.5), 2)
        depth = round(random.uniform(50, 650), 2)

        production = round(
            random.uniform(500, 8000) * coal_thickness
        )

        recovery = round(random.uniform(65, 96), 2)

        ash = round(random.uniform(8, 35), 2)

        moisture = round(random.uniform(2, 15), 2)

        calorific_value = round(
            random.uniform(3500, 7200)
        )

        latitude = round(
            mine["latitude"] + random.uniform(-0.05, 0.05),
            6,
        )

        longitude = round(
            mine["longitude"] + random.uniform(-0.05, 0.05),
            6,
        )

        elevation = round(random.uniform(180, 850), 2)

        geological_zone = random.choice(GEOLOGICAL_ZONES)

        risk_level = random.choices(
            RISK_LEVELS,
            weights=[60, 30, 10],
        )[0]

        record = {
            "record_id": record_id,
            "date": record_date.strftime("%Y-%m-%d"),
            "year": record_date.year,
            "month": record_date.strftime("%B"),
            "mine_name": mine["mine_name"],
            "location": mine["location"],
            "seam": seam,
            "coal_thickness_m": coal_thickness,
            "depth_m": depth,
            "production_tonnes": production,
            "recovery_percent": recovery,
            "ash_percent": ash,
            "moisture_percent": moisture,
            "calorific_value_kcal_kg": calorific_value,
            "latitude": latitude,
            "longitude": longitude,
            "elevation_m": elevation,
            "geological_zone": geological_zone,
            "risk_level": risk_level,
        }

        records.append(record)

    return records


def save_mining_data(records):
    """Save records to the CSV database."""

    with open(
        DATA_FILE,
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=HEADERS,
        )

        writer.writeheader()
        writer.writerows(records)


def create_initial_data():
    """
    Create a larger mining database.

    We generate 1000 records.
    """

    if not DATA_FILE.exists():

        records = generate_mining_data(1000)

        save_mining_data(records)

        print(
            f"Created mining database with "
            f"{len(records)} records"
        )

    else:

        print("Mining database already exists.")


def load_mining_data():
    """Load all mining records."""

    create_initial_data()

    records = []

    with open(
        DATA_FILE,
        "r",
        encoding="utf-8",
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            records.append(
                {
                    "record_id": int(row["record_id"]),
                    "date": row["date"],
                    "year": int(row["year"]),
                    "month": row["month"],
                    "mine_name": row["mine_name"],
                    "location": row["location"],
                    "seam": row["seam"],
                    "coal_thickness_m": float(
                        row["coal_thickness_m"]
                    ),
                    "depth_m": float(row["depth_m"]),
                    "production_tonnes": float(
                        row["production_tonnes"]
                    ),
                    "recovery_percent": float(
                        row["recovery_percent"]
                    ),
                    "ash_percent": float(row["ash_percent"]),
                    "moisture_percent": float(
                        row["moisture_percent"]
                    ),
                    "calorific_value_kcal_kg": float(
                        row["calorific_value_kcal_kg"]
                    ),
                    "latitude": float(row["latitude"]),
                    "longitude": float(row["longitude"]),
                    "elevation_m": float(row["elevation_m"]),
                    "geological_zone": row[
                        "geological_zone"
                    ],
                    "risk_level": row["risk_level"],
                }
            )

    return records


def get_mining_summary():
    """Return summary statistics."""

    records = load_mining_data()

    if not records:
        return {
            "total_records": 0
        }

    total_production = sum(
        record["production_tonnes"]
        for record in records
    )

    average_thickness = sum(
        record["coal_thickness_m"]
        for record in records
    ) / len(records)

    average_recovery = sum(
        record["recovery_percent"]
        for record in records
    ) / len(records)

    mines = sorted(
        list(
            set(
                record["mine_name"]
                for record in records
            )
        )
    )

    seams = sorted(
        list(
            set(
                record["seam"]
                for record in records
            )
        )
    )

    years = sorted(
        list(
            set(
                record["year"]
                for record in records
            )
        )
    )

    return {
        "total_records": len(records),
        "total_production_tonnes": round(
            total_production,
            2,
        ),
        "average_coal_thickness_m": round(
            average_thickness,
            2,
        ),
        "average_recovery_percent": round(
            average_recovery,
            2,
        ),
        "mines": mines,
        "seams": seams,
        "years": years,
    }


def filter_mining_data(
    mine_name=None,
    year=None,
    date=None,
    seam=None,
    risk_level=None,
):
    """
    Filter mining records.

    Multiple filters can be combined.
    """

    records = load_mining_data()

    filtered_records = records

    if mine_name:
        filtered_records = [
            record
            for record in filtered_records
            if record["mine_name"].lower()
            == mine_name.lower()
        ]

    if year:
        filtered_records = [
            record
            for record in filtered_records
            if record["year"] == int(year)
        ]

    if date:
        filtered_records = [
            record
            for record in filtered_records
            if record["date"] == date
        ]

    if seam:
        filtered_records = [
            record
            for record in filtered_records
            if record["seam"].lower()
            == seam.lower()
        ]

    if risk_level:
        filtered_records = [
            record
            for record in filtered_records
            if record["risk_level"].lower()
            == risk_level.lower()
        ]

    return filtered_records


def search_mining_data(query):
    """
    Search across all mining records.
    """

    records = load_mining_data()

    if not query:
        return records

    query = str(query).lower()

    results = []

    for record in records:

        searchable_text = " ".join(
            str(value).lower()
            for value in record.values()
        )

        if query in searchable_text:
            results.append(record)

    return results


def get_record_by_id(record_id):
    """Get one specific mining record."""

    records = load_mining_data()

    for record in records:

        if record["record_id"] == int(record_id):
            return record

    return None


if __name__ == "__main__":

    create_initial_data()

    summary = get_mining_summary()

    print("\nMINQORA MINING DATA")
    print("-" * 40)

    for key, value in summary.items():
        print(f"{key}: {value}")