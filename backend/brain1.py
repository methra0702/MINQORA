import random
from datetime import datetime, timedelta
from typing import Optional


# =========================================================
# MINQORA BRAIN 1
# MINING DATA INTELLIGENCE & HISTORICAL MEMORY
# =========================================================


MINES = [
    "Mine Alpha",
    "Mine Beta",
    "Mine Gamma",
    "Mine Delta",
]

SEAMS = [
    "Seam A",
    "Seam B",
    "Seam C",
    "Seam D",
]

GEOLOGICAL_CONDITIONS = [
    "Stable",
    "Moderately Stable",
    "Fault Zone",
    "High Water Risk",
    "Fractured Formation",
]

EQUIPMENT = [
    "Longwall Shearer",
    "Continuous Miner",
    "Surface Miner",
    "Dragline",
    "Hydraulic Excavator",
]

RISK_LEVELS = [
    "Low",
    "Medium",
    "High",
]


# =========================================================
# GENERATE DEMO MINING DATA
# =========================================================

def generate_mining_data(number_of_records: int = 365):
    """
    Generates realistic sample coal mining intelligence records.
    """

    random.seed(42)

    records = []

    start_date = datetime(2024, 1, 1)

    for index in range(number_of_records):

        record_date = start_date + timedelta(days=index)

        mine = random.choice(MINES)
        seam = random.choice(SEAMS)

        thickness = round(random.uniform(1.2, 8.5), 2)
        depth = round(random.uniform(80, 650), 2)

        production = round(random.uniform(800, 5000), 2)

        recovery = round(random.uniform(65, 96), 2)

        ash_content = round(random.uniform(8, 32), 2)
        moisture = round(random.uniform(2, 18), 2)
        sulfur = round(random.uniform(0.3, 4.5), 2)

        calorific_value = round(
            random.uniform(3500, 7200),
            2
        )

        geological_condition = random.choice(
            GEOLOGICAL_CONDITIONS
        )

        equipment = random.choice(EQUIPMENT)

        risk = random.choice(RISK_LEVELS)

        record = {
            "id": index + 1,

            "date": record_date.strftime("%Y-%m-%d"),

            "mine": mine,

            "seam": seam,

            "coal_thickness_m": thickness,

            "depth_m": depth,

            "production_tonnes": production,

            "recovery_percent": recovery,

            "ash_percent": ash_content,

            "moisture_percent": moisture,

            "sulfur_percent": sulfur,

            "calorific_value_kcal_kg": calorific_value,

            "geological_condition": geological_condition,

            "equipment": equipment,

            "risk_level": risk,
        }

        records.append(record)

    return records


# =========================================================
# BRAIN 1 DATABASE
# =========================================================

MINING_RECORDS = generate_mining_data(365)


# =========================================================
# GET ALL RECORDS
# =========================================================

def get_all_records():
    return MINING_RECORDS


# =========================================================
# GET RECORD COUNT
# =========================================================

def get_record_count():
    return len(MINING_RECORDS)


# =========================================================
# SEARCH MINING RECORDS
# =========================================================

def search_mining_records(
    date: Optional[str] = None,
    mine: Optional[str] = None,
    seam: Optional[str] = None,
    limit: int = 100,
):
    """
    Search Brain 1 mining intelligence.
    """

    results = MINING_RECORDS.copy()

    if date:
        results = [
            record
            for record in results
            if date.lower() in record["date"].lower()
        ]

    if mine:
        results = [
            record
            for record in results
            if mine.lower() in record["mine"].lower()
        ]

    if seam:
        results = [
            record
            for record in results
            if seam.lower() in record["seam"].lower()
        ]

    return results[:limit]


# =========================================================
# MINE SUMMARY
# =========================================================

def get_mine_summary(mine_name: str):
    """
    Calculate intelligence statistics for a specific mine.
    """

    records = [
        record
        for record in MINING_RECORDS
        if mine_name.lower() in record["mine"].lower()
    ]

    if not records:
        return None

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

    average_ash = sum(
        record["ash_percent"]
        for record in records
    ) / len(records)

    average_calorific_value = sum(
        record["calorific_value_kcal_kg"]
        for record in records
    ) / len(records)

    return {
        "mine": mine_name,

        "records": len(records),

        "total_production_tonnes": round(
            total_production,
            2
        ),

        "average_coal_thickness_m": round(
            average_thickness,
            2
        ),

        "average_recovery_percent": round(
            average_recovery,
            2
        ),

        "average_ash_percent": round(
            average_ash,
            2
        ),

        "average_calorific_value_kcal_kg": round(
            average_calorific_value,
            2
        ),
    }


# =========================================================
# BRAIN 1 STATISTICS
# =========================================================

def get_brain1_statistics():

    total_production = sum(
        record["production_tonnes"]
        for record in MINING_RECORDS
    )

    average_thickness = sum(
        record["coal_thickness_m"]
        for record in MINING_RECORDS
    ) / len(MINING_RECORDS)

    average_recovery = sum(
        record["recovery_percent"]
        for record in MINING_RECORDS
    ) / len(MINING_RECORDS)

    average_ash = sum(
        record["ash_percent"]
        for record in MINING_RECORDS
    ) / len(MINING_RECORDS)

    return {
        "brain": "Brain 1",

        "status": "online",

        "total_records": len(MINING_RECORDS),

        "mines": MINES,

        "seams": SEAMS,

        "total_production_tonnes": round(
            total_production,
            2
        ),

        "average_coal_thickness_m": round(
            average_thickness,
            2
        ),

        "average_recovery_percent": round(
            average_recovery,
            2
        ),

        "average_ash_percent": round(
            average_ash,
            2
        ),
    }


# =========================================================
# SIMPLE BRAIN 1 QUESTION PROCESSOR
# =========================================================

def process_brain1(question: str):
    """
    Basic natural-language intelligence processing for Brain 1.
    """

    question_lower = question.lower()

    # -----------------------------------------------------
    # RECORD COUNT
    # -----------------------------------------------------

    if (
        "how many records" in question_lower
        or "number of records" in question_lower
        or "records available" in question_lower
    ):

        return {
            "brain": "Brain 1",

            "intent": "record_count",

            "answer": (
                f"Brain 1 currently contains "
                f"{len(MINING_RECORDS)} mining intelligence records."
            ),
        }

    # -----------------------------------------------------
    # THICKNESS
    # -----------------------------------------------------

    if "thickness" in question_lower:

        average_thickness = sum(
            record["coal_thickness_m"]
            for record in MINING_RECORDS
        ) / len(MINING_RECORDS)

        return {
            "brain": "Brain 1",

            "intent": "coal_thickness_analysis",

            "answer": (
                f"The average coal seam thickness across the available "
                f"Brain 1 records is "
                f"{average_thickness:.2f} meters."
            ),
        }

    # -----------------------------------------------------
    # PRODUCTION
    # -----------------------------------------------------

    if (
        "production" in question_lower
        or "tonnes" in question_lower
    ):

        total_production = sum(
            record["production_tonnes"]
            for record in MINING_RECORDS
        )

        return {
            "brain": "Brain 1",

            "intent": "production_analysis",

            "answer": (
                f"The total recorded coal production is "
                f"{total_production:,.2f} tonnes across "
                f"{len(MINING_RECORDS)} mining records."
            ),
        }

    # -----------------------------------------------------
    # MINE SEARCH
    # -----------------------------------------------------

    for mine in MINES:

        if mine.lower() in question_lower:

            summary = get_mine_summary(mine)

            return {
                "brain": "Brain 1",

                "intent": "mine_analysis",

                "answer": (
                    f"{mine} contains {summary['records']} records. "
                    f"Total production is "
                    f"{summary['total_production_tonnes']:,.2f} tonnes. "
                    f"Average coal thickness is "
                    f"{summary['average_coal_thickness_m']} meters. "
                    f"Average recovery is "
                    f"{summary['average_recovery_percent']} percent."
                ),
            }

    # -----------------------------------------------------
    # DATE SEARCH
    # -----------------------------------------------------

    for record in MINING_RECORDS:

        if record["date"] in question:

            return {
                "brain": "Brain 1",

                "intent": "date_search",

                "answer": (
                    f"Mining intelligence for {record['date']}: "
                    f"{record['mine']}, "
                    f"{record['seam']}, "
                    f"coal thickness "
                    f"{record['coal_thickness_m']} meters, "
                    f"production "
                    f"{record['production_tonnes']} tonnes, "
                    f"recovery "
                    f"{record['recovery_percent']} percent."
                ),

                "data": record,
            }

    # -----------------------------------------------------
    # DEFAULT
    # -----------------------------------------------------

    return {
        "brain": "Brain 1",

        "intent": "mining_intelligence",

        "answer": (
            "Brain 1 Mining Data Intelligence is active. "
            f"I currently have access to {len(MINING_RECORDS)} "
            "sample mining records containing dates, mines, coal seams, "
            "coal thickness, depth, production, recovery, ash, moisture, "
            "sulfur, calorific value, geological conditions, equipment "
            "and risk information."
        ),
    }