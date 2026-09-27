from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
import urllib.request
import urllib.error


# ============================================================
# MINQORA BRAIN 2 CONFIGURATION
# ============================================================

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"

OLLAMA_MODEL = "qwen3:4b-instruct"


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/brain2",
    tags=["MINQORA Brain 2"]
)


# ============================================================
# REQUEST MODELS
# ============================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class Brain2ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


# ============================================================
# MINQORA BRAIN 2 SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are MINQORA Brain 2.

You are a ChatGPT-style AI assistant specialized in:

- Coal mining
- Geological intelligence
- Mining operations
- Coal seams
- Mine planning
- Production analysis
- Resource evaluation
- Geological analysis
- Mine surveying
- Geomatics
- Mine design
- Mining reports
- Mining decision support

Your purpose is to help mining officers, engineers, geologists,
surveyors, planners and decision makers understand mining information.

IMPORTANT BEHAVIOUR:

1. Understand natural language questions.

2. Answer conversationally and clearly.

3. When the user asks a technical question, explain it in a
   technically correct but understandable way.

4. When the user asks for calculations, show the important steps.

5. Never invent mine-specific data.

6. Never pretend that you accessed MINQORA Brain 1 data unless that
   data has actually been provided to you.

7. If required data is unavailable, clearly state that it is unavailable.

8. Clearly distinguish:
   - known facts
   - calculations
   - assumptions
   - estimates
   - predictions

9. For mining questions, use appropriate mining terminology.

10. If the user asks a general question, answer it normally.

11. If the user asks a complex mining question, break the answer
    into logical sections.

12. Maintain the conversation context supplied in the history.

13. Do not claim to have generated a report, chart, image or file
    unless the corresponding tool has actually generated it.

14. Be useful, accurate and honest.

You are the intelligence layer of MINQORA.

In later stages you will be connected to:
- MINQORA Brain 1
- mining datasets
- geological data
- documents
- RAG
- analytical tools
- prediction tools
- report generation
- image understanding
- image generation
- downloadable outputs

For now, answer using your own knowledge and the conversation context.
"""


# ============================================================
# OLLAMA FUNCTION
# ============================================================

def call_ollama(messages):

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False
    }

    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL,
        data=body,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=180
        ) as response:

            response_body = response.read().decode("utf-8")

        result = json.loads(response_body)

        if "message" not in result:

            raise RuntimeError(
                "Ollama returned an unexpected response."
            )

        answer = result["message"].get(
            "content",
            ""
        ).strip()

        if not answer:

            raise RuntimeError(
                "Ollama returned an empty response."
            )

        return answer

    except urllib.error.URLError as error:

        raise RuntimeError(
            "Could not connect to Ollama. "
            "Make sure Ollama is installed and running."
        ) from error

    except Exception as error:

        raise RuntimeError(
            f"Ollama error: {error}"
        ) from error


# ============================================================
# BRAIN 2 CHAT
# ============================================================

@router.post("/chat")
async def brain2_chat(request: Brain2ChatRequest):

    message = request.message.strip()

    if not message:

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ]

    # --------------------------------------------------------
    # ADD PREVIOUS CONVERSATION
    # --------------------------------------------------------

    if request.history:

        for item in request.history:

            if item.role not in [
                "user",
                "assistant"
            ]:
                continue

            content = item.content.strip()

            if not content:
                continue

            messages.append(
                {
                    "role": item.role,
                    "content": content
                }
            )

    # --------------------------------------------------------
    # ADD CURRENT MESSAGE
    # --------------------------------------------------------

    messages.append(
        {
            "role": "user",
            "content": message
        }
    )

    # --------------------------------------------------------
    # CALL QWEN
    # --------------------------------------------------------

    try:

        answer = call_ollama(messages)

        return {
            "success": True,
            "brain": "MINQORA Brain 2",
            "model": OLLAMA_MODEL,
            "answer": answer
        }

    except Exception as error:

        raise HTTPException(
            status_code=503,
            detail=str(error)
        )


# ============================================================
# BRAIN 2 HEALTH
# ============================================================

@router.get("/health")
async def brain2_health():

    return {
        "status": "healthy",
        "brain": "MINQORA Brain 2",
        "model": OLLAMA_MODEL,
        "ollama": OLLAMA_URL
    }