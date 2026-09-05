from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import csv
import os
import re
from collections import defaultdict


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="MINQORA Mining Intelligence API",
    version="6.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# MINQORA data can be located in the normal project data folder,
# backend/data, beside main.py, or in the current working directory.
# The first existing file is automatically selected.
DATA_CANDIDATES = [
    os.path.abspath(os.path.join(BASE_DIR, "..", "data", "mining_data.csv")),
    os.path.abspath(os.path.join(BASE_DIR, "data", "mining_data.csv")),
    os.path.abspath(os.path.join(BASE_DIR, "mining_data.csv")),
    os.path.abspath(os.path.join(os.getcwd(), "data", "mining_data.csv")),
    os.path.abspath(os.path.join(os.getcwd(), "mining_data.csv")),
]


def find_mining_data_file():
    for candidate in DATA_CANDIDATES:
        if os.path.isfile(candidate):
            return candidate
    return DATA_CANDIDATES[0]


DATA_FILE = find_mining_data_file()


# ============================================================
# REQUEST MODEL
# ============================================================

class AskRequest(BaseModel):
    question: str


class PredictionRequest(BaseModel):
    mine_name: str
    seam: str
    thickness: float
    depth: float
    ash_content: float
    moisture: float


# ============================================================
# NORMALIZE COLUMN NAMES
# ============================================================

def normalize_key(key):

    if key is None:
        return ""

    text = (
        str(key)
        .replace("\ufeff", "")
        .strip()
        .lower()
    )

    # Turn common header punctuation into underscores so headers such as
    # "Seam Thickness (m)" become "seam_thickness_m".
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def first_value(clean_row, exact_keys=(), contains_terms=()):
    """Return the first useful value from exact or fuzzy CSV columns."""
    for key in exact_keys:
        value = clean_row.get(key)
        if value is not None and str(value).strip() != "":
            return value

    if contains_terms:
        for key, value in clean_row.items():
            if value is None or str(value).strip() == "":
                continue
            key_lower = str(key).lower()
            if all(term in key_lower for term in contains_terms):
                return value

    return ""


# ============================================================
# LOAD MINING DATA
# ============================================================

def load_mining_data():

    records = []

    # Re-check the candidate locations every time so the backend can
    # find the dataset even when it is started from a different folder.
    global DATA_FILE
    DATA_FILE = find_mining_data_file()

    if not os.path.exists(DATA_FILE):

        print("DATA FILE NOT FOUND. Checked:")
        for candidate in DATA_CANDIDATES:
            print(" -", candidate)

        return records

    try:

        with open(
            DATA_FILE,
            "r",
            encoding="utf-8-sig",
            newline=""
        ) as file:

            sample = file.read(4096)

            file.seek(0)

            try:

                dialect = csv.Sniffer().sniff(
                    sample,
                    delimiters=",;\t"
                )

            except Exception:

                dialect = csv.excel

            reader = csv.DictReader(
                file,
                dialect=dialect
            )

            if not reader.fieldnames:

                return []

            for row in reader:

                clean_row = {}

                for key, value in row.items():

                    clean_key = normalize_key(key)

                    clean_value = (
                        str(value).strip()
                        if value is not None
                        else ""
                    )

                    clean_row[clean_key] = clean_value


                # ============================================
                # SUPPORT DIFFERENT COLUMN NAMES
                # ============================================

                mine = (
                    clean_row.get("mine")
                    or clean_row.get("mine_name")
                    or ""
                )

                seam = (
                    clean_row.get("seam")
                    or clean_row.get("seam_name")
                    or ""
                )

                year = (
                    clean_row.get("year")
                    or clean_row.get("record_year")
                    or clean_row.get("observation_year")
                    or ""
                )

                if not str(year).strip():
                    date_candidate = (
                        clean_row.get("date")
                        or clean_row.get("record_date")
                        or clean_row.get("observation_date")
                        or ""
                    )
                    year_match = re.search(r"(20\d{2})", str(date_candidate))
                    if year_match:
                        year = year_match.group(1)

                record_id = (
                    clean_row.get("id")
                    or clean_row.get("record_id")
                    or clean_row.get("record_no")
                    or ""
                )

                thickness = first_value(
                    clean_row,
                    exact_keys=(
                        "thickness_m",
                        "seam_thickness_m",
                        "thickness",
                        "seam_thickness",
                        "coal_seam_thickness",
                        "seam_thickness_in_m",
                        "thickness_in_m",
                    ),
                    contains_terms=("thickness",),
                )

                production = first_value(
                    clean_row,
                    exact_keys=(
                        "production_tonnes",
                        "production_tonnes_year",
                        "production",
                        "output_tonnes",
                        "output",
                        "coal_production",
                    ),
                    contains_terms=("production",),
                )

                # ============================================
                # HISTORICAL PREDICTION FIELDS
                # ============================================

                date = (
                    clean_row.get("date")
                    or clean_row.get("record_date")
                    or clean_row.get("observation_date")
                    or ""
                )

                depth = first_value(
                    clean_row,
                    exact_keys=(
                        "depth_m",
                        "mining_depth_m",
                        "depth",
                        "mining_depth",
                        "depth_of_mining",
                    ),
                    contains_terms=("depth",),
                )

                recovery = first_value(
                    clean_row,
                    exact_keys=(
                        "recovery_pct",
                        "recovery_percent",
                        "recovery",
                        "coal_recovery",
                    ),
                    contains_terms=("recovery",),
                )

                ash_content = first_value(
                    clean_row,
                    exact_keys=(
                        "ash_content",
                        "ash_pct",
                        "ash_percent",
                        "ash",
                        "coal_ash",
                    ),
                    contains_terms=("ash",),
                )

                moisture = first_value(
                    clean_row,
                    exact_keys=(
                        "moisture_pct",
                        "moisture_percent",
                        "moisture",
                        "coal_moisture",
                    ),
                    contains_terms=("moisture",),
                )

                risk_level = (
                    clean_row.get("risk_level")
                    or clean_row.get("risk")
                    or clean_row.get("risk_category")
                    or ""
                )


                # ============================================
                # PHASE 5A — OPTIONAL RESOURCE FIELDS
                # ============================================

                area_m2 = (
                    clean_row.get("area_m2")
                    or clean_row.get("seam_area_m2")
                    or clean_row.get("resource_area_m2")
                    or clean_row.get("area")
                    or ""
                )

                area_ha = (
                    clean_row.get("area_ha")
                    or clean_row.get("area_hectares")
                    or ""
                )

                length_m = (
                    clean_row.get("length_m")
                    or clean_row.get("seam_length_m")
                    or ""
                )

                width_m = (
                    clean_row.get("width_m")
                    or clean_row.get("seam_width_m")
                    or ""
                )

                density = (
                    clean_row.get("density_t_m3")
                    or clean_row.get("coal_density")
                    or clean_row.get("density")
                    or ""
                )

                recovery_factor = (
                    clean_row.get("recovery_factor")
                    or clean_row.get("recovery")
                    or ""
                )


                # ============================================
                # CONVERT YEAR
                # ============================================

                try:

                    year = int(float(year))

                except Exception:

                    year = None


                # ============================================
                # CONVERT THICKNESS
                # ============================================

                try:

                    thickness = float(
                        str(thickness)
                        .replace(",", "")
                    )

                except Exception:

                    thickness = None


                # ============================================
                # CONVERT PRODUCTION
                # ============================================

                try:

                    production = float(
                        str(production)
                        .replace(",", "")
                    )

                except Exception:

                    production = None


                # ============================================
                # CONVERT OPTIONAL RESOURCE FIELDS
                # ============================================

                def to_float(value):
                    try:
                        text = str(value).strip().replace(",", "")
                        if text == "":
                            return None
                        return float(text)
                    except Exception:
                        return None

                depth = to_float(depth)
                recovery = to_float(recovery)
                ash_content = to_float(ash_content)
                moisture = to_float(moisture)

                area_m2 = to_float(area_m2)
                area_ha = to_float(area_ha)
                length_m = to_float(length_m)
                width_m = to_float(width_m)
                density = to_float(density)
                recovery_factor = to_float(recovery_factor)

                if area_m2 is None and area_ha is not None:
                    area_m2 = area_ha * 10000

                if area_m2 is None and length_m is not None and width_m is not None:
                    area_m2 = length_m * width_m

                if recovery_factor is not None and recovery_factor > 1:
                    recovery_factor = recovery_factor / 100


                # ============================================
                # SAVE VALID RECORD
                # ============================================

                if mine and seam:

                    records.append({

                        "id": record_id,

                        "mine": mine,

                        "seam": seam,

                        "year": year,

                        "date": date,

                        "thickness_m": thickness,

                        "depth_m": depth,

                        "production_tonnes": production,

                        "recovery": recovery,

                        "ash_content": ash_content,

                        "moisture": moisture,

                        "risk_level": risk_level,

                        # Phase 5A optional resource-estimation inputs
                        "area_m2": area_m2,
                        "density_t_m3": density,
                        "recovery_factor": recovery_factor

                    })


        print("=" * 55)
        print("MINQORA DATA LOADED")
        print("File:", DATA_FILE)
        print("Records:", len(records))
        print("=" * 55)

        return records


    except Exception as error:

        print("ERROR LOADING DATA:", error)

        return []


# ============================================================
# GET DATA
# ============================================================

def get_data():

    return load_mining_data()


# ============================================================
# GET UNIQUE MINES
# ============================================================

def get_mines(records):

    mines = []

    for record in records:

        mine = record.get("mine")

        if mine and mine not in mines:

            mines.append(mine)

    return mines


# ============================================================
# FIND MINE
# ============================================================

def find_mine(question, records):

    question_lower = question.lower()

    mines = get_mines(records)

    for mine in mines:

        if mine.lower() in question_lower:

            return mine

    return None


# ============================================================
# FIND YEAR RANGE
# ============================================================

def find_year_range(question, records):

    available_years = [

        record.get("year")

        for record in records

        if record.get("year") is not None

    ]

    if not available_years:

        return None, None

    available_years = sorted(
        set(available_years)
    )

    q = question.lower()


    # FROM 2023 TO 2025

    match = re.search(
        r"(?:from|between)\s+(20\d{2})\s+(?:to|and|-)\s+(20\d{2})",
        q
    )

    if match:

        return (
            int(match.group(1)),
            int(match.group(2))
        )


    # 2023 TO 2025

    match = re.search(
        r"(20\d{2})\s*(?:to|-)\s*(20\d{2})",
        q
    )

    if match:

        return (
            int(match.group(1)),
            int(match.group(2))
        )


    # SINGLE YEAR(S)

    found_years = re.findall(
        r"\b(20\d{2})\b",
        q
    )

    if len(found_years) >= 2:

        return (
            int(found_years[0]),
            int(found_years[1])
        )

    if len(found_years) == 1:

        year = int(found_years[0])

        return year, year


    # DEFAULT: FULL DATA RANGE

    return (
        min(available_years),
        max(available_years)
    )


# ============================================================
# FILTER RECORDS
# ============================================================

def filter_records(
    records,
    mine=None,
    start_year=None,
    end_year=None
):

    filtered = []

    for record in records:


        # MINE FILTER

        if mine:

            if (
                record.get("mine", "").lower()
                != mine.lower()
            ):

                continue


        # YEAR FILTER

        year = record.get("year")

        if start_year is not None and year is not None:

            if year < start_year:

                continue

        if end_year is not None and year is not None:

            if year > end_year:

                continue


        filtered.append(record)


    return filtered


# ============================================================
# FORMAT NUMBER
# ============================================================

def format_number(value):

    try:

        return f"{float(value):,.0f}"

    except Exception:

        return "0"


# ============================================================
# BUILD EVIDENCE
# ============================================================

def build_evidence(records, limit=10):

    evidence = []

    for record in records[:limit]:

        evidence.append({

            "mine": record.get("mine"),

            "seam": record.get("seam"),

            "year": record.get("year"),

            "thickness_m":
                record.get("thickness_m"),

            "production_tonnes":
                record.get("production_tonnes")

        })

    return evidence


# ============================================================
# INTENT DETECTION
# ============================================================

def understand_question(question):

    q = question.lower().strip()

    # ========================================================
    # PHASE 6A — MINE DESIGN FOUNDATION
    # ========================================================
    mine_design_keywords = [
        "mine design", "design the mine", "mine layout",
        "mine planning layout", "development layout",
        "mine design foundation", "preliminary mine design",
        "design foundation", "layout design"
    ]

    if any(keyword in q for keyword in mine_design_keywords):
        return {
            "intent": "mine_design_foundation",
            "source": "MINQORA Phase 6A Mine Design Foundation Engine",
            "confidence": 97,
            "route": "mine_design"
        }

    # ========================================================
    # PHASE 5E — RESOURCE RISK & SCENARIO ANALYSIS
    # ========================================================

    scenario_keywords = [
        "resource scenario",
        "resource scenarios",
        "scenario analysis",
        "resource risk",
        "resource risk analysis",
        "sensitivity analysis",
        "best case resource",
        "worst case resource",
        "optimistic scenario",
        "conservative scenario",
        "downside risk"
    ]

    if any(keyword in q for keyword in scenario_keywords):
        return {
            "intent": "resource_scenario_analysis",
            "source": "MINQORA Phase 5E Resource Risk & Scenario Engine",
            "confidence": 96,
            "route": "resource_scenario"
        }


    # ========================================================
    # PHASE 5D — RESOURCE REPORTING & INTELLIGENCE
    # ========================================================

    reporting_keywords = [
        "resource report",
        "resource reporting",
        "resource intelligence report",
        "resource intelligence",
        "resource summary report",
        "integrated resource report",
        "resource statement",
        "resource dashboard summary"
    ]

    if any(keyword in q for keyword in reporting_keywords):
        return {
            "intent": "resource_reporting",
            "source": "MINQORA Phase 5D Resource Reporting Engine",
            "confidence": 98,
            "route": "resource_reporting"
        }


    # ========================================================
    # PHASE 5C — RESOURCE CONFIDENCE / UNCERTAINTY
    # ========================================================

    confidence_keywords = [
        "resource confidence",
        "confidence analysis",
        "uncertainty",
        "resource uncertainty",
        "confidence score",
        "how reliable",
        "data confidence"
    ]

    if any(keyword in q for keyword in confidence_keywords):
        return {
            "intent": "resource_confidence_analysis",
            "source": "MINQORA Resource Confidence Engine",
            "confidence": 96,
            "route": "resource_confidence"
        }



    # ========================================================
    # PHASE 5B — RESOURCE CLASSIFICATION
    # ========================================================

    classification_keywords = [
        "resource classification",
        "classify resources",
        "classify resource",
        "measured resource",
        "indicated resource",
        "inferred resource",
        "resource confidence",
        "resource category",
        "resource categories",
        "classify the resources"
    ]

    if any(keyword in q for keyword in classification_keywords):
        return {
            "intent": "resource_classification",
            "source": "MINQORA Phase 5B Resource Classification Engine",
            "confidence": 97,
            "route": "resource_classification"
        }


    # ========================================================
    # PHASE 5A — RESOURCE ESTIMATION FOUNDATION
    # ========================================================

    resource_keywords = [
        "resource estimate",
        "resource estimation",
        "estimate resource",
        "mineral resource",
        "coal resource",
        "resource tonnage",
        "in situ resource",
        "in-situ resource",
        "recoverable resource",
        "resource potential",
        "evaluate resources",
        "resource evaluation"
    ]

    if any(keyword in q for keyword in resource_keywords):
        return {
            "intent": "resource_estimation",
            "source": "MINQORA Phase 5A Resource Evaluation Engine",
            "confidence": 96,
            "route": "resource_evaluation"
        }


    # ========================================================
    # PHASE 4F — GEOLOGICAL RISK & SUITABILITY
    # ========================================================

    risk_keywords = [
        "geological risk",
        "risk assessment",
        "geological suitability",
        "suitability assessment",
        "mine suitability",
        "geological hazard",
        "geological safety",
        "assess geological risk",
        "analyze geological risk",
        "evaluate geological risk"
    ]

    if any(keyword in q for keyword in risk_keywords):
        return {
            "intent": "geological_risk_assessment",
            "source": "MINQORA Phase 4F Geological Risk Engine",
            "confidence": 97,
            "route": "geological_risk"
        }


    # ========================================================
    # PHASE 4E — INTEGRATED GEOLOGICAL MODEL
    # ========================================================

    integrated_model_keywords = [

        "integrated geological model",

        "geological model",

        "complete geological model",

        "full geological model",

        "generate geological model",

        "analyze geological model",

        "geological model analysis",

        "integrated seam analysis",

        "seam and geological structure",

        "complete geological analysis",

        "geological integration"

    ]

    if any(
        keyword in q
        for keyword in integrated_model_keywords
    ):

        return {

            "intent":
                "integrated_geological_model",

            "source":
                "MINQORA Phase 4E Geological Model Engine",

            "confidence": 98,

            "route":
                "geological_model"

        }


    # ========================================================
    # GENERATE REPORT
    # ========================================================

    generate_keywords = [

        "generate",

        "create report",

        "prepare report",

        "prepare a report",

        "make a report",

        "generate a report",

        "create a report",

        "production report",

        "geological report",

        "geology report",

        "summary report",

        "mining summary",

        "executive summary"

    ]

    if any(
        keyword in q
        for keyword in generate_keywords
    ):

        if any(
            word in q
            for word in [

                "geological",

                "geology",

                "thickness",

                "seam"

            ]
        ):

            return {

                "intent":
                    "geological_report",

                "source":
                    "MINQORA Report Engine",

                "confidence": 98,

                "route":
                    "generate"

            }


        if any(
            word in q
            for word in [

                "production",

                "output",

                "tonnes"

            ]
        ):

            return {

                "intent":
                    "production_report",

                "source":
                    "MINQORA Report Engine",

                "confidence": 98,

                "route":
                    "generate"

            }


        return {

            "intent":
                "executive_summary",

            "source":
                "MINQORA Report Engine",

            "confidence": 98,

            "route":
                "generate"

        }


    # ========================================================
    # PREDICTION
    # ========================================================

    prediction_keywords = [

        "predict",

        "prediction",

        "forecast",

        "future production",

        "next year",

        "next 2 years",

        "next 3 years",

        "next 5 years",

        "expected production"

    ]

    if any(
        keyword in q
        for keyword in prediction_keywords
    ):

        return {

            "intent":
                "production_forecast",

            "source":
                "MINQORA Advanced Prediction Engine",

            "confidence": 95,

            "route":
                "prediction"

        }


    # ========================================================
    # COMPARISON
    # ========================================================

    comparison_keywords = [

        "compare",

        "comparison",

        "versus",

        " vs ",

        "which mine is better",

        "better mine",

        "highest production",

        "lowest production",

        "best performing mine"

    ]

    if any(
        keyword in q
        for keyword in comparison_keywords
    ):

        return {

            "intent":
                "mine_comparison",

            "source":
                "MINQORA Mining Intelligence",

            "confidence": 95,

            "route":
                "comparison"

        }


    # ========================================================
    # THICKNESS / SEAM
    # ========================================================

    thickness_keywords = [

        "thickness",

        "thickest",

        "thinnest",

        "seam thickness",

        "seam analysis"

    ]

    if any(
        keyword in q
        for keyword in thickness_keywords
    ):

        return {

            "intent":
                "seam_analysis",

            "source":
                "MINQORA Geological Intelligence",

            "confidence": 95,

            "route":
                "analysis"

        }


    # ========================================================
    # PRODUCTION
    # ========================================================

    production_keywords = [

        "production",

        "produce",

        "tonnes",

        "output"

    ]

    if any(
        keyword in q
        for keyword in production_keywords
    ):

        return {

            "intent":
                "production_analysis",

            "source":
                "MINQORA Mining Intelligence",

            "confidence": 95,

            "route":
                "analysis"

        }


    # ========================================================
    # GENERAL
    # ========================================================

    return {

        "intent":
            "general_question",

        "source":
            "MINQORA Intelligence Engine",

        "confidence": 75,

        "route":
            "general"

    }


# ============================================================
# PHASE 5A
# RESOURCE ESTIMATION FOUNDATION
# ============================================================

DEFAULT_DENSITY_T_M3 = 1.35
DEFAULT_RECOVERY_FACTOR = 0.70
NORMALIZED_SCENARIO_AREA_M2 = 1_000_000


def classify_resource_block(block):
    """
    MINQORA Phase 5B preliminary data-confidence classification.

    This is an internal analytical classification based on available dataset
    coverage and assumptions. It is NOT a JORC/NI 43-101 compliant public
    resource statement and does not replace qualified-person review.
    """

    records_count = int(block.get("records") or 0)
    geometry_basis = str(block.get("geometry_basis") or "")
    density_basis = str(block.get("density_basis") or "")
    thickness_range = abs(
        float(block.get("maximum_thickness_m") or 0)
        - float(block.get("minimum_thickness_m") or 0)
    )

    years_text = str(block.get("period") or "")
    try:
        start_year, end_year = [int(x.strip()) for x in years_text.split(" to ")]
        year_span = max(1, end_year - start_year + 1)
    except Exception:
        year_span = 1

    score = 0
    reasons = []

    # Geological observation density
    if records_count >= 12:
        score += 30
        reasons.append("strong historical record coverage")
    elif records_count >= 6:
        score += 20
        reasons.append("moderate historical record coverage")
    elif records_count >= 2:
        score += 10
        reasons.append("limited historical record coverage")
    else:
        reasons.append("very limited historical record coverage")

    # Geometry confidence
    if "Dataset geometry" in geometry_basis:
        score += 30
        reasons.append("dataset geometry is available")
    else:
        reasons.append("geometry is scenario-based")

    # Density confidence
    if "Dataset density" in density_basis:
        score += 20
        reasons.append("dataset density is available")
    else:
        score += 5
        reasons.append("density uses an engineering assumption")

    # Temporal continuity
    if year_span >= 5:
        score += 15
        reasons.append("multi-year continuity is available")
    elif year_span >= 2:
        score += 10
        reasons.append("more than one year is represented")
    else:
        score += 5
        reasons.append("single-year evidence is represented")

    # Thickness consistency is a simple internal proxy, not geostatistics.
    if thickness_range <= 0.5:
        score += 5
        reasons.append("thickness observations are relatively consistent")

    if score >= 80 and "Dataset geometry" in geometry_basis and "Dataset density" in density_basis:
        category = "Measured — preliminary"
        confidence = "High"
    elif score >= 55:
        category = "Indicated — preliminary"
        confidence = "Moderate"
    elif score >= 25:
        category = "Inferred — preliminary"
        confidence = "Low to moderate"
    else:
        category = "Exploration target / unclassified"
        confidence = "Low"

    return {
        "classification": category,
        "classification_score": min(100, score),
        "classification_confidence": confidence,
        "classification_basis": reasons
    }


def generate_resource_classification(question, records):
    """Phase 5B — classify Phase 5A resource blocks by data confidence."""

    estimate = generate_resource_estimation(question, records)

    if not estimate.get("resource_blocks"):
        return {
            "answer": estimate.get("answer", "No resource blocks are available for classification."),
            "evidence": estimate.get("evidence", []),
            "resource_blocks": []
        }

    classified_blocks = []
    category_counts = defaultdict(int)
    category_tonnage = defaultdict(float)

    for block in estimate.get("resource_blocks", []):
        classification = classify_resource_block(block)
        updated = dict(block)
        updated.update(classification)
        classified_blocks.append(updated)
        category_counts[classification["classification"]] += 1
        category_tonnage[classification["classification"]] += float(
            updated.get("estimated_recoverable_tonnage") or 0
        )

    total_recoverable = sum(
        float(block.get("estimated_recoverable_tonnage") or 0)
        for block in classified_blocks
    )

    summary_lines = []
    for category, count in sorted(category_counts.items()):
        summary_lines.append(f"• {category}: {count} block(s)")

    block_lines = []
    for block in classified_blocks:
        block_lines.append(
            f"{block.get('mine')} — {block.get('seam')}: "
            f"{block.get('classification')} "
            f"(score {block.get('classification_score')}/100)"
        )

    answer = f"""
📐 PHASE 5B — RESOURCE CLASSIFICATION

Scope:
{estimate.get('mine') or 'All Mines'}

Classification Summary:
{chr(10).join(summary_lines)}

TOTAL PRELIMINARY RECOVERABLE TONNAGE:
{format_number(total_recoverable)} tonnes

BLOCK CLASSIFICATION:
{chr(10).join(block_lines)}

CLASSIFICATION METHOD:
MINQORA evaluates historical record coverage, geometry availability,
density availability, temporal continuity and basic thickness consistency.

IMPORTANT:
These categories are preliminary internal data-confidence classifications.
They are not a compliant JORC, NI 43-101, SAMREC or other public resource
statement and require qualified-person review before external reporting.

DATA EVIDENCE:
{len(estimate.get('evidence', []))} evidence records are displayed below.
""".strip()

    return {
        "answer": answer,
        "mine": estimate.get("mine"),
        "period": estimate.get("period"),
        "classification_summary": dict(category_counts),
        # Tonnage by preliminary category for Phase 5D integration.
        "classification_tonnage": {
            "measured": round(sum(v for k, v in category_tonnage.items() if k.startswith("Measured")), 2),
            "indicated": round(sum(v for k, v in category_tonnage.items() if k.startswith("Indicated")), 2),
            "inferred": round(sum(v for k, v in category_tonnage.items() if k.startswith("Inferred")), 2),
            "unclassified": round(sum(v for k, v in category_tonnage.items() if "Exploration target" in k or "unclassified" in k.lower()), 2),
        },
        "total_preliminary_recoverable_tonnage": round(total_recoverable, 2),
        "resource_blocks": classified_blocks,
        "evidence": estimate.get("evidence", []),
        "estimation_status": estimate.get("estimation_status"),
        "classification_note": (
            "Preliminary internal data-confidence classification; not a compliant public mineral resource statement."
        )
    }


def generate_resource_estimation(question, records):
    """
    Phase 5A foundation.

    Actual in-situ tonnage requires geometry (area) and density. When the
    dataset does not provide area, MINQORA returns a clearly labelled
    normalized 1 km² scenario instead of presenting an invented mine total.
    Resource classification is intentionally deferred to Phase 5B.
    """

    mine = find_mine(question, records)
    start_year, end_year = find_year_range(question, records)

    filtered = filter_records(records, mine, start_year, end_year)

    if not filtered:
        return {
            "answer": "No mining records were found for the requested resource evaluation.",
            "evidence": []
        }

    grouped = defaultdict(list)

    for record in filtered:
        if record.get("thickness_m") is not None:
            grouped[(record.get("mine"), record.get("seam"))].append(record)

    if not grouped:
        return {
            "answer": "Resource estimation requires valid seam thickness data.",
            "evidence": build_evidence(filtered)
        }

    resource_blocks = []
    total_gross_tonnage = 0.0
    total_recoverable_tonnage = 0.0
    actual_geometry_blocks = 0
    scenario_blocks = 0
    actual_density_blocks = 0

    for (block_mine, seam), block_records in sorted(grouped.items()):
        thickness_values = [r["thickness_m"] for r in block_records if r.get("thickness_m") is not None]
        average_thickness = sum(thickness_values) / len(thickness_values)
        minimum_thickness = min(thickness_values)
        maximum_thickness = max(thickness_values)

        area_values = [r.get("area_m2") for r in block_records if r.get("area_m2") is not None and r.get("area_m2") > 0]
        density_values = [r.get("density_t_m3") for r in block_records if r.get("density_t_m3") is not None and r.get("density_t_m3") > 0]
        recovery_values = [r.get("recovery_factor") for r in block_records if r.get("recovery_factor") is not None and 0 < r.get("recovery_factor") <= 1]

        if area_values:
            area_m2 = sum(area_values) / len(area_values)
            geometry_basis = "Dataset geometry"
            actual_geometry_blocks += 1
        else:
            area_m2 = NORMALIZED_SCENARIO_AREA_M2
            geometry_basis = "Normalized scenario — 1 km²"
            scenario_blocks += 1

        if density_values:
            density_t_m3 = sum(density_values) / len(density_values)
            density_basis = "Dataset density"
            actual_density_blocks += 1
        else:
            density_t_m3 = DEFAULT_DENSITY_T_M3
            density_basis = f"Default assumption — {DEFAULT_DENSITY_T_M3:.2f} t/m³"

        recovery_factor = (
            sum(recovery_values) / len(recovery_values)
            if recovery_values
            else DEFAULT_RECOVERY_FACTOR
        )

        volume_m3 = area_m2 * average_thickness
        gross_tonnage = volume_m3 * density_t_m3
        recoverable_tonnage = gross_tonnage * recovery_factor

        total_gross_tonnage += gross_tonnage
        total_recoverable_tonnage += recoverable_tonnage

        years = sorted({r.get("year") for r in block_records if r.get("year") is not None})

        resource_blocks.append({
            "mine": block_mine,
            "seam": seam,
            "records": len(block_records),
            "period": f"{min(years)} to {max(years)}" if years else "N/A",
            "average_thickness_m": round(average_thickness, 2),
            "minimum_thickness_m": round(minimum_thickness, 2),
            "maximum_thickness_m": round(maximum_thickness, 2),
            "area_m2": round(area_m2, 2),
            "geometry_basis": geometry_basis,
            "density_t_m3": round(density_t_m3, 3),
            "density_basis": density_basis,
            "recovery_factor": round(recovery_factor, 3),
            "estimated_volume_m3": round(volume_m3, 2),
            "estimated_gross_tonnage": round(gross_tonnage, 2),
            "estimated_recoverable_tonnage": round(recoverable_tonnage, 2),
            "classification": "Unclassified — Phase 5B pending"
        })

    years = sorted({r.get("year") for r in filtered if r.get("year") is not None})
    seam_count = len(resource_blocks)
    record_count = len(filtered)
    year_count = len(years)

    if actual_geometry_blocks == seam_count:
        geometry_confidence = "Strong"
        geometry_score = 40
        estimation_status = "Dataset-based resource estimate"
    elif actual_geometry_blocks > 0:
        geometry_confidence = "Partial"
        geometry_score = 25
        estimation_status = "Mixed estimate — dataset geometry and normalized scenarios"
    else:
        geometry_confidence = "Scenario only"
        geometry_score = 5
        estimation_status = "Normalized resource potential scenario — actual geometry is required for mine-total tonnage"

    density_score = 20 if actual_density_blocks == seam_count else 10
    coverage_score = 25 if record_count >= 20 else 18 if record_count >= 10 else 10
    temporal_score = 15 if year_count >= 5 else 10 if year_count >= 3 else 5
    confidence = min(95, geometry_score + density_score + coverage_score + temporal_score)

    assumptions = []
    if scenario_blocks:
        assumptions.append(
            "Seams without mapped area use a normalized 1 km² scenario. These values are resource-potential indicators, not surveyed mine totals."
        )
    if actual_density_blocks < seam_count:
        assumptions.append(
            f"Missing density values use the configurable Phase 5A default of {DEFAULT_DENSITY_T_M3:.2f} t/m³."
        )
    if any(block["recovery_factor"] == DEFAULT_RECOVERY_FACTOR for block in resource_blocks):
        assumptions.append(
            f"Missing recovery values use the configurable Phase 5A default recovery factor of {DEFAULT_RECOVERY_FACTOR:.0%}."
        )
    assumptions.append(
        "Resource classification (Measured, Indicated, Inferred) is intentionally deferred to Phase 5B."
    )

    top_block = max(resource_blocks, key=lambda block: block["estimated_gross_tonnage"])

    block_lines = []
    for block in resource_blocks:
        block_lines.append(
            f"• {block['mine']} — {block['seam']}: "
            f"{format_number(block['estimated_gross_tonnage'])} t gross, "
            f"{format_number(block['estimated_recoverable_tonnage'])} t recoverable "
            f"({block['geometry_basis']})"
        )

    answer = f"""
⛏️ PHASE 5A — RESOURCE ESTIMATION FOUNDATION

MINE:
{mine if mine else "All Mines"}

PERIOD:
{start_year} to {end_year}

ESTIMATION STATUS:
{estimation_status}

RESOURCE BLOCKS:
{seam_count}

ESTIMATED GROSS RESOURCE:
{format_number(total_gross_tonnage)} tonnes

ESTIMATED RECOVERABLE RESOURCE:
{format_number(total_recoverable_tonnage)} tonnes

RESOURCE CONFIDENCE:
{confidence}%

GEOMETRY CONFIDENCE:
{geometry_confidence}

LEADING RESOURCE BLOCK:
{top_block['mine']} — {top_block['seam']}

Estimated Gross Tonnage:
{format_number(top_block['estimated_gross_tonnage'])} tonnes

RESOURCE BLOCK SUMMARY:

{"\n".join(block_lines)}

ESTIMATION METHOD:

Volume = Seam Area × Average Seam Thickness

Gross Tonnage = Volume × Density

Recoverable Tonnage = Gross Tonnage × Recovery Factor

ASSUMPTIONS & LIMITATIONS:

{" ".join("• " + item for item in assumptions)}

PHASE 5A OUTPUT:

This stage establishes the quantitative resource-estimation foundation. Formal resource confidence classification will be added in Phase 5B.

DATA EVIDENCE:

{record_count} historical mining records across {seam_count} seam block(s) and {year_count} year(s) were analyzed.
""".strip()

    return {
        "answer": answer,
        "phase": "Phase 5A — Resource Estimation Foundation",
        "mine": mine if mine else "All Mines",
        "period": f"{start_year} to {end_year}",
        "estimation_status": estimation_status,
        "resource_blocks": resource_blocks,
        "resource_block_count": seam_count,
        # Canonical totals plus compatibility aliases used by the integrated Phase 5D report.
        "estimated_gross_tonnage": round(total_gross_tonnage, 2),
        "total_in_situ_tonnage": round(total_gross_tonnage, 2),
        "total_resource_tonnes": round(total_gross_tonnage, 2),
        "estimated_recoverable_tonnage": round(total_recoverable_tonnage, 2),
        "total_recoverable_tonnage": round(total_recoverable_tonnage, 2),
        "recoverable_tonnage": round(total_recoverable_tonnage, 2),
        "confidence": confidence,
        "geometry_confidence": geometry_confidence,
        "assumptions": assumptions,
        "evidence": build_evidence(filtered, limit=10)
    }


# ============================================================
# PHASE 4F
# GEOLOGICAL RISK & SUITABILITY ENGINE
# ============================================================

def generate_geological_risk_assessment(question, records):

    mine = find_mine(question, records)
    start_year, end_year = find_year_range(question, records)

    filtered = filter_records(records, mine, start_year, end_year)

    if not filtered:
        return {
            "answer": "No geological records were found for the requested risk assessment.",
            "evidence": []
        }

    thickness_records = [
        record for record in filtered
        if record.get("thickness_m") is not None
    ]

    if not thickness_records:
        return {
            "answer": "The selected records do not contain enough thickness information for geological risk assessment.",
            "evidence": build_evidence(filtered)
        }

    thickness_values = [record["thickness_m"] for record in thickness_records]

    average_thickness = sum(thickness_values) / len(thickness_values)
    minimum_thickness = min(thickness_values)
    maximum_thickness = max(thickness_values)
    thickness_range = maximum_thickness - minimum_thickness

    years = sorted({
        record.get("year") for record in thickness_records
        if record.get("year") is not None
    })

    seams = sorted({
        record.get("seam") for record in thickness_records
        if record.get("seam")
    })

    record_count = len(thickness_records)
    year_count = len(years)
    seam_count = len(seams)

    # Thickness stability score: lower variation generally means more consistent conditions.
    variation_ratio = thickness_range / average_thickness if average_thickness > 0 else 1

    if variation_ratio <= 0.15:
        variability_risk = "Low"
        variability_score = 15
    elif variation_ratio <= 0.35:
        variability_risk = "Moderate"
        variability_score = 40
    elif variation_ratio <= 0.60:
        variability_risk = "High"
        variability_score = 70
    else:
        variability_risk = "Very High"
        variability_score = 90

    # Thin seam conditions may increase operational/geological complexity.
    if minimum_thickness >= 3:
        thickness_risk = "Low"
        thickness_score = 15
    elif minimum_thickness >= 2:
        thickness_risk = "Moderate"
        thickness_score = 40
    elif minimum_thickness >= 1:
        thickness_risk = "High"
        thickness_score = 70
    else:
        thickness_risk = "Very High"
        thickness_score = 90

    # Data coverage confidence is treated separately from geological condition.
    if record_count >= 20 and year_count >= 5:
        data_quality = "Strong"
        data_risk_score = 10
    elif record_count >= 10 and year_count >= 3:
        data_quality = "Good"
        data_risk_score = 25
    elif record_count >= 5:
        data_quality = "Limited"
        data_risk_score = 50
    else:
        data_quality = "Low"
        data_risk_score = 75

    geological_risk_score = round(
        variability_score * 0.45
        + thickness_score * 0.35
        + data_risk_score * 0.20
    )

    if geological_risk_score < 25:
        risk_level = "Low"
    elif geological_risk_score < 50:
        risk_level = "Moderate"
    elif geological_risk_score < 75:
        risk_level = "High"
    else:
        risk_level = "Very High"

    suitability_score = max(0, min(100, 100 - geological_risk_score))

    if suitability_score >= 80:
        suitability = "Highly Suitable"
    elif suitability_score >= 60:
        suitability = "Suitable"
    elif suitability_score >= 40:
        suitability = "Conditionally Suitable"
    else:
        suitability = "Requires Detailed Investigation"

    risk_factors = [
        {
            "factor": "Thickness Variability",
            "assessment": variability_risk,
            "score": variability_score,
            "evidence": f"Thickness range is {thickness_range:.2f} m around an average of {average_thickness:.2f} m."
        },
        {
            "factor": "Minimum Seam Thickness",
            "assessment": thickness_risk,
            "score": thickness_score,
            "evidence": f"Minimum recorded seam thickness is {minimum_thickness:.2f} m."
        },
        {
            "factor": "Data Coverage",
            "assessment": data_quality,
            "score": data_risk_score,
            "evidence": f"{record_count} records across {year_count} year(s) and {seam_count} seam(s) were available."
        }
    ]

    recommendations = []

    if variability_risk in ["High", "Very High"]:
        recommendations.append(
            "Prioritize detailed geological validation in areas showing strong seam thickness variation."
        )
    else:
        recommendations.append(
            "Maintain current geological monitoring because seam thickness variation is relatively controlled in the available data."
        )

    if thickness_risk in ["High", "Very High"]:
        recommendations.append(
            "Investigate thin seam zones before detailed mine planning or production optimization."
        )
    else:
        recommendations.append(
            "Recorded seam thickness conditions provide a generally favorable basis for further technical evaluation."
        )

    if data_quality in ["Limited", "Low"]:
        recommendations.append(
            "Increase geological sampling and historical data coverage to improve model confidence."
        )
    else:
        recommendations.append(
            "The available historical coverage provides a useful foundation for continued geological modeling."
        )

    answer = f"""
⚠️ PHASE 4F — GEOLOGICAL RISK & SUITABILITY ASSESSMENT

MINE:
{mine if mine else "All Mines"}

PERIOD:
{start_year} to {end_year}

OVERALL GEOLOGICAL RISK:
{risk_level}

RISK SCORE:
{geological_risk_score}/100

GEOLOGICAL SUITABILITY:
{suitability}

SUITABILITY SCORE:
{suitability_score}/100

THICKNESS CONDITIONS:

Average Thickness:
{average_thickness:.2f} m

Minimum Thickness:
{minimum_thickness:.2f} m

Maximum Thickness:
{maximum_thickness:.2f} m

Thickness Range:
{thickness_range:.2f} m

RISK FACTORS:

• Thickness Variability: {variability_risk}
• Minimum Seam Thickness: {thickness_risk}
• Data Coverage: {data_quality}

RECOMMENDATIONS:

{" ".join("• " + item for item in recommendations)}

DATA EVIDENCE:

The assessment is based on {record_count} geological records covering {seam_count} seam(s) across {year_count} year(s).
""".strip()

    return {
        "answer": answer,
        "risk_score": geological_risk_score,
        "risk_level": risk_level,
        "suitability_score": suitability_score,
        "suitability": suitability,
        "average_thickness": round(average_thickness, 2),
        "minimum_thickness": round(minimum_thickness, 2),
        "maximum_thickness": round(maximum_thickness, 2),
        "thickness_range": round(thickness_range, 2),
        "risk_factors": risk_factors,
        "recommendations": recommendations,
        "evidence": build_evidence(filtered, limit=10)
    }


# ============================================================
# PHASE 4E
# INTEGRATED GEOLOGICAL MODEL ENGINE
# ============================================================

def generate_integrated_geological_model(
    question,
    records
):

    # --------------------------------------------------------
    # IDENTIFY MINE AND PERIOD
    # --------------------------------------------------------

    mine = find_mine(
        question,
        records
    )

    start_year, end_year = find_year_range(
        question,
        records
    )


    # --------------------------------------------------------
    # FILTER DATA
    # --------------------------------------------------------

    filtered = filter_records(
        records,
        mine,
        start_year,
        end_year
    )


    if not filtered:

        return {

            "answer":
                "No geological records were found for the requested geological model.",

            "evidence": []

        }


    # ========================================================
    # 1. SEAM MODEL
    # ========================================================

    seam_data = defaultdict(list)

    for record in filtered:

        seam = record.get("seam")

        thickness = record.get("thickness_m")

        if seam and thickness is not None:

            seam_data[seam].append(thickness)


    seam_models = []

    for seam in sorted(seam_data.keys()):

        values = seam_data[seam]

        seam_models.append({

            "seam": seam,

            "records":
                len(values),

            "average_thickness":
                round(
                    sum(values) / len(values),
                    2
                ),

            "minimum_thickness":
                round(min(values), 2),

            "maximum_thickness":
                round(max(values), 2),

            "thickness_variation":
                round(
                    max(values) - min(values),
                    2
                )

        })


    # ========================================================
    # 2. THICKNESS STATISTICS
    # ========================================================

    thickness_records = [

        record

        for record in filtered

        if record.get("thickness_m") is not None

    ]


    thickness_values = [

        record.get("thickness_m")

        for record in thickness_records

    ]


    if not thickness_values:

        return {

            "answer":
                "The selected records do not contain thickness information.",

            "evidence":
                build_evidence(filtered)

        }


    average_thickness = (
        sum(thickness_values)
        / len(thickness_values)
    )


    minimum_thickness = min(
        thickness_values
    )


    maximum_thickness = max(
        thickness_values
    )


    thickness_range = (
        maximum_thickness
        - minimum_thickness
    )


    thickest_record = max(
        thickness_records,
        key=lambda x:
            x.get("thickness_m")
    )


    thinnest_record = min(
        thickness_records,
        key=lambda x:
            x.get("thickness_m")
    )


    # ========================================================
    # 3. GEOLOGICAL CONTINUITY
    # ========================================================

    seams = sorted(
        list(
            set(

                record.get("seam")

                for record in filtered

                if record.get("seam")

            )
        )
    )


    years = sorted(
        list(
            set(

                record.get("year")

                for record in filtered

                if record.get("year") is not None

            )
        )
    )


    seam_count = len(seams)

    year_count = len(years)

    record_count = len(filtered)


    # --------------------------------------------------------
    # CONTINUITY SCORE
    # --------------------------------------------------------

    continuity_score = 0


    if year_count >= 5:

        continuity_score += 40

    elif year_count >= 3:

        continuity_score += 30

    elif year_count >= 2:

        continuity_score += 20

    else:

        continuity_score += 10


    if seam_count >= 5:

        continuity_score += 30

    elif seam_count >= 3:

        continuity_score += 25

    elif seam_count >= 2:

        continuity_score += 20

    else:

        continuity_score += 10


    if record_count >= 20:

        continuity_score += 30

    elif record_count >= 10:

        continuity_score += 25

    elif record_count >= 5:

        continuity_score += 15

    else:

        continuity_score += 10


    if continuity_score >= 80:

        continuity_assessment = (
            "High geological continuity"
        )

    elif continuity_score >= 60:

        continuity_assessment = (
            "Moderate geological continuity"
        )

    else:

        continuity_assessment = (
            "Limited geological continuity"
        )


    # ========================================================
    # 4. GEOLOGICAL STRUCTURE
    # ========================================================

    if thickness_range <= 1:

        structural_consistency = (
            "Highly consistent thickness distribution"
        )

    elif thickness_range <= 3:

        structural_consistency = (
            "Moderately variable thickness distribution"
        )

    else:

        structural_consistency = (
            "Highly variable thickness distribution"
        )


    # ========================================================
    # 5. ANOMALY DETECTION
    # ========================================================

    anomalies = []


    for record in thickness_records:

        thickness = record.get(
            "thickness_m"
        )


        if thickness > average_thickness * 1.5:

            anomalies.append({

                "type":
                    "High Thickness Anomaly",

                "seam":
                    record.get("seam"),

                "year":
                    record.get("year"),

                "thickness_m":
                    thickness

            })


        elif thickness < average_thickness * 0.5:

            anomalies.append({

                "type":
                    "Low Thickness Anomaly",

                "seam":
                    record.get("seam"),

                "year":
                    record.get("year"),

                "thickness_m":
                    thickness

            })


    # Limit anomalies

    anomalies = anomalies[:10]


    # ========================================================
    # 6. GEOLOGICAL OBSERVATIONS
    # ========================================================

    observations = []


    if average_thickness >= 4:

        observations.append(
            "The model indicates generally thick seam conditions across the analyzed geological records."
        )

    elif average_thickness >= 2:

        observations.append(
            "The model indicates moderate seam thickness conditions."
        )

    else:

        observations.append(
            "The model indicates comparatively thin seam conditions."
        )


    observations.append(
        f"{seam_count} seam(s) were identified within the selected geological model."
    )


    observations.append(
        f"The model covers {year_count} year(s) of available historical geological data."
    )


    observations.append(
        f"Thickness variation across the dataset is {thickness_range:.2f} m."
    )


    observations.append(
        structural_consistency + "."
    )


    observations.append(
        continuity_assessment + "."
    )


    if anomalies:

        observations.append(
            f"{len(anomalies)} potential geological thickness anomaly record(s) were detected."
        )

    else:

        observations.append(
            "No major thickness anomalies were detected using the current model thresholds."
        )


    # ========================================================
    # 7. MODEL CONFIDENCE
    # ========================================================

    confidence = 50


    if record_count >= 20:

        confidence += 20

    elif record_count >= 10:

        confidence += 15

    elif record_count >= 5:

        confidence += 10


    if year_count >= 5:

        confidence += 15

    elif year_count >= 3:

        confidence += 10


    if seam_count >= 3:

        confidence += 10

    elif seam_count >= 2:

        confidence += 5


    confidence = min(
        confidence,
        98
    )


    # ========================================================
    # 8. INTEGRATED MODEL DATA
    # ========================================================

    geological_model = {

        "model_type":
            "Integrated Geological Model",

        "phase":
            "Phase 5A",

        "mine":
            mine if mine else "All Mines",

        "period":
            f"{start_year} to {end_year}",


        # SEAM MODEL

        "seam_model": {

            "seams":
                seam_models,

            "seam_count":
                seam_count

        },


        # THICKNESS MODEL

        "thickness_model": {

            "average_thickness":
                round(
                    average_thickness,
                    2
                ),

            "minimum_thickness":
                round(
                    minimum_thickness,
                    2
                ),

            "maximum_thickness":
                round(
                    maximum_thickness,
                    2
                ),

            "thickness_range":
                round(
                    thickness_range,
                    2
                )

        },


        # EXTREME RECORDS

        "thickest_seam": {

            "seam":
                thickest_record.get("seam"),

            "year":
                thickest_record.get("year"),

            "thickness_m":
                thickest_record.get(
                    "thickness_m"
                )

        },


        "thinnest_seam": {

            "seam":
                thinnest_record.get("seam"),

            "year":
                thinnest_record.get("year"),

            "thickness_m":
                thinnest_record.get(
                    "thickness_m"
                )

        },


        # CONTINUITY

        "continuity": {

            "score":
                continuity_score,

            "assessment":
                continuity_assessment,

            "years_covered":
                year_count,

            "records":
                record_count

        },


        # STRUCTURE

        "structure": {

            "assessment":
                structural_consistency,

            "thickness_variation":
                round(
                    thickness_range,
                    2
                )

        },


        # INTELLIGENCE

        "observations":
            observations,

        "anomalies":
            anomalies,

        "confidence":
            confidence

    }


    # ========================================================
    # 9. CREATE ANSWER
    # ========================================================

    seam_names = ", ".join(seams)


    anomaly_text = (
        f"{len(anomalies)} potential anomaly record(s) detected."
        if anomalies
        else
        "No major thickness anomalies detected."
    )


    answer = f"""
🪨 INTEGRATED GEOLOGICAL MODEL

PHASE:
Phase 4E — Geological Model Integration

MINE:
{mine if mine else "All Mines"}

PERIOD ANALYZED:
{start_year} to {end_year}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEAM MODEL

Seams Identified:
{seam_names}

Number of Seams:
{seam_count}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THICKNESS MODEL

Average Thickness:
{average_thickness:.2f} m

Minimum Thickness:
{minimum_thickness:.2f} m

Maximum Thickness:
{maximum_thickness:.2f} m

Thickness Variation:
{thickness_range:.2f} m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THICKEST SEAM RECORD

Seam:
{thickest_record.get("seam")}

Thickness:
{thickest_record.get("thickness_m"):.2f} m

Year:
{thickest_record.get("year")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THINNEST SEAM RECORD

Seam:
{thinnest_record.get("seam")}

Thickness:
{thinnest_record.get("thickness_m"):.2f} m

Year:
{thinnest_record.get("year")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GEOLOGICAL CONTINUITY

Assessment:
{continuity_assessment}

Continuity Score:
{continuity_score}/100

Years Represented:
{year_count}

Historical Records:
{record_count}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GEOLOGICAL STRUCTURE

{structural_consistency}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANOMALY ANALYSIS

{anomaly_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY GEOLOGICAL OBSERVATIONS

{" ".join("• " + observation for observation in observations)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODEL CONFIDENCE

{confidence}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATA EVIDENCE

The integrated geological model was generated from {record_count} historical mining and geological records.

This structured geological model is prepared for future visualization and 3D integration in Phase 8.
""".strip()


    return {

        "answer":
            answer,

        "model":
            geological_model,

        "mine":
            mine,

        "period":
            f"{start_year} to {end_year}",

        "average_thickness":
            round(
                average_thickness,
                2
            ),

        "seams":
            seams,

        "continuity_score":
            continuity_score,

        "confidence":
            confidence,

        "anomalies":
            anomalies,

        "evidence":
            build_evidence(
                filtered,
                limit=10
            )

    }


# ============================================================
# GEOLOGICAL REPORT
# ============================================================

def generate_geological_report(question, records):

    mine = find_mine(
        question,
        records
    )

    start_year, end_year = find_year_range(
        question,
        records
    )

    filtered = filter_records(
        records,
        mine,
        start_year,
        end_year
    )

    if not filtered:

        return {

            "answer":
                "No geological records were found for the requested criteria.",

            "evidence": []

        }


    seams = sorted(
        set(
            record["seam"]

            for record in filtered

            if record.get("seam")
        )
    )


    thickness_records = [

        record

        for record in filtered

        if record.get("thickness_m") is not None

    ]


    if not thickness_records:

        return {

            "answer":
                "No thickness information was found.",

            "evidence":
                build_evidence(filtered)

        }


    thickness_values = [

        record["thickness_m"]

        for record in thickness_records

    ]


    average_thickness = (
        sum(thickness_values)
        / len(thickness_values)
    )


    thickest_record = max(
        thickness_records,
        key=lambda x:
            x["thickness_m"]
    )


    answer = f"""
🪨 GEOLOGICAL REPORT

MINE:
{mine if mine else "All Mines"}

PERIOD ANALYZED:
{start_year} to {end_year}

SEAMS ANALYZED:
{", ".join(seams)}

AVERAGE THICKNESS:
{average_thickness:.2f} m

THICKEST SEAM:
{thickest_record["seam"]}

MAXIMUM THICKNESS:
{thickest_record["thickness_m"]:.2f} m

YEAR OF EVIDENCE:
{thickest_record.get("year")}

DATA EVIDENCE:

{len(filtered)} geological records were analyzed from the MINQORA historical mining dataset.
""".strip()


    return {

        "answer": answer,

        "mine": mine,

        "period":
            f"{start_year} to {end_year}",

        "seams":
            seams,

        "average_thickness":
            round(
                average_thickness,
                2
            ),

        "evidence":
            build_evidence(
                filtered
            )

    }


# ============================================================
# PRODUCTION REPORT
# ============================================================

def generate_production_report(question, records):

    mine = find_mine(question, records)

    start_year, end_year = find_year_range(
        question,
        records
    )

    filtered = filter_records(
        records,
        mine,
        start_year,
        end_year
    )


    if not filtered:

        return {

            "answer":
                "No production records were found.",

            "evidence": []

        }


    yearly_production = defaultdict(float)


    for record in filtered:

        year = record.get("year")

        production = (
            record.get("production_tonnes")
            or 0
        )

        if year:

            yearly_production[year] += production


    sorted_years = sorted(
        yearly_production.keys()
    )


    total_production = sum(
        yearly_production.values()
    )


    trend = "Stable"


    if len(sorted_years) >= 2:

        first_value = yearly_production[
            sorted_years[0]
        ]

        last_value = yearly_production[
            sorted_years[-1]
        ]


        if last_value > first_value:

            trend = "Increasing"

        elif last_value < first_value:

            trend = "Declining"


    growth_text = (
        "Insufficient historical comparison data."
    )


    if len(sorted_years) >= 2:

        first_value = yearly_production[
            sorted_years[0]
        ]

        last_value = yearly_production[
            sorted_years[-1]
        ]


        if first_value != 0:

            growth = (
                (last_value - first_value)
                / first_value
            ) * 100


            growth_text = (
                f"Production changed by "
                f"{growth:.2f}% "
                f"between {sorted_years[0]} "
                f"and {sorted_years[-1]}."
            )


    yearly_text = ""


    for year in sorted_years:

        yearly_text += (
            f"\n{year}: "
            f"{format_number(yearly_production[year])} tonnes"
        )


    answer = f"""
📊 PRODUCTION REPORT

MINE:
{mine if mine else "All Mines"}

PERIOD:
{start_year} to {end_year}

TOTAL PRODUCTION:
{format_number(total_production)} tonnes

YEAR-WISE PRODUCTION:
{yearly_text}

PRODUCTION TREND:
{trend}

GROWTH / DECLINE:
{growth_text}

DATA SOURCE:
MINQORA Historical Mining Dataset

DATA EVIDENCE:
{len(filtered)} production records were analyzed.
""".strip()


    return {

        "answer": answer,

        "total_production":
            total_production,

        "trend":
            trend,

        "yearly_production":
            dict(yearly_production),

        "evidence":
            build_evidence(filtered)

    }


# ============================================================
# EXECUTIVE SUMMARY
# ============================================================

def generate_executive_summary(question, records):

    mine = find_mine(question, records)

    start_year, end_year = find_year_range(
        question,
        records
    )

    filtered = filter_records(
        records,
        mine,
        start_year,
        end_year
    )


    if not filtered:

        return {

            "answer":
                "No mining records were found.",

            "evidence": []

        }


    production_values = [

        record.get("production_tonnes")

        for record in filtered

        if record.get("production_tonnes") is not None

    ]


    thickness_values = [

        record.get("thickness_m")

        for record in filtered

        if record.get("thickness_m") is not None

    ]


    seams = sorted(
        set(
            record.get("seam")

            for record in filtered

            if record.get("seam")
        )
    )


    total_production = sum(
        production_values
    )


    average_thickness = (

        sum(thickness_values)
        / len(thickness_values)

        if thickness_values

        else 0

    )


    answer = f"""
📈 EXECUTIVE MINING SUMMARY

MINE:
{mine if mine else "All Mines"}

PERIOD:
{start_year} to {end_year}

TOTAL PRODUCTION:
{format_number(total_production)} tonnes

SEAMS ANALYZED:
{", ".join(seams)}

AVERAGE THICKNESS:
{average_thickness:.2f} m

KEY FINDINGS:

• {len(filtered)} historical records were analyzed.
• Production and geological information were combined.
• Multiple mining indicators were evaluated.

DATA EVIDENCE:

The findings are supported by historical records stored in the MINQORA mining dataset.
""".strip()


    return {

        "answer": answer,

        "total_production":
            total_production,

        "average_thickness":
            round(
                average_thickness,
                2
            ),

        "evidence":
            build_evidence(filtered)

    }


# ============================================================
# PRODUCTION FORECAST
# ============================================================

def predict_production(question, records):

    mine = find_mine(
        question,
        records
    )

    q = question.lower()

    future_years = 3


    match = re.search(
        r"next\s+(\d+)\s+years?",
        q
    )


    if match:

        future_years = int(
            match.group(1)
        )


    filtered = filter_records(
        records,
        mine
    )


    if not filtered:

        return {

            "answer":
                "No historical production data was found for prediction.",

            "evidence": []

        }


    yearly_production = defaultdict(float)


    for record in filtered:

        year = record.get("year")

        production = (
            record.get("production_tonnes")
            or 0
        )


        if year:

            yearly_production[year] += production


    years = sorted(
        yearly_production.keys()
    )


    if len(years) < 2:

        return {

            "answer":
                "MINQORA requires at least two years of historical production data to generate a forecast.",

            "evidence":
                build_evidence(filtered)

        }


    first_year = years[0]

    last_year = years[-1]

    first_value = yearly_production[first_year]

    last_value = yearly_production[last_year]


    year_difference = (
        last_year - first_year
    )


    yearly_change = (

        (last_value - first_value)
        / year_difference

        if year_difference != 0

        else 0

    )


    predictions = []

    current_value = last_value


    for i in range(
        1,
        future_years + 1
    ):

        prediction_year = (
            last_year + i
        )


        predicted_value = (
            current_value
            + yearly_change
        )


        predictions.append({

            "year":
                prediction_year,

            "predicted_production":
                round(predicted_value)

        })


        current_value = predicted_value


    prediction_text = ""


    for prediction in predictions:

        prediction_text += (
            f"\n{prediction['year']}: "
            f"{format_number(prediction['predicted_production'])} tonnes"
        )


    answer = f"""
📈 PRODUCTION FORECAST

MINE:
{mine if mine else "All Mines"}

HISTORICAL PERIOD:
{first_year} to {last_year}

FORECAST PERIOD:
{last_year + 1} to {last_year + future_years}

PREDICTED PRODUCTION:
{prediction_text}

FORECAST METHOD:

MINQORA analyzed the historical year-wise production trend and estimated future production using the observed rate of change.

DATA EVIDENCE:

The forecast is based on {len(filtered)} historical mining records.
""".strip()


    return {

        "answer": answer,

        "predictions":
            predictions,

        "evidence":
            build_evidence(filtered)

    }


# ============================================================
# MINE COMPARISON
# ============================================================

def compare_mines(records):

    mine_production = defaultdict(float)

    mine_thickness = defaultdict(list)


    for record in records:

        mine = record.get("mine")

        if not mine:

            continue


        mine_production[mine] += (
            record.get("production_tonnes")
            or 0
        )


        thickness = record.get(
            "thickness_m"
        )


        if thickness is not None:

            mine_thickness[mine].append(
                thickness
            )


    if not mine_production:

        return {

            "answer":
                "No mine comparison data is available.",

            "evidence": []

        }


    best_mine = max(
        mine_production,
        key=mine_production.get
    )


    comparison_text = ""


    for mine in sorted(
        mine_production.keys()
    ):

        thickness_values = mine_thickness[mine]


        average_thickness = (

            sum(thickness_values)
            / len(thickness_values)

            if thickness_values

            else 0

        )


        comparison_text += f"""

{mine}

Total Production:
{format_number(mine_production[mine])} tonnes

Average Thickness:
{average_thickness:.2f} m
"""


    answer = f"""
⛏️ MINE COMPARISON

{comparison_text}

BEST PRODUCTION PERFORMANCE:

{best_mine}

Total Historical Production:

{format_number(mine_production[best_mine])} tonnes.

DATA EVIDENCE:

{len(records)} mining records were analyzed.
""".strip()


    return {

        "answer": answer,

        "best_mine":
            best_mine,

        "evidence":
            build_evidence(records)

    }


# ============================================================
# PRODUCTION ANALYSIS
# ============================================================

def analyze_production(question, records):

    mine = find_mine(
        question,
        records
    )

    start_year, end_year = find_year_range(
        question,
        records
    )

    filtered = filter_records(
        records,
        mine,
        start_year,
        end_year
    )


    if not filtered:

        return {

            "answer":
                "No production records were found.",

            "evidence": []

        }


    total = sum(

        record.get("production_tonnes")
        or 0

        for record in filtered

    )


    average = (
        total / len(filtered)
    )


    answer = f"""
📊 PRODUCTION ANALYSIS

MINE:
{mine if mine else "All Mines"}

PERIOD:
{start_year} to {end_year}

TOTAL PRODUCTION:
{format_number(total)} tonnes

AVERAGE PRODUCTION PER RECORD:
{format_number(average)} tonnes

RECORDS ANALYZED:
{len(filtered)}

DATA EVIDENCE:

The analysis is based on the historical production records shown below.
""".strip()


    return {

        "answer": answer,

        "total_production":
            total,

        "average_production":
            average,

        "evidence":
            build_evidence(filtered)

    }


# ============================================================
# SEAM ANALYSIS
# ============================================================

def analyze_seams(question, records):

    mine = find_mine(
        question,
        records
    )

    filtered = filter_records(
        records,
        mine
    )


    thickness_records = [

        record

        for record in filtered

        if record.get("thickness_m") is not None

    ]


    if not thickness_records:

        return {

            "answer":
                "No thickness information is available.",

            "evidence": []

        }


    thickest = max(
        thickness_records,
        key=lambda x:
            x["thickness_m"]
    )


    thinnest = min(
        thickness_records,
        key=lambda x:
            x["thickness_m"]
    )


    average = (

        sum(
            record["thickness_m"]

            for record in thickness_records
        )

        / len(thickness_records)

    )


    answer = f"""
🪨 SEAM THICKNESS ANALYSIS

MINE:
{mine if mine else "All Mines"}

AVERAGE THICKNESS:
{average:.2f} m

THICKEST RECORD:

Seam:
{thickest["seam"]}

Thickness:
{thickest["thickness_m"]:.2f} m

Year:
{thickest.get("year")}

THINNEST RECORD:

Seam:
{thinnest["seam"]}

Thickness:
{thinnest["thickness_m"]:.2f} m

DATA EVIDENCE:

{len(thickness_records)} thickness records were analyzed.
""".strip()


    return {

        "answer": answer,

        "average_thickness":
            round(
                average,
                2
            ),

        "evidence":
            build_evidence(
                thickness_records
            )

    }


# ============================================================
# GENERAL RESPONSE
# ============================================================

def general_response(records):

    mines = get_mines(records)


    years = sorted(
        set(

            record.get("year")

            for record in records

            if record.get("year") is not None

        )
    )


    answer = f"""
⛏️ MINQORA MINING INTELLIGENCE

I can analyze the available mining dataset.

AVAILABLE MINES:

{", ".join(mines)}

AVAILABLE PERIOD:

{min(years) if years else "N/A"} to {max(years) if years else "N/A"}

AVAILABLE CAPABILITIES:

• Production analysis
• Mine comparison
• Seam thickness analysis
• Production forecasting
• Geological reports
• Production reports
• Executive mining summaries
• Integrated Geological Modeling — Phase 4E
• Geological Risk & Suitability Assessment — Phase 4F
• Resource Estimation Foundation — Phase 5A
• Resource Classification — Phase 5B
• Resource Confidence & Uncertainty — Phase 5C
• Resource Intelligence Reporting — Phase 5D
• Resource Risk & Scenario Analysis — Phase 5E
• Mine Design Foundation — Phase 6A

TRY QUESTIONS SUCH AS:

"Predict production for Mine Alpha for the next 3 years"

"Generate a geological report for Mine Alpha from 2023 to 2025"

"Prepare a production report for Mine Alpha from 2018 to 2025"

"Compare all mines"

"Which mine has the thickest seams?"

"Generate an integrated geological model for Mine Alpha"

"Analyze the complete geological model of Mine Alpha from 2023 to 2025"

"Assess geological risk for Mine Alpha"

"Evaluate geological suitability for Mine Alpha from 2023 to 2025"

"Estimate resources for Mine Alpha"

"Evaluate resource potential for Mine Alpha from 2023 to 2025"
""".strip()


    return {

        "answer": answer,

        "evidence":
            build_evidence(
                records,
                limit=5
            )

    }


# ============================================================
# HOME
# ============================================================

@app.get("/")

def home():

    return {

        "message":
            "MINQORA Mining Intelligence API is running",

        "status":
            "online",

        "version":
            "6.0",

        "phase":
            "Phase 5A — Resource Estimation Foundation"

    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")

def health():

    records = get_data()

    return {

        "status":
            "healthy",

        "records_loaded":
            len(records),

        "phase":
            "Phase 4F"

    }


# ============================================================
# DASHBOARD DATA
# ============================================================

@app.get("/data")
def dashboard_data():

    records = get_data()

    production_values = [
        r.get("production_tonnes")
        for r in records
        if r.get("production_tonnes") is not None
    ]

    thickness_values = [
        r.get("thickness_m")
        for r in records
        if r.get("thickness_m") is not None
    ]

    active_seams = len({
        r.get("seam")
        for r in records
        if r.get("seam")
    })

    return {
        "status": "online",
        "total_records": len(records),
        "total_production": sum(production_values),
        "average_seam_thickness": round(
            sum(thickness_values) / len(thickness_values), 2
        ) if thickness_values else 0,
        "active_seams": active_seams,
        "phase": "Phase 5A"
    }


# ============================================================
# RESOURCE ESTIMATION ENDPOINT
# ============================================================

@app.get("/resource-classification")
def resource_classification(mine: str = None, start_year: int = None, end_year: int = None):

    records = get_data()

    if not records:
        raise HTTPException(
            status_code=500,
            detail="No mining data could be loaded. Please check mining_data.csv."
        )

    question_parts = ["resource classification"]

    if mine:
        question_parts.append(mine)

    if start_year is not None and end_year is not None:
        question_parts.append(f"from {start_year} to {end_year}")
    elif start_year is not None:
        question_parts.append(str(start_year))

    return generate_resource_classification(
        " ".join(question_parts),
        records
    )


@app.get("/resource-estimation")
def resource_estimation(mine: str = None, start_year: int = None, end_year: int = None):

    records = get_data()

    if not records:
        raise HTTPException(
            status_code=500,
            detail="No mining data could be loaded. Please check mining_data.csv."
        )

    question_parts = ["resource estimation"]

    if mine:
        question_parts.append(mine)

    if start_year is not None and end_year is not None:
        question_parts.append(f"from {start_year} to {end_year}")
    elif start_year is not None:
        question_parts.append(str(start_year))

    result = generate_resource_estimation(
        " ".join(question_parts),
        records
    )

    return result


# ============================================================
# DEBUG DATA
# ============================================================

@app.get("/debug-data")

def debug_data():

    records = get_data()

    return {

        "data_file":
            DATA_FILE,

        "file_exists":
            os.path.exists(DATA_FILE),

        "checked_data_paths":
            DATA_CANDIDATES,

        "records_loaded":
            len(records),

        "first_record":
            records[0]
            if records
            else {},

        "columns":
            list(records[0].keys())
            if records
            else []

    }


# ============================================================
# HISTORICAL CONDITION-BASED PREDICTION
# ============================================================


def prediction_number(value):
    try:
        if value is None:
            return None
        text = str(value).strip().replace(",", "")
        if text == "":
            return None
        return float(text)
    except Exception:
        return None


def prediction_text(value):
    if value is None:
        return ""
    return str(value).strip().lower()


def calculate_prediction_similarity(input_data, record):
    score = 0.0
    max_score = 0.0

    # Mine = 20 points
    max_score += 20
    historical_mine = prediction_text(record.get("mine") or record.get("mine_name"))
    requested_mine = prediction_text(input_data.mine_name)
    if historical_mine == requested_mine and requested_mine:
        score += 20

    # Seam = 20 points
    max_score += 20
    historical_seam = prediction_text(record.get("seam") or record.get("seam_name"))
    requested_seam = prediction_text(input_data.seam)
    if historical_seam == requested_seam and requested_seam:
        score += 20

    # Thickness = 20 points; 5 m difference or more gives 0 points.
    max_score += 20
    historical_thickness = prediction_number(record.get("thickness_m") or record.get("thickness"))
    if historical_thickness is not None:
        difference = abs(input_data.thickness - historical_thickness)
        score += max(0.0, 20.0 - (difference * 4.0))

    # Depth = 20 points; 400 m difference or more gives 0 points.
    max_score += 20
    historical_depth = prediction_number(record.get("depth_m") or record.get("depth"))
    if historical_depth is not None:
        difference = abs(input_data.depth - historical_depth)
        score += max(0.0, 20.0 - (difference / 20.0))

    # Ash = 10 points; 10 percentage points difference gives 0 points.
    max_score += 10
    historical_ash = prediction_number(record.get("ash_content") or record.get("ash"))
    if historical_ash is not None:
        difference = abs(input_data.ash_content - historical_ash)
        score += max(0.0, 10.0 - difference)

    # Moisture = 10 points; 10 percentage points difference gives 0 points.
    max_score += 10
    historical_moisture = prediction_number(record.get("moisture"))
    if historical_moisture is not None:
        difference = abs(input_data.moisture - historical_moisture)
        score += max(0.0, 10.0 - difference)

    return round((score / max_score) * 100.0, 2) if max_score else 0.0


def _weighted_prediction_average(records, field_names):
    numerator = 0.0
    denominator = 0.0

    for record in records:
        value = None
        for field in field_names:
            if record.get(field) is not None:
                value = prediction_number(record.get(field))
                if value is not None:
                    break

        if value is None:
            continue

        weight = max(float(record.get("similarity", 0.0)), 1.0)
        numerator += value * weight
        denominator += weight

    if denominator == 0:
        return None

    return numerator / denominator


@app.post("/predict/custom")
def custom_historical_prediction(request: PredictionRequest):
    """Condition-based prediction using the closest historical records."""

    records = get_data()

    if not records:
        raise HTTPException(
            status_code=404,
            detail="No historical mining data is available."
        )

    scored_records = []

    for record in records:
        scored_record = dict(record)
        scored_record["similarity"] = calculate_prediction_similarity(request, record)
        scored_records.append(scored_record)

    scored_records.sort(
        key=lambda item: item.get("similarity", 0.0),
        reverse=True
    )

    top_records = scored_records[:10]

    if not top_records:
        raise HTTPException(
            status_code=404,
            detail="No historical records could be used for prediction."
        )

    predicted_production = _weighted_prediction_average(
        top_records,
        ["production_tonnes", "production", "output"]
    )

    predicted_recovery = _weighted_prediction_average(
        top_records,
        ["recovery", "recovery_pct", "recovery_percent", "recovery_factor"]
    )

    if predicted_recovery is not None and 0 <= predicted_recovery <= 1:
        predicted_recovery *= 100

    predicted_ash = _weighted_prediction_average(
        top_records,
        ["ash_content", "ash", "ash_pct", "ash_percent"]
    )

    predicted_moisture = _weighted_prediction_average(
        top_records,
        ["moisture", "moisture_pct", "moisture_percent"]
    )

    risk_scores = defaultdict(float)

    for record in top_records:
        risk = str(record.get("risk_level") or record.get("risk") or "").strip().upper()
        if not risk:
            continue
        weight = max(float(record.get("similarity", 0.0)), 1.0)
        risk_scores[risk] += weight

    predicted_risk = max(risk_scores, key=risk_scores.get) if risk_scores else "NOT_AVAILABLE"

    similarity_values = [float(record.get("similarity", 0.0)) for record in top_records]
    confidence = round(sum(similarity_values) / len(similarity_values), 2) if similarity_values else 0.0

    historical_references = []

    for record in top_records:
        historical_references.append({
            "id": record.get("id"),
            "date": record.get("date") or record.get("year"),
            "mine_name": record.get("mine") or record.get("mine_name"),
            "seam": record.get("seam") or record.get("seam_name"),
            "thickness": record.get("thickness_m") or record.get("thickness"),
            "depth": record.get("depth_m") or record.get("depth"),
            "production": record.get("production_tonnes") or record.get("production") or record.get("output"),
            "recovery": record.get("recovery"),
            "ash_content": record.get("ash_content") or record.get("ash"),
            "moisture": record.get("moisture"),
            "risk_level": record.get("risk_level") or "NOT_AVAILABLE",
            "similarity": record.get("similarity")
        })

    recommendations = []

    if predicted_risk == "HIGH":
        recommendations.append(
            "Historical records with similar mining conditions indicate elevated operational risk. Additional geological and operational assessment is recommended."
        )
    elif predicted_risk == "MEDIUM":
        recommendations.append(
            "Historical records indicate medium operational risk under similar mining conditions. Enhanced operational monitoring is recommended."
        )
    elif predicted_risk == "LOW":
        recommendations.append(
            "Historical records indicate relatively low operational risk under similar mining conditions."
        )
    else:
        recommendations.append(
            "A historical risk classification was not available in the source records used for this prediction."
        )

    if predicted_recovery is not None:
        if predicted_recovery < 70:
            recommendations.append(
                "Predicted recovery is below 70%. Review extraction efficiency, dilution control and mining method selection."
            )
        else:
            recommendations.append(
                "Predicted recovery is favorable based on the selected similar historical records."
            )

    if predicted_ash is not None and request.ash_content > predicted_ash:
        recommendations.append(
            "The entered ash content is higher than the historical prediction average. Coal quality should be monitored carefully."
        )

    if confidence < 50:
        recommendations.append(
            "Prediction confidence is limited because the entered conditions have weak similarity with the available historical records."
        )
    elif confidence >= 80:
        recommendations.append(
            "Prediction confidence is high because the historical records closely match the entered mining conditions."
        )
    else:
        recommendations.append(
            "Prediction confidence is moderate because the historical records provide a partial match to the entered conditions."
        )

    return {
        "status": "SUCCESS",
        "prediction_type": "HISTORICAL_DATA_BASED",
        "input_conditions": {
            "mine_name": request.mine_name,
            "seam": request.seam,
            "thickness": request.thickness,
            "depth": request.depth,
            "ash_content": request.ash_content,
            "moisture": request.moisture
        },
        "prediction": {
            "production": round(predicted_production, 2) if predicted_production is not None else None,
            "recovery": round(predicted_recovery, 2) if predicted_recovery is not None else None,
            "risk_level": predicted_risk,
            "expected_ash_content": round(predicted_ash, 2) if predicted_ash is not None else None,
            "expected_moisture": round(predicted_moisture, 2) if predicted_moisture is not None else None,
            "confidence": confidence
        },
        "historical_records_analyzed": len(records),
        "historical_records_used": len(top_records),
        "historical_references": historical_references,
        "recommendations": recommendations
    }


# ============================================================
# MINING DATA ENDPOINT
# ============================================================

@app.get("/mining-data")

def mining_data():

    records = get_data()

    return {

        "records":
            records,

        "count":
            len(records)

    }


# ============================================================
# ASK ENDPOINT
# ============================================================

@app.post("/ask")

def ask_question(request: AskRequest):

    question = request.question.strip()


    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )


    records = get_data()


    if not records:

        raise HTTPException(
            status_code=500,
            detail=(
                "No mining data could be loaded. "
                "Please check mining_data.csv."
            )
        )


    # ========================================================
    # UNDERSTAND QUESTION
    # ========================================================

    intent_data = understand_question(
        question
    )


    intent = intent_data["intent"]


    # ========================================================
    # PHASE 4E
    # INTEGRATED GEOLOGICAL MODEL
    # ========================================================

    if intent == "mine_design_foundation":

        result = generate_mine_design_foundation(
            question,
            records
        )

    elif intent == "resource_scenario_analysis":

        result = generate_resource_scenario_analysis(
            question,
            records
        )

    elif intent == "resource_reporting":

        result = generate_resource_report(
            question,
            records
        )

    elif intent == "resource_confidence_analysis":

        mine = find_mine(question, records)
        result = analyze_resource_confidence(
            records,
            mine
        )

    elif intent == "resource_classification":

        result = generate_resource_classification(
            question,
            records
        )

    elif intent == "resource_estimation":

        result = generate_resource_estimation(
            question,
            records
        )

    elif intent == "geological_risk_assessment":

        result = generate_geological_risk_assessment(
            question,
            records
        )

    elif intent == "integrated_geological_model":

        result = generate_integrated_geological_model(
            question,
            records
        )


    # ========================================================
    # GEOLOGICAL REPORT
    # ========================================================

    elif intent == "geological_report":

        result = generate_geological_report(
            question,
            records
        )


    # ========================================================
    # PRODUCTION REPORT
    # ========================================================

    elif intent == "production_report":

        result = generate_production_report(
            question,
            records
        )


    # ========================================================
    # EXECUTIVE SUMMARY
    # ========================================================

    elif intent == "executive_summary":

        result = generate_executive_summary(
            question,
            records
        )


    # ========================================================
    # PREDICTION
    # ========================================================

    elif intent == "production_forecast":

        result = predict_production(
            question,
            records
        )


    # ========================================================
    # COMPARISON
    # ========================================================

    elif intent == "mine_comparison":

        result = compare_mines(
            records
        )


    # ========================================================
    # PRODUCTION ANALYSIS
    # ========================================================

    elif intent == "production_analysis":

        result = analyze_production(
            question,
            records
        )


    # ========================================================
    # SEAM ANALYSIS
    # ========================================================

    elif intent == "seam_analysis":

        result = analyze_seams(
            question,
            records
        )


    # ========================================================
    # GENERAL
    # ========================================================

    else:

        result = general_response(
            records
        )


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "question":
            question,

        "answer":
            result.get("answer", ""),

        "response":
            result.get("answer", ""),

        "intent":
            intent_data["intent"],

        "confidence":
            intent_data["confidence"],

        "source":
            intent_data["source"],

        "records_analyzed":
            len(records),

        "records_used":
            len(
                result.get(
                    "evidence",
                    []
                )
            ),

        "evidence":
            result.get(
                "evidence",
                []
            ),

        "report_data":
            result

    }


# ============================================================
# PHASE 5E — RESOURCE RISK & SCENARIO ANALYSIS
# ============================================================

def generate_resource_scenario_analysis(question, records):
    """
    Phase 5E converts the Phase 5A estimate and Phase 5C uncertainty
    into transparent planning scenarios. These are decision-support scenarios,
    not certified mineral-resource statements.
    """

    mine, start_year, end_year, filtered = _resource_reporting_filters(question, records)

    if not filtered:
        return {
            "answer": "No records were found for the requested resource scenario analysis.",
            "evidence": []
        }

    estimation = generate_resource_estimation(question, records)
    confidence = analyze_resource_confidence(records, mine)
    classification = generate_resource_classification(question, records)

    base_in_situ = float(estimation.get("total_in_situ_tonnage", 0) or 0)
    base_recoverable = float(estimation.get("total_recoverable_tonnage", 0) or 0)
    uncertainty = float(confidence.get("average_uncertainty_percent", 35) or 35)
    confidence_score = float(confidence.get("average_confidence_score", 0) or 0)

    # Keep scenarios bounded and explicitly linked to uncertainty.
    downside_factor = max(0.0, 1 - uncertainty / 100)
    upside_factor = 1 + uncertainty / 100

    scenarios = [
        {
            "scenario": "Conservative / Downside",
            "factor": round(downside_factor, 4),
            "in_situ_tonnage": round(base_in_situ * downside_factor),
            "recoverable_tonnage": round(base_recoverable * downside_factor),
            "planning_note": "Uses the downside range implied by the current uncertainty estimate."
        },
        {
            "scenario": "Base Case",
            "factor": 1.0,
            "in_situ_tonnage": round(base_in_situ),
            "recoverable_tonnage": round(base_recoverable),
            "planning_note": "Current MINQORA preliminary estimate using available data and assumptions."
        },
        {
            "scenario": "Optimistic / Upside",
            "factor": round(upside_factor, 4),
            "in_situ_tonnage": round(base_in_situ * upside_factor),
            "recoverable_tonnage": round(base_recoverable * upside_factor),
            "planning_note": "Uses the upside range implied by the current uncertainty estimate."
        }
    ]

    if uncertainty >= 40 or confidence_score < 50:
        risk_level = "High"
        risk_message = "Resource uncertainty is high; additional geological and spatial validation should be prioritized before detailed planning."
    elif uncertainty >= 25 or confidence_score < 70:
        risk_level = "Moderate"
        risk_message = "The estimate is suitable for preliminary decision support, but scenario spread should be considered in planning."
    else:
        risk_level = "Lower"
        risk_message = "Current uncertainty is comparatively controlled, subject to continued validation and professional review."

    inferred = classification.get("classification_tonnage", {}).get("Inferred", 0)
    classification_note = (
        "Most currently estimated recoverable tonnage is classified as Inferred, which increases planning risk."
        if inferred and base_recoverable and inferred / base_recoverable >= 0.5
        else "Resource classification is distributed across the available preliminary categories."
    )

    answer = f"""
⚠️ RESOURCE RISK & SCENARIO ANALYSIS — PHASE 5E

Mine:
{mine if mine else "All Mines"}

Period:
{start_year} to {end_year}

BASE RESOURCE CASE

Estimated In-Situ Resource:
{format_number(base_in_situ)} tonnes

Estimated Recoverable Resource:
{format_number(base_recoverable)} tonnes

Current Uncertainty Range:
±{uncertainty:.1f}%

RESOURCE SCENARIOS

CONSERVATIVE / DOWNSIDE:
{format_number(scenarios[0]["recoverable_tonnage"])} tonnes recoverable

BASE CASE:
{format_number(scenarios[1]["recoverable_tonnage"])} tonnes recoverable

OPTIMISTIC / UPSIDE:
{format_number(scenarios[2]["recoverable_tonnage"])} tonnes recoverable

RESOURCE RISK LEVEL:
{risk_level}

RISK ASSESSMENT:
{risk_message}

CLASSIFICATION CONSIDERATION:
{classification_note}

PHASE 5E DECISION-SUPPORT NOTICE:
These scenarios are sensitivity ranges derived from the current preliminary estimate and uncertainty model. They are not separate certified resource estimates and must not be presented as JORC, NI 43-101, SAMREC, or other compliant public resource statements without appropriate professional validation and sign-off.
""".strip()

    return {
        "answer": answer,
        "phase": "5E",
        "analysis_type": "Resource Risk & Scenario Analysis",
        "mine": mine,
        "period": f"{start_year} to {end_year}",
        "base_case": {
            "in_situ_tonnage": round(base_in_situ),
            "recoverable_tonnage": round(base_recoverable),
            "uncertainty_percent": round(uncertainty, 2),
            "confidence_score": round(confidence_score, 2)
        },
        "risk_level": risk_level,
        "scenarios": scenarios,
        "classification_note": classification_note,
        "estimation": estimation,
        "confidence": confidence,
        "classification": classification,
        "evidence": build_evidence(filtered, limit=10)
    }


@app.get("/resource-scenarios")
def resource_scenarios(mine: str = None, start_year: int = None, end_year: int = None):
    records = get_data()
    if not records:
        raise HTTPException(status_code=500, detail="No mining data could be loaded. Please check mining_data.csv.")

    parts = ["resource scenario analysis"]
    if mine:
        parts.append(mine)
    if start_year is not None and end_year is not None:
        parts.append(f"from {start_year} to {end_year}")
    elif start_year is not None:
        parts.append(str(start_year))

    return generate_resource_scenario_analysis(" ".join(parts), records)


@app.get("/resource-risk")
def resource_risk(mine: str = None, start_year: int = None, end_year: int = None):
    return resource_scenarios(mine, start_year, end_year)


# ============================================================
# RUN APPLICATION
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )

# ============================================================
# PHASE 5C — RESOURCE CONFIDENCE & UNCERTAINTY ANALYSIS
# ============================================================

def calculate_resource_uncertainty(record):
    """Return a transparent preliminary uncertainty assessment.
    This is an internal analytical estimate and not a compliant public
    mineral-resource statement.
    """
    thickness = record.get("thickness_m")
    production = record.get("production_tonnes")
    year = record.get("year")

    score = 100
    factors = []

    if thickness is None:
        score -= 30
        factors.append("Missing seam thickness data")
    else:
        factors.append("Seam thickness data available")

    if production is None:
        score -= 20
        factors.append("Missing production evidence")
    else:
        factors.append("Production evidence available")

    if year is None:
        score -= 15
        factors.append("Missing time reference")
    else:
        factors.append("Historical year available")

    # Conservative uncertainty ranges based on available data completeness.
    score = max(0, min(100, score))

    if score >= 85:
        level = "Low"
        uncertainty_percent = 10
    elif score >= 65:
        level = "Moderate"
        uncertainty_percent = 20
    elif score >= 45:
        level = "High"
        uncertainty_percent = 35
    else:
        level = "Very High"
        uncertainty_percent = 50

    return {
        "confidence_score": score,
        "uncertainty_level": level,
        "estimated_uncertainty_percent": uncertainty_percent,
        "factors": factors,
    }


def analyze_resource_confidence(records, mine=None):
    filtered = filter_records(records, mine)

    if not filtered:
        return {
            "answer": "No resource records were found for confidence analysis.",
            "evidence": [],
            "summary": {}
        }

    analyses = []

    for record in filtered:
        uncertainty = calculate_resource_uncertainty(record)

        analyses.append({
            "mine": record.get("mine"),
            "seam": record.get("seam"),
            "year": record.get("year"),
            "thickness_m": record.get("thickness_m"),
            "production_tonnes": record.get("production_tonnes"),
            **uncertainty
        })

    average_confidence = sum(
        item["confidence_score"] for item in analyses
    ) / len(analyses)

    average_uncertainty = sum(
        item["estimated_uncertainty_percent"] for item in analyses
    ) / len(analyses)

    if average_confidence >= 85:
        overall = "High Confidence"
    elif average_confidence >= 65:
        overall = "Moderate Confidence"
    elif average_confidence >= 45:
        overall = "Low Confidence"
    else:
        overall = "Very Low Confidence"

    low = sum(1 for x in analyses if x["uncertainty_level"] == "Low")
    moderate = sum(1 for x in analyses if x["uncertainty_level"] == "Moderate")
    high = sum(1 for x in analyses if x["uncertainty_level"] == "High")
    very_high = sum(1 for x in analyses if x["uncertainty_level"] == "Very High")

    answer = f"""
📊 RESOURCE CONFIDENCE & UNCERTAINTY ANALYSIS

Mine:
{mine if mine else "All Mines"}

Records Analyzed:
{len(analyses)}

OVERALL RESOURCE CONFIDENCE:
{overall}

Average Confidence Score:
{average_confidence:.1f} / 100

Estimated Average Uncertainty:
±{average_uncertainty:.1f}%

UNCERTAINTY DISTRIBUTION:

Low Uncertainty:
{low} records

Moderate Uncertainty:
{moderate} records

High Uncertainty:
{high} records

Very High Uncertainty:
{very_high} records

ASSESSMENT BASIS:

MINQORA evaluates data completeness using available geological thickness,
production evidence, and historical time references.

IMPORTANT:
This is a preliminary internal uncertainty assessment. It is not a JORC,
NI 43-101, SAMREC, or other compliant public resource statement.
""".strip()

    return {
        "answer": answer,
        "mine": mine,
        "records_analyzed": len(analyses),
        "overall_confidence": overall,
        "average_confidence_score": round(average_confidence, 1),
        "average_uncertainty_percent": round(average_uncertainty, 1),
        "uncertainty_distribution": {
            "low": low,
            "moderate": moderate,
            "high": high,
            "very_high": very_high,
        },
        "analysis": analyses,
        "evidence": analyses[:10]
    }


@app.get("/resource-confidence")
def resource_confidence(mine: str = None):
    records = get_data()

    if not records:
        raise HTTPException(
            status_code=500,
            detail="No mining data could be loaded."
        )

    return analyze_resource_confidence(records, mine)


@app.get("/resource-uncertainty")
def resource_uncertainty(mine: str = None):
    return resource_confidence(mine)


# ============================================================
# PHASE 5D — RESOURCE REPORTING & RESOURCE INTELLIGENCE
# ============================================================

def _safe_number(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _resource_reporting_filters(question, records):
    mine = find_mine(question, records)
    start_year, end_year = find_year_range(question, records)
    filtered = filter_records(records, mine, start_year, end_year)
    return mine, start_year, end_year, filtered


def generate_resource_report(question, records):
    """Build an integrated internal MINQORA resource report.

    This combines Phase 5A estimation, Phase 5B classification and
    Phase 5C confidence/uncertainty into one transparent report. It is
    not a compliant public mineral-resource statement.
    """
    mine, start_year, end_year, filtered = _resource_reporting_filters(
        question, records
    )

    if not filtered:
        return {
            "answer": "No resource records were found for the requested reporting criteria.",
            "evidence": []
        }

    estimation = generate_resource_estimation(question, records)
    classification = generate_resource_classification(question, records)
    confidence = analyze_resource_confidence(filtered, None)

    total_in_situ = _safe_number(
        estimation.get("total_in_situ_tonnage", estimation.get("total_resource_tonnes", 0))
    )
    total_recoverable = _safe_number(
        estimation.get("total_recoverable_tonnage", estimation.get("recoverable_tonnage", 0))
    )

    classification_summary = classification.get("classification_tonnage", {})
    if not classification_summary:
        classification_summary = classification.get("classification_summary", {})
    if not classification_summary:
        classification_summary = classification.get("summary", {})

    measured = _safe_number(classification_summary.get("measured", 0))
    indicated = _safe_number(classification_summary.get("indicated", 0))
    inferred = _safe_number(classification_summary.get("inferred", 0))
    unclassified = _safe_number(
        classification_summary.get("unclassified", classification_summary.get("exploration_target", 0))
    )

    confidence_score = confidence.get("average_confidence_score", 0)
    uncertainty_percent = confidence.get("average_uncertainty_percent", 0)

    # Do not let Phase 5C imply high certainty for a scenario-only resource estimate.
    estimation_status = estimation.get("estimation_status", "")
    if "Normalized resource potential scenario" in estimation_status:
        confidence_score = min(float(confidence_score or 0), 55.0)
        uncertainty_percent = max(float(uncertainty_percent or 0), 35.0)
    overall_confidence = confidence.get("overall_confidence", "Not Available")

    seams = sorted({r.get("seam") for r in filtered if r.get("seam")})
    mines = sorted({r.get("mine") for r in filtered if r.get("mine")})

    intelligence_flags = []
    if confidence_score >= 85:
        intelligence_flags.append("Dataset completeness supports relatively strong internal confidence.")
    elif confidence_score >= 65:
        intelligence_flags.append("Dataset supports moderate internal confidence; additional validation would improve certainty.")
    else:
        intelligence_flags.append("Dataset has material uncertainty and should receive additional geological validation.")

    if uncertainty_percent >= 35:
        intelligence_flags.append("Uncertainty is elevated; reported tonnage should be treated as preliminary.")
    else:
        intelligence_flags.append("Uncertainty is within the preliminary internal range used by MINQORA.")

    if total_recoverable > 0 and total_in_situ > 0:
        recovery_ratio = (total_recoverable / total_in_situ) * 100
    else:
        recovery_ratio = None

    answer = f"""
📘 MINQORA RESOURCE INTELLIGENCE REPORT

REPORTING SCOPE

Mine:
{mine if mine else ", ".join(mines) if mines else "All Mines"}

Period:
{start_year} to {end_year}

Records Analyzed:
{len(filtered)}

Seams Covered:
{", ".join(seams) if seams else "N/A"}

RESOURCE ESTIMATION — PHASE 5A

Estimated In-Situ Resource:
{format_number(total_in_situ)} tonnes

Estimated Recoverable Resource:
{format_number(total_recoverable)} tonnes

Estimated Recovery Ratio:
{f"{recovery_ratio:.1f}%" if recovery_ratio is not None else "Not available"}

RESOURCE CLASSIFICATION — PHASE 5B

Measured:
{format_number(measured)} tonnes

Indicated:
{format_number(indicated)} tonnes

Inferred:
{format_number(inferred)} tonnes

Unclassified / Exploration Target:
{format_number(unclassified)} tonnes

RESOURCE CONFIDENCE — PHASE 5C

Overall Confidence:
{overall_confidence}

Average Confidence Score:
{confidence_score} / 100

Estimated Average Uncertainty:
±{uncertainty_percent}%

RESOURCE INTELLIGENCE FINDINGS — PHASE 5D

• {intelligence_flags[0]}
• {intelligence_flags[1]}
• The report integrates estimation, classification and uncertainty information into a single MINQORA decision-support view.

IMPORTANT REPORTING NOTICE

This is a preliminary internal analytical report generated from the available MINQORA dataset. It is not a JORC, NI 43-101, SAMREC, or other compliant public mineral-resource statement and must not be used as one without appropriate professional review, validation and sign-off.
""".strip()

    report_sections = {
        "phase_5a_estimation": {
            "estimated_in_situ_tonnage": total_in_situ,
            "estimated_recoverable_tonnage": total_recoverable,
            "recovery_ratio_percent": round(recovery_ratio, 2) if recovery_ratio is not None else None,
        },
        "phase_5b_classification": {
            "tonnage_by_category": classification.get("classification_tonnage", classification_summary),
            "block_counts": classification.get("classification_summary", {}),
        },
        "phase_5c_confidence": {
            "overall_confidence": overall_confidence,
            "average_confidence_score": confidence_score,
            "average_uncertainty_percent": uncertainty_percent,
        },
        "phase_5d_intelligence": intelligence_flags,
    }

    return {
        "answer": answer,
        "report_type": "MINQORA Integrated Resource Intelligence Report",
        "mine": mine,
        "period": f"{start_year} to {end_year}",
        "records_analyzed": len(filtered),
        "report_sections": report_sections,
        "estimation": estimation,
        "classification": classification,
        "confidence": confidence,
        "evidence": build_evidence(filtered, limit=10)
    }


@app.get("/resource-report")
def resource_report(mine: str = None, start_year: int = None, end_year: int = None):
    records = get_data()

    if not records:
        raise HTTPException(
            status_code=500,
            detail="No mining data could be loaded. Please check mining_data.csv."
        )

    question_parts = ["resource intelligence report"]
    if mine:
        question_parts.append(mine)
    if start_year is not None and end_year is not None:
        question_parts.append(f"from {start_year} to {end_year}")
    elif start_year is not None:
        question_parts.append(str(start_year))

    return generate_resource_report(" ".join(question_parts), records)


@app.get("/resource-intelligence")
def resource_intelligence(mine: str = None, start_year: int = None, end_year: int = None):
    return resource_report(mine, start_year, end_year)


# ============================================================
# PHASE 6A — MINE DESIGN FOUNDATION
# ============================================================


def _design_risk_level(score):
    if score >= 80:
        return "Lower preliminary risk"
    if score >= 60:
        return "Moderate preliminary risk"
    return "Higher preliminary risk"


def generate_mine_design_foundation(question, records):
    """Create a transparent preliminary mine-design foundation.

    Phase 6A is intentionally a decision-support foundation. It converts the
    available seam, production, resource and uncertainty information into a
    conceptual design basis. It does not create an engineering-certified mine
    plan, geotechnical design, ventilation design or reserve statement.
    """
    mine = find_mine(question, records)
    start_year, end_year = find_year_range(question, records)
    filtered = filter_records(records, mine, start_year, end_year)

    if not filtered:
        return {
            "answer": "No mining records were found for the requested mine design foundation.",
            "evidence": []
        }

    seams = sorted({r.get("seam") for r in filtered if r.get("seam")})
    thickness_values = [r.get("thickness_m") for r in filtered if r.get("thickness_m") is not None]
    production_values = [r.get("production_tonnes") for r in filtered if r.get("production_tonnes") is not None]

    avg_thickness = sum(thickness_values) / len(thickness_values) if thickness_values else None
    min_thickness = min(thickness_values) if thickness_values else None
    max_thickness = max(thickness_values) if thickness_values else None
    avg_production = sum(production_values) / len(production_values) if production_values else None

    resource = generate_resource_estimation(question, records)
    confidence = analyze_resource_confidence(filtered, None)
    risk = generate_geological_risk_assessment(question, records)

    confidence_score = float(confidence.get("average_confidence_score", 0) or 0)
    uncertainty = float(confidence.get("average_uncertainty_percent", 0) or 0)

    data_completeness = 100
    missing = []
    if not thickness_values:
        data_completeness -= 35; missing.append("seam thickness")
    if not production_values:
        data_completeness -= 20; missing.append("production history")
    if not any(r.get("area_m2") for r in filtered):
        data_completeness -= 20; missing.append("spatial seam geometry / area")
    if not any(r.get("density_t_m3") for r in filtered):
        data_completeness -= 10; missing.append("density")
    if not any(r.get("recovery_factor") for r in filtered):
        data_completeness -= 10; missing.append("recovery assumptions")
    data_completeness = max(0, data_completeness)

    design_score = round((data_completeness * 0.45) + (confidence_score * 0.35) + ((100 - uncertainty) * 0.20), 1)

    if avg_thickness is None:
        mining_method_basis = "Insufficient thickness data to recommend a conceptual mining-method basis"
    elif avg_thickness < 1.2:
        mining_method_basis = "Thin-seam conditions indicated — conceptual design should prioritize low-height and selective extraction options"
    elif avg_thickness < 3.5:
        mining_method_basis = "Moderate seam thickness indicated — conceptual underground layout alternatives can be evaluated"
    else:
        mining_method_basis = "Thicker seam conditions indicated — conceptual extraction layout can evaluate larger working sections, subject to geotechnical validation"

    design_components = {
        "design_scope": "Conceptual mine design foundation",
        "mine": mine if mine else "All Mines in selected dataset",
        "period": f"{start_year} to {end_year}",
        "seams": seams,
        "geological_basis": {
            "average_thickness_m": round(avg_thickness, 2) if avg_thickness is not None else None,
            "minimum_thickness_m": round(min_thickness, 2) if min_thickness is not None else None,
            "maximum_thickness_m": round(max_thickness, 2) if max_thickness is not None else None,
        },
        "production_basis": {
            "average_recorded_production_tonnes": round(avg_production, 2) if avg_production is not None else None
        },
        "resource_basis": {
            "estimated_in_situ_tonnage": resource.get("total_in_situ_tonnage"),
            "estimated_recoverable_tonnage": resource.get("total_recoverable_tonnage"),
            "estimation_status": resource.get("estimation_status")
        },
        "confidence_basis": {
            "confidence_score": confidence_score,
            "uncertainty_percent": uncertainty,
            "overall_confidence": confidence.get("overall_confidence")
        },
        "geological_risk_basis": risk.get("summary", risk.get("risk_level", "Preliminary assessment")),
        "conceptual_mining_method_basis": mining_method_basis,
        "design_readiness_score": design_score,
        "design_readiness": _design_risk_level(design_score),
        "data_completeness_score": data_completeness,
        "critical_data_gaps": missing,
    }

    next_steps = [
        "Validate seam geometry with surveyed coordinates, sections and spatial mine plans.",
        "Add geotechnical, structural geology and hydrogeological constraints before detailed layout design.",
        "Define access, development, panel/block geometry and production scheduling alternatives.",
        "Validate ventilation, transport, infrastructure and safety requirements with qualified engineering inputs.",
        "Convert the conceptual foundation into a detailed mine design only after professional review and site-specific validation."
    ]

    answer = f"""
⛏️ MINQORA PHASE 6A — MINE DESIGN FOUNDATION

DESIGN SCOPE

Mine:
{mine if mine else "All Mines"}

Period:
{start_year} to {end_year}

Records Analyzed:
{len(filtered)}

SEAM DESIGN BASIS

Seams:
{", ".join(seams) if seams else "N/A"}

Average Thickness:
{f"{avg_thickness:.2f} m" if avg_thickness is not None else "Not available"}

Thickness Range:
{f"{min_thickness:.2f} m to {max_thickness:.2f} m" if min_thickness is not None else "Not available"}

CONCEPTUAL MINING METHOD BASIS

{mining_method_basis}

RESOURCE & PRODUCTION BASIS

Average Recorded Production:
{format_number(avg_production) if avg_production is not None else "Not available"} tonnes

Estimated In-Situ Resource:
{format_number(resource.get("total_in_situ_tonnage", 0))} tonnes

Estimated Recoverable Resource:
{format_number(resource.get("total_recoverable_tonnage", 0))} tonnes

DESIGN READINESS

Data Completeness Score:
{data_completeness} / 100

Design Readiness Score:
{design_score} / 100

Assessment:
{_design_risk_level(design_score)}

RESOURCE CONFIDENCE

Confidence Score:
{confidence_score:.1f} / 100

Estimated Uncertainty:
±{uncertainty:.1f}%

CRITICAL DATA GAPS

{chr(10).join('• ' + item for item in missing) if missing else '• No major input category was missing from the available dataset.'}

RECOMMENDED NEXT DESIGN STEPS

{chr(10).join(str(i+1) + '. ' + step for i, step in enumerate(next_steps))}

IMPORTANT ENGINEERING NOTICE

Phase 6A provides a preliminary data-driven mine design foundation for
planning and decision support. It is not an engineering-certified mine plan,
reserve statement, ground-control design, ventilation design, or operational
approval. Site-specific surveys and qualified professional engineering review
are required before implementation.
""".strip()

    return {
        "answer": answer,
        "phase": "Phase 6A — Mine Design Foundation",
        "design_components": design_components,
        "recommended_next_steps": next_steps,
        "evidence": build_evidence(filtered, limit=10)
    }


@app.get("/mine-design-foundation")
def mine_design_foundation(mine: str = None, start_year: int = None, end_year: int = None):
    records = get_data()
    if not records:
        raise HTTPException(status_code=500, detail="No mining data could be loaded. Please check mining_data.csv.")

    parts = ["mine design foundation"]
    if mine:
        parts.append(mine)
    if start_year is not None and end_year is not None:
        parts.append(f"from {start_year} to {end_year}")
    elif start_year is not None:
        parts.append(str(start_year))

    return generate_mine_design_foundation(" ".join(parts), records)


@app.get("/mine-design")
def mine_design(mine: str = None, start_year: int = None, end_year: int = None):
    return mine_design_foundation(mine, start_year, end_year)
