import io
import os
import re
import requests
import pandas as pd

BASE = "https://coal.gov.in/sites/default/files/2024-03/cdchap{n}.xlsx"
OUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT_DIR, exist_ok=True)

def normalize_header(value):
    text = "" if value is None else str(value)
    text = text.replace("\n", " ").replace("\r", " ").strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^A-Za-z0-9%/().& -]+", "", text)
    return text.strip()

def make_unique_headers(values):
    headers = []
    seen = {}
    for i, value in enumerate(values):
        h = normalize_header(value)
        if not h or h.lower().startswith("unnamed"):
            h = f"field_{i+1}"
        base = h
        count = seen.get(base, 0)
        if count:
            h = f"{base}_{count+1}"
        seen[base] = count + 1
        headers.append(h)
    return headers

def detect_header_row(raw):
    keywords = (
        "mine", "colliery", "company", "state", "production",
        "seam", "grade", "coal", "block", "year", "quantity",
        "dispatch", "output", "reserve", "resource"
    )
    best_row = 0
    best_score = -1
    scan_limit = min(20, len(raw))
    for i in range(scan_limit):
        vals = [normalize_header(v).lower() for v in raw.iloc[i].tolist()]
        nonempty = [v for v in vals if v]
        score = sum(any(k in v for k in keywords) for v in nonempty)
        score += min(len(nonempty), 8) * 0.25
        if score > best_score:
            best_score = score
            best_row = i
    return best_row

def clean_sheet(raw, chapter, sheet, url):
    raw = raw.dropna(how="all").reset_index(drop=True)
    if raw.empty:
        return pd.DataFrame()

    header_row = detect_header_row(raw)
    headers = make_unique_headers(raw.iloc[header_row].tolist())

    data = raw.iloc[header_row + 1:].copy()
    data.columns = headers
    data = data.dropna(how="all")

    # Forward-fill only textual category columns. This helps tables with
    # merged cells while preserving the actual values present in the source.
    for col in data.columns:
        if data[col].dtype == object:
            data[col] = data[col].ffill()

    data["source_chapter"] = chapter
    data["source_sheet"] = sheet
    data["source_url"] = url
    data["header_row"] = header_row + 1
    data["source_title"] = f"Coal Directory 2024-25 — Chapter {chapter} — {sheet}"

    return data

frames = []

for n in range(1, 12):
    url = BASE.format(n=n)
    print(f"Downloading official Coal Directory 2024-25 Chapter {n}...")
    response = requests.get(url, timeout=60)
    response.raise_for_status()

    workbook = pd.ExcelFile(io.BytesIO(response.content), engine="openpyxl")

    for sheet in workbook.sheet_names:
        raw = pd.read_excel(
            io.BytesIO(response.content),
            sheet_name=sheet,
            header=None,
            engine="openpyxl"
        )
        cleaned = clean_sheet(raw, n, sheet, url)
        if not cleaned.empty:
            frames.append(cleaned)

if not frames:
    raise RuntimeError("No official Coal Directory rows could be extracted.")

all_rows = pd.concat(frames, ignore_index=True, sort=False)

# Remove rows that are still only headings/totals with no substantive data.
def substantive(row):
    values = [str(v).strip() for v in row.tolist() if pd.notna(v) and str(v).strip()]
    if not values:
        return False
    joined = " ".join(values).lower()
    return not (
        joined in {"summary", "contents", "table", "total", "grand total"}
        and len(values) <= 3
    )

mask = all_rows.apply(substantive, axis=1)
all_rows = all_rows.loc[mask].reset_index(drop=True)

all_rows.insert(0, "record_id", range(1, len(all_rows) + 1))

raw_out = os.path.join(OUT_DIR, "coal_directory_2024_25_raw.csv")
all_rows.to_csv(raw_out, index=False, encoding="utf-8-sig")

sample = all_rows.head(1000).copy()
sample_out = os.path.join(OUT_DIR, "coal_directory_2024_25_1000_real_records.csv")
sample.to_csv(sample_out, index=False, encoding="utf-8-sig")

# A second normalized file used by MINQORA's API. The raw official columns
# are preserved; main.py maps common mining fields without fabricating data.
normalized_out = os.path.join(
    OUT_DIR,
    "coal_directory_2024_25_normalized_1000.csv"
)
sample.to_csv(normalized_out, index=False, encoding="utf-8-sig")

print("=" * 65)
print("OFFICIAL COAL DIRECTORY DATA READY")
print("Total extracted rows:", f"{len(all_rows):,}")
print("Prototype records:", f"{len(sample):,}")
print("Raw file:", raw_out)
print("Real-record file:", sample_out)
print("MINQORA normalized file:", normalized_out)
print("=" * 65)
print("Source: Ministry of Coal, Government of India — Coal Directory 2024-25")
