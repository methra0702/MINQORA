"""

MINQORA Brain 2



Fast chat + document upload + photo intelligence + image generation.



Services:

- Brain 2: 8001

- Brain 1: 8000

- Unified Data: 8003

- Ollama: 11434

"""



from typing import List, Dict, Any, Optional

from pathlib import Path



import base64

import mimetypes

import re

import uuid

import requests

import os



from fastapi import FastAPI, HTTPException, UploadFile, File

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import FileResponse

from pydantic import BaseModel, Field



try:

    from pypdf import PdfReader

except ImportError:

    PdfReader = None



try:

    from docx import Document

except ImportError:

    Document = None





# ============================================================

# CONFIG

# ============================================================



# ============================================================

# CONFIG

# ============================================================



# Hosted Gemini API for Render deployment

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

GEMINI_MODEL = "gemini-3.5-flash-lite"

TEXT_MODEL = GEMINI_MODEL



# Brain 1 is deployed separately on Render

BRAIN1_API = os.getenv("BRAIN1_API", "https://minqora-brain1.onrender.com").rstrip("/")



# Unified API remains local for now.

# Brain 1 provides the important deployed analytical path.

UNIFIED_API = os.getenv("UNIFIED_API", "http://127.0.0.1:8003").rstrip("/")



# Kept for local/legacy vision functionality.

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")

VISION_MODEL = "qwen3-vl:2b"



IMAGE_MODEL = "x/z-image-turbo"



BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "brain2_uploads"

GENERATED_DIR = BASE_DIR / "brain2_generated"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

GENERATED_DIR.mkdir(parents=True, exist_ok=True)



ALLOWED_DOCUMENTS = {".pdf", ".docx", ".txt", ".csv", ".json", ".md"}

ALLOWED_IMAGES = {".png", ".jpg", ".jpeg", ".webp"}





# ============================================================

# APP

# ============================================================



app = FastAPI(

    title="MINQORA Brain 2",

    description="Conversational mining AI with files, vision and image generation.",

    version="1.7.0-fast-agent-photo",

)



app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",

        "http://127.0.0.1:5173",

        "http://localhost:5174",

        "http://127.0.0.1:5174",

        "https://minqora.vercel.app",

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)





# ============================================================

# MODELS

# ============================================================



class ChatMessage(BaseModel):

    role: str

    content: str





class ChatAttachment(BaseModel):

    filename: str = ""

    file_type: str = ""

    extracted_text: str = ""





class ChatRequest(BaseModel):

    question: str

    history: List[ChatMessage] = Field(default_factory=list)

    attachments: List[ChatAttachment] = Field(default_factory=list)





class ImageGenerateRequest(BaseModel):

    prompt: str

    width: int = 512

    height: int = 512

    steps: int = 4





class ImageAnalyzeRequest(BaseModel):

    filename: str

    question: str = "Describe this image in detail and identify any visible geological, mining, engineering, equipment, text, or safety information."





# ============================================================

# ROUTING

# ============================================================



DATA_QUERY_TERMS = {

    "machhakata", "north of arkhapal", "chhendipada",

    "chhendipada-ii", "mahanadi", "ramchandi",

    "production", "recovery", "ash content", "moisture",

    "calorific", "depth", "deepest", "thickness", "thickest",

    "thinnest", "seam", "seams", "compare", "comparison",

    "average", "highest", "lowest", "maximum", "minimum",

    "how many records", "records", "resource", "reserve",

    "stripping ratio", "overburden", "fleet", "haulage",

    "mine data", "mining data", "survey data", "coordinates",

    "latitude", "longitude", "elevation",

}





def is_data_query(question: str) -> bool:

    q = question.lower().strip()



    # General mining education should stay on the fast text path.

    # Only dataset/entity-specific questions use Brain 1.

    return any(term in q for term in DATA_QUERY_TERMS)





# ============================================================

# BASIC DATA HELPERS

# ============================================================



def get_unified_data() -> Dict[str, Any]:

    try:

        r = requests.get(f"{UNIFIED_API}/unified-data", timeout=8)



        if r.ok:

            return r.json()



    except requests.RequestException:

        pass



    return {}





def ask_brain1(question: str) -> Optional[Dict[str, Any]]:

    try:

        r = requests.post(

            f"{BRAIN1_API}/brain1/ask",

            json={"question": question},

            timeout=20,

        )



        if r.ok:

            return r.json()



    except requests.RequestException:

        pass



    return None





# ============================================================

# PHASE 17 — BRAIN 2 TOOL / AGENT LAYER

# ============================================================



TOOLS = {

    "brain1_mining_analytics": {

        "name": "brain1_mining_analytics",

        "description": "Runs a natural-language mining query through MINQORA Brain 1.",

        "endpoint": f"{BRAIN1_API}/brain1/ask",

    },



    "unified_mining_data": {

        "name": "unified_mining_data",

        "description": "Retrieves unified demonstration + source-backed mining data.",

        "endpoint": f"{UNIFIED_API}/unified-data",

    },

}





def execute_tool(tool_name: str, question: str = "") -> Dict[str, Any]:

    """Execute one approved Brain 2 tool and return structured evidence."""



    if tool_name == "brain1_mining_analytics":

        result = ask_brain1(question)



        return {

            "tool": tool_name,

            "success": result is not None,

            "result": result or {},

        }



    if tool_name == "unified_mining_data":

        result = get_unified_data()



        return {

            "tool": tool_name,

            "success": bool(result),

            "result": result,

        }



    return {

        "tool": tool_name,

        "success": False,

        "result": {},

        "error": "Unknown tool.",

    }





def select_tools(question: str) -> List[str]:

    """Simple deterministic agent policy for Phase 17."""

    # Geological overview questions
    geological_overview_terms = [
        "geological characteristics",
        "geological features",
        "geological properties",
        "geology of",
        "geological overview",
        "coal seams",
        "seam characteristics",
        "stratigraphic",
        "strike and dip",
        "boreholes",
    ]

    if any(term in q_lower for term in geological_overview_terms):
        geological_context = """
MINQORA PROJECT GEOLOGICAL CONTEXT — MACHHAKATA

Mine: Machhakata
Location: Odisha
Area: 19.99 km²
Exploration status: Explored
Exploration grade: G1
Geological exploration category: G11
Mining method: Open Cast
PRC: 30 MTPA
Boreholes: 193
Total drilling: 39,602 m
Borehole density: approximately 9.5 boreholes/km²
Geological strike: approximately E-W
Dip: approximately 3–5°
Published geological resource: 1,369 MT

Use these values as MINQORA project/source-derived context.
Do not invent additional geological values.
Clearly distinguish published/source-derived information from
analytical or planning assumptions.
"""

        messages.append({
            "role": "user",
            "content": (
                "GEOLOGICAL PROJECT CONTEXT:\n"
                f"{geological_context}\n\n"
                f"USER QUESTION:\n{question}"
            ),
        })

        answer = call_text_model(messages)

        return {
            "brain": "MINQORA Brain 2",
            "answer": format_user_facing_answer(answer),
            "response": format_user_facing_answer(answer),
            "intent": "geological_overview",
            "source": "Brain 2 + MINQORA Geological Context + Gemini",
            "evidence": [],
            "model": TEXT_MODEL,
        }

    if not is_data_query(question):

        return []



    tools = ["brain1_mining_analytics"]



    # Use the unified layer when the question asks about CMPDI/source data,

    # mine records, or cross-source context.

    q = question.lower()



    unified_terms = {

        "cmpdi", "source", "real data", "records", "dataset",

        "multi-mine", "coordinates", "latitude", "longitude",

        "elevation",

    }



    if any(term in q for term in unified_terms):

        tools.append("unified_mining_data")



    return tools





@app.get("/tools")

def list_tools():

    return {

        "brain": "MINQORA Brain 2",

        "phase": "Phase 17 — Brain 2 Tool / Agent Access",

        "tools": list(TOOLS.values()),

    }





@app.post("/tools/brain1")

def brain1_tool(request: ChatRequest):

    question = request.question.strip()



    if not question:

        raise HTTPException(

            status_code=400,

            detail="Question cannot be empty.",

        )



    return execute_tool(

        "brain1_mining_analytics",

        question,

    )





def build_data_context(data: Dict[str, Any]) -> str:

    if not data:

        return "Unified data service unavailable."



    records = data.get(

        "records",

        data.get("data", []),

    )



    if not isinstance(records, list):

        records = []



    return str({

        "record_count": len(records),

        "sample_records": records[:12],

    })





# ============================================================

# TEXT MODEL

# ============================================================



SYSTEM_PROMPT = """

You are MINQORA Brain 2, an AI assistant for geological and mining intelligence.



Rules:



- Answer general mining questions naturally and accurately.



- Use supplied MINQORA data when provided.



- Never invent factual mining values.



- Distinguish source-backed values, MINQORA-derived calculations,

  and planning/demo assumptions.



- Treat Brain 1 numerical results as deterministic analytical evidence.



- Format answers for a professional mining dashboard, not as one long paragraph.



- For questions asking for factors, steps, methods, considerations, causes,

  advantages/disadvantages, or multiple items, use a numbered list.



- Put each major item on its own line and add one short explanation below it.



- Start with a short one-line summary when useful, then use numbered items.



- End with a brief overall takeaway when useful.



- Do NOT use Markdown bold markers such as **text**, Markdown headings, tables,

  or raw JSON in the user-facing answer.



- Use plain text labels such as "1. Coal Bed Characteristics".



- Keep normal answers concise and easy to scan.

"""





def format_user_facing_answer(answer: str) -> str:
    """Normalize model markdown into clean plain text for the React chat UI."""
    if not answer:
        return answer

    text = answer.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("**", "").replace("__", "")

    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[ \t]*[-•]\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"^[ \t]*\*\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"\n[ \t]*\n[ \t]*\n+", "\n\n", text)

    return text.strip()


def call_text_model(messages: List[Dict[str, Any]]) -> str:

    """

    Call Google Gemini through the hosted REST API.



    Used for Brain 2 conversational/document responses.

    """



    if not GEMINI_API_KEY:

        raise HTTPException(

            status_code=503,

            detail="GEMINI_API_KEY is not configured on the server.",

        )



    system_instruction = ""

    contents = []



    for message in messages:

        role = message.get("role", "")

        content = str(

            message.get("content", "")

        ).strip()



        if not content:

            continue



        if role == "system":

            system_instruction += content + "\n"

            continue



        # Gemini uses "model" instead of OpenAI/Ollama's "assistant".

        gemini_role = (

            "model"

            if role == "assistant"

            else "user"

        )



        contents.append(

            {

                "role": gemini_role,

                "parts": [

                    {

                        "text": content,

                    }

                ],

            }

        )



    payload = {

        "system_instruction": {

            "parts": [

                {

                    "text": system_instruction.strip(),

                }

            ],

        },



        "contents": contents,



        "generationConfig": {

            "temperature": 0.2,

            "maxOutputTokens": 350,

        },

    }



    url = (

        "https://generativelanguage.googleapis.com/"

        f"v1beta/models/{GEMINI_MODEL}:generateContent"

    )



    try:

        response = requests.post(

            url,

            headers={

                "x-goog-api-key": GEMINI_API_KEY,

                "Content-Type": "application/json",

            },

            json=payload,

            timeout=90,

        )



    except requests.RequestException as exc:

        raise HTTPException(

            status_code=503,

            detail=f"Gemini connection failed: {exc}",

        )



    if not response.ok:

        raise HTTPException(

            status_code=503,

            detail=(

                f"Gemini returned HTTP {response.status_code}: "

                f"{response.text}"

            ),

        )



    try:

        result = response.json()



        answer = (

            result

            .get("candidates", [{}])[0]

            .get("content", {})

            .get("parts", [{}])[0]

            .get("text", "")

            .strip()

        )



    except (

        ValueError,

        IndexError,

        KeyError,

        TypeError,

    ) as exc:

        raise HTTPException(

            status_code=503,

            detail=f"Invalid Gemini response: {exc}",

        )



    answer = format_user_facing_answer(answer)



    if not answer:

        raise HTTPException(

            status_code=503,

            detail="Gemini returned an empty response.",

        )



    return answer



    # ============================================================

# DOCUMENT EXTRACTION

# ============================================================





def extract_document_text(path: Path) -> str:



    suffix = path.suffix.lower()





    if suffix == ".pdf":



        if PdfReader is None:

            return "PDF extraction unavailable. Install pypdf."





        try:



            reader = PdfReader(str(path))



            text = "\n".join(

                page.extract_text() or ""

                for page in reader.pages

            ).strip()



            return text or "No selectable text found in PDF."



        except Exception as exc:



            return f"PDF extraction failed: {exc}"





    if suffix == ".docx":



        if Document is None:

            return "DOCX extraction unavailable. Install python-docx."





        try:



            doc = Document(str(path))



            parts = [

                p.text

                for p in doc.paragraphs

            ]





            for table in doc.tables:



                for row in table.rows:



                    parts.append(

                        " | ".join(

                            c.text

                            for c in row.cells

                        )

                    )





            text = "\n".join(parts).strip()



            return text or "No readable text found in DOCX."



        except Exception as exc:



            return f"DOCX extraction failed: {exc}"





    if suffix in {

        ".txt",

        ".md",

        ".json",

        ".csv",

    }:



        return path.read_text(

            encoding="utf-8",

            errors="replace",

        ).strip()





    return ""





def safe_filename(name: str) -> str:



    original = Path(

        name or "uploaded_file"

    ).name



    stem = (

        Path(original)

        .stem

        .replace(" ", "_")

        or "uploaded_file"

    )



    suffix = Path(original).suffix.lower()



    return (

        f"{stem}_"

        f"{uuid.uuid4().hex[:10]}"

        f"{suffix}"

    )





# ============================================================

# UPLOAD

# ============================================================





@app.post("/upload")

async def upload_file(

    file: UploadFile = File(...)

):



    original = (

        file.filename

        or "uploaded_file"

    )



    suffix = Path(

        original

    ).suffix.lower()





    if (

        suffix not in ALLOWED_DOCUMENTS

        and suffix not in ALLOWED_IMAGES

    ):



        raise HTTPException(

            status_code=400,

            detail=(

                "Supported: PDF, DOCX, TXT, CSV, "

                "JSON, MD, PNG, JPG, JPEG, WEBP."

            ),

        )





    content = await file.read()





    if len(content) > 20 * 1024 * 1024:



        raise HTTPException(

            status_code=413,

            detail="Maximum upload size is 20 MB.",

        )





    saved = safe_filename(

        original

    )



    path = UPLOAD_DIR / saved



    path.write_bytes(

        content

    )





    is_image = (

        suffix in ALLOWED_IMAGES

    )



    extracted = (

        ""

        if is_image

        else extract_document_text(path)

    )





    return {



        "success": True,



        "filename": original,



        "stored_filename": saved,



        "file_type": (

            "image"

            if is_image

            else "document"

        ),



        "size_bytes": len(content),



        "download_url": (

            f"/download/{saved}"

        ),



        "analyze_url": (

            f"/analyze-image/{saved}"

            if is_image

            else None

        ),



        "extracted_text": (

            extracted[:50000]

        ),



    }





@app.get("/download/{filename}")

def download_file(

    filename: str

):



    path = (

        UPLOAD_DIR

        / Path(filename).name

    )





    if not path.exists():



        raise HTTPException(

            status_code=404,

            detail="File not found.",

        )





    return FileResponse(



        str(path),



        filename=path.name,



        media_type=(

            mimetypes.guess_type(

                path.name

            )[0]

            or "application/octet-stream"

        ),



    )





# ============================================================

# PHOTO INTELLIGENCE

# ============================================================





def vision_call(

    image_path: Path,

    question: str,

) -> str:



    image_b64 = base64.b64encode(

        image_path.read_bytes()

    ).decode("utf-8")





    focused_question = f"""

You are MINQORA Photo Intelligence, an AI assistant specialized in

coal mining, geology, surveying and mining safety.



Analyze the attached image carefully. Do not invent details that are

not visible. If text is visible, read it as accurately as possible.



Return a concise structured analysis with these headings:



1. WHAT IS VISIBLE



2. MINING / GEOLOGICAL FEATURES



3. EQUIPMENT / OBJECTS



4. TEXT OR MEASUREMENTS



5. SAFETY / OPERATIONAL OBSERVATIONS



6. UNCERTAINTIES



User's specific question:



{question}



If this is not a mining image, say what the image actually contains

and explain that it is outside the mining-specific scope.

"""





    payload = {



        "model": VISION_MODEL,



        "messages": [



            {



                "role": "user",



                "content": focused_question,



                "images": [

                    image_b64

                ],



            }



        ],



        "stream": False,



        "options": {



            "temperature": 0.1,



            "num_predict": 160,



        },



        "keep_alive": "5m",



    }





    try:



        r = requests.post(



            f"{OLLAMA_URL}/api/chat",



            json=payload,



            timeout=180,



        )





    except requests.RequestException as exc:



        raise HTTPException(



            status_code=503,



            detail=(

                f"Vision model connection failed: {exc}"

            ),



        )





    if not r.ok:



        raise HTTPException(



            status_code=503,



            detail=(



                f"Vision model failed with HTTP "

                f"{r.status_code}. "



                f"Make sure {VISION_MODEL} is installed."



            ),



        )





    answer = (



        r.json()



        .get(

            "message",

            {}

        )



        .get(

            "content",

            ""

        )



        .strip()



    )





    if not answer:



        raise HTTPException(



            status_code=503,



            detail="Vision model returned an empty response.",



        )





    return answer





@app.post("/analyze-image/{filename}")

def analyze_image(



    filename: str,



    request: ImageAnalyzeRequest,



):



    path = (

        UPLOAD_DIR

        / Path(filename).name

    )





    if not path.exists():



        raise HTTPException(



            status_code=404,



            detail="Image not found.",



        )





    if (

        path.suffix.lower()

        not in ALLOWED_IMAGES

    ):



        raise HTTPException(



            status_code=400,



            detail="File is not an image.",



        )





    answer = vision_call(



        path,



        request.question,



    )





    return {



        "success": True,



        "filename": path.name,



        "model": VISION_MODEL,



        "answer": answer,



    }





# ============================================================

# IMAGE GENERATION

# ============================================================



# FAST PROMPT-AWARE MINING VISUALIZATION ENGINE

#

# This version does not call Ollama. It creates different SVG

# compositions based on the user's prompt, instantly and reliably.

# ============================================================





def svg_escape(

    value: str

) -> str:



    return (

        value

        .replace(

            "&",

            "&amp;"

        )

        .replace(

            "<",

            "&lt;"

        )

        .replace(

            ">",

            "&gt;"

        )

        .replace(

            '"',

            "&quot;"

        )

    )





def svg_text(

    x,

    y,

    value,

    size=18,

    weight="600",

    fill="#17324d",

    anchor="start",

):



    return (



        f'<text x="{x}" y="{y}" '

        f'font-family="Arial, sans-serif" '

        f'font-size="{size}" '

        f'font-weight="{weight}" '

        f'fill="{fill}" '

        f'text-anchor="{anchor}">'



        f'{svg_escape(value)}'



        f'</text>'



    )





def aerial_scene(prompt):



    return f"""

<rect width="1024" height="768" fill="#dcecf5"/>



<circle

    cx="885"

    cy="90"

    r="42"

    fill="#f2c14e"

/>



{svg_text(

    42,

    52,

    "Aerial Open-Cast Coal Mine",

    30,

    "700"

)}



<!-- mine terrain -->



<path

    d="M0 150 Q180 90 350 165 T700 140 T1024 180 V768 H0Z"

    fill="#9a8060"

/>



<path

    d="M50 230 Q220 160 390 245 T720 220 T980 250"

    fill="none"

    stroke="#765b42"

    stroke-width="95"

/>



<path

    d="M100 300 Q260 225 420 315 T750 300 T950 330"

    fill="none"

    stroke="#b59a75"

    stroke-width="78"

/>



<path

    d="M150 375 Q310 300 460 390 T760 380 T900 405"

    fill="none"

    stroke="#765b42"

    stroke-width="60"

/>



<!-- coal extraction area -->



<path

    d="M230 440 L390 355 L690 390 L790 510

       L640 610 L310 575Z"

    fill="#282828"

/>



<path

    d="M285 455 L420 395 L655 420 L735 500

       L610 565 L345 545Z"

    fill="#151515"

/>



<!-- haul roads -->



<path

    d="M35 670 C210 600 250 520 390 500

       S690 535 950 420"

    fill="none"

    stroke="#e4ddd2"

    stroke-width="34"

/>



<path

    d="M35 670 C210 600 250 520 390 500

       S690 535 950 420"

    fill="none"

    stroke="#7d7162"

    stroke-width="3"

    stroke-dasharray="15 12"

/>



<!-- trucks -->



<g transform="translate(400 475)">



<rect

    width="78"

    height="28"

    rx="5"

    fill="#d49427"

/>



<rect

    x="8"

    y="-16"

    width="35"

    height="20"

    fill="#83b5d0"

/>



<circle

    cx="18"

    cy="32"

    r="10"

    fill="#263746"

/>



<circle

    cx="62"

    cy="32"

    r="10"

    fill="#263746"

/>



</g>



<g transform="translate(690 475)">



<rect

    width="78"

    height="28"

    rx="5"

    fill="#d49427"

/>



<rect

    x="8"

    y="-16"

    width="35"

    height="20"

    fill="#83b5d0"

/>



<circle

    cx="18"

    cy="32"

    r="10"

    fill="#263746"

/>



<circle

    cx="62"

    cy="32"

    r="10"

    fill="#263746"

/>



</g>



<!-- labels -->



<rect

    x="58"

    y="108"

    width="180"

    height="42"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    73,

    136,

    "DRONE VIEW",

    18,

    "700"

)}



<rect

    x="720"

    y="245"

    width="220"

    height="42"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    735,

    273,

    "ACTIVE PIT",

    18,

    "700"

)}



<rect

    x="720"

    y="300"

    width="220"

    height="42"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    735,

    328,

    "COAL EXTRACTION",

    18,

    "700"

)}



{svg_text(

    42,

    735,

    prompt[:115],

    14,

    "400",

    "white"

)}

"""





def excavator_scene(prompt):



    return f"""

<rect

    width="1024"

    height="768"

    fill="#d9e8f0"

/>



<rect

    y="430"

    width="1024"

    height="338"

    fill="#907154"

/>



<path

    d="M0 430 L180 350 L370 430

       L550 320 L760 420 L1024 340

       V500 H0Z"

    fill="#a78b68"

/>



{svg_text(

    42,

    52,

    "Heavy Excavator at Coal Seam",

    30,

    "700"

)}



<!-- coal face -->



<path

    d="M40 500 L250 420 L470 470

       L650 390 L930 455 L1024 430

       V650 H40Z"

    fill="#252525"

/>



<path

    d="M50 610 Q250 565 430 620

       T800 605 T1024 620"

    fill="none"

    stroke="#d0a94f"

    stroke-width="65"

/>



<!-- excavator tracks -->



<g transform="translate(330 365)">



<rect

    x="0"

    y="160"

    width="260"

    height="55"

    rx="25"

    fill="#273746"

/>



<circle

    cx="45"

    cy="188"

    r="18"

    fill="#687987"

/>



<circle

    cx="215"

    cy="188"

    r="18"

    fill="#687987"

/>



<rect

    x="70"

    y="105"

    width="100"

    height="65"

    rx="8"

    fill="#e1a52d"

/>



<rect

    x="105"

    y="55"

    width="65"

    height="55"

    rx="6"

    fill="#8dbbd3"

/>



<path

    d="M155 65 L255 0 L355 38 L250 92 Z"

    fill="#e1a52d"

/>



<path

    d="M350 38 L430 115 L412 135 L330 72 Z"

    fill="#e1a52d"

/>



<path

    d="M412 135 L470 158 L442 185 L390 160 Z"

    fill="#d48f20"

/>



</g>



<rect

    x="55"

    y="110"

    width="230"

    height="42"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    70,

    138,

    "HYDRAULIC EXCAVATOR",

    17,

    "700"

)}



<rect

    x="700"

    y="520"

    width="210"

    height="42"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    715,

    548,

    "COAL SEAM",

    18,

    "700"

)}



{svg_text(

    42,

    735,

    prompt[:115],

    14,

    "400",

    "white"

)}

"""





def cross_section_scene(prompt):



    return f"""

<rect

    width="1024"

    height="768"

    fill="#eef5f8"

/>



{svg_text(

    42,

    52,

    "Geological Coal Seam Cross-Section",

    30,

    "700"

)}



<!-- geological strata -->



<rect

    x="0"

    y="120"

    width="1024"

    height="115"

    fill="#c6b092"

/>



<rect

    x="0"

    y="235"

    width="1024"

    height="90"

    fill="#8c735b"

/>



<rect

    x="0"

    y="325"

    width="1024"

    height="78"

    fill="#b69a76"

/>



<rect

    x="0"

    y="403"

    width="1024"

    height="82"

    fill="#242424"

/>



<rect

    x="0"

    y="485"

    width="1024"

    height="105"

    fill="#c9a45d"

/>



<rect

    x="0"

    y="590"

    width="1024"

    height="178"

    fill="#82664b"

/>



<!-- fault -->



<path

    d="M650 120 L570 768"

    stroke="#9b3e36"

    stroke-width="7"

    stroke-dasharray="14 9"

/>



<!-- boreholes -->



<g

    stroke="#315b7d"

    stroke-width="4"

    stroke-dasharray="10 8"

>



<line

    x1="190"

    y1="100"

    x2="190"

    y2="700"

/>



<line

    x1="470"

    y1="100"

    x2="470"

    y2="700"

/>



<line

    x1="830"

    y1="100"

    x2="830"

    y2="700"

/>



</g>



<!-- labels -->



<rect

    x="710"

    y="175"

    width="230"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    728,

    204,

    "OVERBURDEN",

    18,

    "700"

)}



<rect

    x="710"

    y="420"

    width="230"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    728,

    449,

    "COAL SEAM",

    18,

    "700"

)}



<rect

    x="710"

    y="515"

    width="230"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    728,

    544,

    "HOST ROCK",

    18,

    "700"

)}



<rect

    x="75"

    y="150"

    width="190"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    92,

    179,

    "BOREHOLE",

    18,

    "700"

)}



<rect

    x="675"

    y="640"

    width="200"

    height="44"

    rx="9"

    fill="white"

    stroke="#9b3e36"

    stroke-width="2"

/>



{svg_text(

    692,

    669,

    "FAULT ZONE",

    18,

    "700"

)}



{svg_text(

    42,

    735,

    prompt[:115],

    14,

    "400",

    "white"

)}

"""



def truck_scene(prompt):



    return f"""

<rect

    width="1024"

    height="768"

    fill="#dceaf0"

/>



<rect

    y="455"

    width="1024"

    height="313"

    fill="#8d7052"

/>



{svg_text(

    42,

    52,

    "Coal Haulage Operation",

    30,

    "700"

)}



<!-- road -->



<path

    d="M0 680 C220 570 390 540

       590 590 S820 650 1024 500"

    fill="none"

    stroke="#d8d0c5"

    stroke-width="100"

/>



<path

    d="M0 680 C220 570 390 540

       590 590 S820 650 1024 500"

    fill="none"

    stroke="#766b5d"

    stroke-width="4"

    stroke-dasharray="20 15"

/>



<!-- trucks -->



<g transform="translate(230 510)">



<path

    d="M0 55 L125 20 L185 55

       L185 100 L0 100Z"

    fill="#c98725"

/>



<rect

    x="15"

    y="25"

    width="60"

    height="45"

    fill="#86b8d3"

/>



<circle

    cx="38"

    cy="110"

    r="22"

    fill="#263746"

/>



<circle

    cx="150"

    cy="110"

    r="22"

    fill="#263746"

/>



</g>



<g transform="translate(650 450) scale(.8)">



<path

    d="M0 55 L125 20 L185 55

       L185 100 L0 100Z"

    fill="#c98725"

/>



<rect

    x="15"

    y="25"

    width="60"

    height="45"

    fill="#86b8d3"

/>



<circle

    cx="38"

    cy="110"

    r="22"

    fill="#263746"

/>



<circle

    cx="150"

    cy="110"

    r="22"

    fill="#263746"

/>



</g>



<rect

    x="70"

    y="130"

    width="230"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    87,

    159,

    "HAUL TRUCK FLEET",

    18,

    "700"

)}



<rect

    x="700"

    y="260"

    width="210"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    718,

    289,

    "HAUL ROAD",

    18,

    "700"

)}



{svg_text(

    42,

    735,

    prompt[:115],

    14,

    "400",

    "white"

)}

"""





def operation_scene(prompt):



    return f"""

<rect

    width="1024"

    height="768"

    fill="#dcebf2"

/>



<rect

    y="470"

    width="1024"

    height="298"

    fill="#8b6d4f"

/>



{svg_text(

    42,

    52,

    "Integrated Open-Cast Mining Operation",

    30,

    "700"

)}



<!-- pit -->



<path

    d="M80 150 L880 150 L760 600

       L240 600 Z"

    fill="#9b8060"

/>



<path

    d="M145 210 L815 210 L710 530

       L290 530 Z"

    fill="#6f5944"

/>



<path

    d="M220 280 L745 280 L670 475

       L330 475 Z"

    fill="#2a2a2a"

/>



<!-- conveyor -->



<rect

    x="80"

    y="620"

    width="860"

    height="18"

    fill="#354a5a"

/>



<circle

    cx="110"

    cy="629"

    r="22"

    fill="#687987"

/>



<circle

    cx="915"

    cy="629"

    r="22"

    fill="#687987"

/>



<!-- equipment -->



<g transform="translate(400 370)">



<rect

    width="120"

    height="32"

    rx="8"

    fill="#dfa22c"

/>



<circle

    cx="25"

    cy="42"

    r="14"

    fill="#263746"

/>



<circle

    cx="95"

    cy="42"

    r="14"

    fill="#263746"

/>



<path

    d="M60 0 L125 -55

       L180 -30 L120 10Z"

    fill="#dfa22c"

/>



</g>



<g transform="translate(690 570)">



<rect

    width="130"

    height="38"

    fill="#c98725"

/>



<rect

    x="12"

    y="-25"

    width="55"

    height="28"

    fill="#86b8d3"

/>



<circle

    cx="25"

    cy="48"

    r="15"

    fill="#263746"

/>



<circle

    cx="105"

    cy="48"

    r="15"

    fill="#263746"

/>



</g>



<rect

    x="70"

    y="120"

    width="250"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    87,

    149,

    "MINING OPERATIONS",

    18,

    "700"

)}



<rect

    x="700"

    y="185"

    width="200"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    717,

    214,

    "ACTIVE PIT",

    18,

    "700"

)}



<rect

    x="700"

    y="245"

    width="200"

    height="44"

    rx="9"

    fill="white"

    stroke="#315b7d"

    stroke-width="2"

/>



{svg_text(

    717,

    274,

    "COAL SEAM",

    18,

    "700"

)}



{svg_text(

    42,

    735,

    prompt[:115],

    14,

    "400",

    "white"

)}

"""





def build_mining_svg(prompt: str) -> str:



    p = prompt.lower()



    # Priority-based prompt routing.



    if any(

        k in p

        for k in [

            "geological",

            "cross-section",

            "cross section",

            "strata",

            "fault",

            "borehole",

        ]

    ):

        body = cross_section_scene(prompt)



    elif any(

        k in p

        for k in [

            "excavator",

            "excavation",

            "hydraulic",

        ]

    ):

        body = excavator_scene(prompt)



    elif any(

        k in p

        for k in [

            "drone",

            "aerial",

            "satellite",

            "top view",

            "bird's-eye",

            "birds-eye",

        ]

    ):

        body = aerial_scene(prompt)



    elif any(

        k in p

        for k in [

            "truck",

            "haulage",

            "haul road",

            "fleet",

            "dump truck",

        ]

    ):

        body = truck_scene(prompt)



    else:

        body = operation_scene(prompt)



    return f"""

<svg

    xmlns="http://www.w3.org/2000/svg"

    width="1024"

    height="768"

    viewBox="0 0 1024 768"

>

{body}

</svg>

"""





@app.post("/generate-image")

def generate_image(

    request: ImageGenerateRequest,

):



    prompt = request.prompt.strip()



    if not prompt:

        raise HTTPException(

            status_code=400,

            detail="Image prompt is empty.",

        )



    try:



        svg = build_mining_svg(

            prompt

        )



        filename = (

            f"minqora_generated_"

            f"{uuid.uuid4().hex[:10]}.svg"

        )



        path = GENERATED_DIR / filename



        path.write_text(

            svg,

            encoding="utf-8",

        )



    except Exception as exc:



        raise HTTPException(

            status_code=500,

            detail=(

                f"Visualization generation failed: {exc}"

            ),

        )



    return {

        "success": True,

        "filename": filename,

        "model": (

            "MINQORA Prompt-Aware Mining "

            "Visualization Engine"

        ),

        "prompt": prompt,

        "download_url": (

            f"/generated/{filename}"

        ),

        "image_url": (

            f"/generated/{filename}"

        ),

    }





@app.get("/generated/{filename}")

def generated_file(

    filename: str,

):



    path = (

        GENERATED_DIR

        / Path(filename).name

    )



    if not path.exists():



        raise HTTPException(

            status_code=404,

            detail="Generated image not found.",

        )



    return FileResponse(

        str(path),

        filename=path.name,

        media_type="image/svg+xml",

    )





# ============================================================

# HEALTH

# ============================================================





@app.get("/")

def root():



    return {

        "name": "MINQORA Brain 2",

        "status": "online",

        "port": 8001,

        "text_model": TEXT_MODEL,

        "vision_model": VISION_MODEL,

        "image_model": IMAGE_MODEL,

        "gemini_configured": bool(

            GEMINI_API_KEY

        ),

        "version": "2.0.0-gemini-debugged",

    }





@app.get("/health")

def health():



    def ollama_ok():



        try:



            return requests.get(

                f"{OLLAMA_URL}/api/tags",

                timeout=5,

            ).ok



        except requests.RequestException:



            return False





    def service_ok(url):



        try:



            return requests.get(

                url,

                timeout=5,

            ).ok



        except requests.RequestException:



            return False





    gemini_configured = bool(

        GEMINI_API_KEY

    )





    return {



        "status": (

            "healthy"

            if gemini_configured

            else "degraded"

        ),



        "brain2": True,



        "gemini": gemini_configured,



        "ollama": ollama_ok(),



        "brain1": service_ok(

            f"{BRAIN1_API}/health"

        ),



        "unified_data": service_ok(

            f"{UNIFIED_API}/health"

        ),



        "uploads": True,



        "photo_intelligence": ollama_ok(),



        "image_generation_endpoint": True,



        "fast_data_queries": True,



        "structured_photo_intelligence": True,



        "text_model": TEXT_MODEL,



        "vision_model": VISION_MODEL,



        "image_model": IMAGE_MODEL,



    }





# ============================================================

# PHASE 18 — ADVANCED ANALYTICS + PREDICTION

# + DECISION SUPPORT

# ============================================================





def numeric_records(

    data: Any,

) -> List[Dict[str, Any]]:



    if isinstance(

        data,

        dict,

    ):



        records = (

            data.get("records")

            or data.get("data")

            or []

        )



    elif isinstance(

        data,

        list,

    ):



        records = data



    else:



        records = []





    return [

        r

        for r in records

        if isinstance(

            r,

            dict,

        )

    ]





def as_float(

    value,

):



    try:



        return float(value)



    except (

        TypeError,

        ValueError,

    ):



        return None





def record_metric(

    r: Dict[str, Any],

    names: List[str],

):



    for name in names:



        if name in r:



            value = as_float(

                r.get(name)

            )



            if value is not None:



                return value



    return None





def phase18_dataset_summary(

    data: Any,

) -> Dict[str, Any]:



    records = numeric_records(

        data

    )





    def stats(names):



        vals = [



            record_metric(

                r,

                names,

            )



            for r in records



        ]



        vals = [

            v

            for v in vals

            if v is not None

        ]





        if not vals:



            return None





        return {



            "count": len(vals),



            "min": round(

                min(vals),

                3,

            ),



            "max": round(

                max(vals),

                3,

            ),



            "average": round(

                sum(vals) / len(vals),

                3,

            ),



        }





    production = stats(

        [

            "production_tonnes",

            "production",

        ]

    )





    recovery = stats(

        [

            "recovery_percent",

            "recovery",

        ]

    )





    thickness = stats(

        [

            "coal_thickness_m",

            "thickness_m",

            "thickness",

        ]

    )





    depth = stats(

        [

            "depth_m",

            "depth",

        ]

    )





    ash = stats(

        [

            "ash_percent",

            "ash_content",

            "ash",

        ]

    )





    moisture = stats(

        [

            "moisture_percent",

            "moisture",

        ]

    )





    return {



        "records_analyzed": len(

            records

        ),



        "production": production,



        "recovery": recovery,



        "thickness": thickness,



        "depth": depth,



        "ash": ash,



        "moisture": moisture,



    }



def phase18_prediction(question: str, data: Any) -> Dict[str, Any]:

    records = numeric_records(data)



    production = [

        record_metric(r, ["production_tonnes", "production"])

        for r in records

    ]

    production = [v for v in production if v is not None]



    recovery = [

        record_metric(r, ["recovery_percent", "recovery"])

        for r in records

    ]

    recovery = [v for v in recovery if v is not None]



    result = {

        "method": "Historical descriptive baseline",

        "status": "illustrative",

        "prediction": {},

        "note": (

            "This is a MINQORA-derived analytical estimate, not an "

            "official CMPDI forecast."

        ),

    }



    if production:

        avg = sum(production) / len(production)

        result["prediction"]["baseline_production_tonnes"] = round(avg, 2)

        result["prediction"]["production_plus_5pct"] = round(avg * 1.05, 2)



    if recovery:

        avg = sum(recovery) / len(recovery)

        result["prediction"]["baseline_recovery_percent"] = round(avg, 2)

        result["prediction"]["recovery_plus_2pct"] = round(

            min(avg + 2, 100), 2

        )



    return result





def phase18_decision_support(question: str, data: Any) -> Dict[str, Any]:

    summary = phase18_dataset_summary(data)

    recommendations = []



    recovery = summary.get("recovery")

    ash = summary.get("ash")

    depth = summary.get("depth")



    if recovery and recovery["average"] < 85:

        recommendations.append(

            "Review recovery drivers and operational losses before increasing production."

        )

    elif recovery:

        recommendations.append(

            "Recovery is suitable for monitoring as an operational KPI."

        )



    if ash and ash["average"] > 25:

        recommendations.append(

            "Review ash-control and beneficiation requirements."

        )



    if depth and depth["max"] > 150:

        recommendations.append(

            "Deep intervals should receive additional geotechnical and mine-planning review."

        )



    if not recommendations:

        recommendations.append(

            "Use the available historical indicators for comparative planning; "

            "validate operational decisions against mine-specific engineering studies."

        )



    return {

        "status": "decision_support",

        "recommendations": recommendations,

        "basis": summary,

        "disclaimer": (

            "Recommendations are MINQORA-derived decision support and do not "

            "replace an approved mining plan, geological report, or engineering study."

        ),

    }





@app.get("/analytics/summary")

def phase18_summary():

    data = get_unified_data()

    return phase18_dataset_summary(data)





@app.post("/analytics/predict")

def phase18_predict(request: ChatRequest):

    data = get_unified_data()

    return phase18_prediction(request.question, data)





@app.post("/analytics/decision-support")

def phase18_decision(request: ChatRequest):

    data = get_unified_data()

    return phase18_decision_support(request.question, data)





# ============================================================

# CHAT

# ============================================================



@app.post("/chat")
def chat(request: ChatRequest):
    """Main Brain 2 chat endpoint with Gemini, document context and Brain 1 tools."""
    question = (request.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    q_lower = question.lower()

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    # Preserve recent conversation history.
    for item in request.history[-8:]:
        role = item.role if item.role in {"user", "assistant"} else ""
        content = (item.content or "").strip()
        if role and content:
            messages.append({"role": role, "content": content})

    # The current question is always included once.
    messages.append({"role": "user", "content": question})

    # Uploaded document context is supplied directly by the frontend.
    document_parts: List[str] = []
    for attachment in request.attachments:
        if attachment.file_type == "document" and attachment.extracted_text:
            document_parts.append(
                f"DOCUMENT: {attachment.filename or 'uploaded document'}\n"
                f"{attachment.extracted_text[:20000]}"
            )

    document_context = "\n\n".join(document_parts).strip()

    # Document Q&A uses Gemini directly unless the question is a structured
    # MINQORA data query, in which case Brain 1 remains the deterministic path.
    if document_context and not is_data_query(question):
        messages[-1] = {
            "role": "user",
            "content": (
                f"UPLOADED DOCUMENT CONTEXT:\n{document_context}\n\n"
                f"USER QUESTION:\n{question}"
            ),
        }
        answer = call_text_model(messages)
        return {
            "brain": "MINQORA Brain 2",
            "answer": answer,
            "response": answer,
            "intent": "document_question",
            "source": "Brain 2 + Uploaded Document + Gemini",
            "evidence": [],
            "model": TEXT_MODEL,
        }

    # Prediction is deterministic and explicitly labeled as illustrative.
    if any(term in q_lower for term in [
        "predict", "forecast", "projection", "next year",
        "expected production", "expected recovery"
    ]):
        data = get_unified_data()
        result = phase18_prediction(question, data)
        answer = (
            "MINQORA-derived prediction baseline:\n"
            f"{result['prediction']}\n\n"
            f"Note: {result['note']}"
        )
        return {
            "brain": "MINQORA Brain 2",
            "answer": answer,
            "response": answer,
            "intent": "advanced_prediction",
            "source": "Brain 2 + Phase 18 Analytics",
            "analytics": result,
            "model": "Phase 18 deterministic analytics",
        }

    # Decision support is deterministic and carries its disclaimer.
    if (
        any(term in q_lower for term in [
            "recommend", "recommendation", "decision", "should we",
            "what should", "best option", "risk", "optimize",
        ])
        and is_data_query(question)
    ):
        data = get_unified_data()
        result = phase18_decision_support(question, data)
        answer = (
            "MINQORA decision-support recommendations:\n\n"
            + "\n".join(
                f"{i + 1}. {item}"
                for i, item in enumerate(result.get("recommendations", []))
            )
            + f"\n\nBasis: {result.get('basis', {})}"
            + f"\n\nDisclaimer: {result.get('disclaimer', '')}"
        )
        answer = format_user_facing_answer(answer)
        return {
            "brain": "MINQORA Brain 2",
            "answer": answer,
            "response": answer,
            "intent": "decision_support",
            "source": "Brain 2 + Phase 18 Analytics",
            "analytics": result,
            "model": "Phase 18 deterministic analytics",
        }

    # General conversation should not call Brain 1.
    selected_tools = select_tools(question)
    if not selected_tools:
        answer = call_text_model(messages)
        return {
            "brain": "MINQORA Brain 2",
            "answer": answer,
            "response": answer,
            "intent": "general_conversation",
            "source": "Brain 2 + Gemini",
            "tools_used": [],
            "evidence": [],
            "model": TEXT_MODEL,
        }

    # Structured mining questions use Brain 1 and optional unified data.
    tool_results: Dict[str, Dict[str, Any]] = {}
    for tool_name in selected_tools:
        tool_results[tool_name] = execute_tool(tool_name, question)

    brain1_result = (
        tool_results.get("brain1_mining_analytics", {}).get("result") or {}
    )
    unified_result = (
        tool_results.get("unified_mining_data", {}).get("result") or {}
    )

    evidence = brain1_result.get("evidence") or []
    if not isinstance(evidence, list):
        evidence = [evidence]

    unified_records = []
    if isinstance(unified_result, dict):
        unified_records = unified_result.get("records")
        if not isinstance(unified_records, list):
            unified_records = unified_result.get("data", [])
        if not isinstance(unified_records, list):
            unified_records = []

    analytical_context = {
        "question": question,
        "tools_selected": selected_tools,
        "brain1_answer": brain1_result.get("answer"),
        "intent": brain1_result.get("intent"),
        "confidence": brain1_result.get("confidence"),
        "source": brain1_result.get("source"),
        "evidence": evidence[:10],
        "unified_record_count": len(unified_records),
    }

    # Brain 1 answers are already deterministic; return them directly.
    if brain1_result.get("answer"):
        answer = format_user_facing_answer(str(brain1_result["answer"]))
        return {
            "brain": "MINQORA Brain 2",
            "answer": answer,
            "response": answer,
            "intent": brain1_result.get("intent") or "data_question",
            "source": "Brain 2 Agent + Brain 1 + Unified Data",
            "tools_used": selected_tools,
            "tool_status": {
                name: bool(result.get("success"))
                for name, result in tool_results.items()
            },
            "evidence": evidence[:10],
            "model": "Brain 1 deterministic analytics",
        }

    # If Brain 1 is unavailable, Gemini can still explain the available context
    # without inventing missing values.
    context_message = (
        "PHASE 17 TOOL RESULTS — USE THESE AS THE PRIMARY EVIDENCE:\n"
        f"{analytical_context}\n\n"
        "MINQORA UNIFIED DATA CONTEXT:\n"
        f"{build_data_context(unified_result)}\n\n"
        f"USER QUESTION:\n{question}"
    )
    messages[-1] = {"role": "user", "content": context_message}

    answer = call_text_model(messages)

    return {
        "brain": "MINQORA Brain 2",
        "answer": answer,
        "response": answer,
        "intent": "data_question",
        "source": "Brain 2 + Unified Data + Gemini",
        "tools_used": selected_tools,
        "tool_status": {
            name: bool(result.get("success"))
            for name, result in tool_results.items()
        },
        "evidence": evidence[:10],
        "model": TEXT_MODEL,
    }


@app.post("/ask")

def ask(request: ChatRequest):

    return chat(request)





# ============================================================

# RUN

# ============================================================



if __name__ == "__main__":

    import uvicorn



    uvicorn.run(

        app,

        host="127.0.0.1",

        port=8001,

        reload=False,

    )
