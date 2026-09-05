import re


def is_greeting(question: str) -> bool:
    question = question.lower().strip()

    greetings = [
        "hi",
        "hello",
        "hey",
        "good morning",
        "good afternoon",
        "good evening",
    ]

    return question in greetings


def process_brain2(question: str, brain1_data=None, uploaded_files=None):
    """
    MINQORA Brain 2
    AI Intelligence Layer

    Brain 2 can:
    - Answer questions
    - Use Brain 1 historical data
    - Refer to uploaded files
    - Summarize information
    - Support prediction requests
    - Support report generation
    """

    question_lower = question.lower().strip()

    if is_greeting(question):
        return {
            "brain": "Brain 2",
            "intent": "greeting",
            "answer": (
                "Hello. I am MINQORA Brain 2, your Mining Intelligence "
                "and Decision Support Assistant. I can analyze historical "
                "mining data from Brain 1, work with uploaded files, answer "
                "questions, summarize information, support predictions, and "
                "generate detailed reports."
            ),
        }

    # ---------------------------------------------------------
    # CAPABILITIES
    # ---------------------------------------------------------

    capability_words = [
        "what can you do",
        "what do you do",
        "your capabilities",
        "help",
    ]

    if any(word in question_lower for word in capability_words):
        return {
            "brain": "Brain 2",
            "intent": "capabilities",
            "answer": (
                "MINQORA Brain 2 provides AI mining intelligence.\n\n"
                "Capabilities:\n"
                "- Answer mining questions\n"
                "- Use Brain 1 historical mining data\n"
                "- Analyze any available date or year\n"
                "- Analyze mine and seam information\n"
                "- Summarize uploaded documents and data\n"
                "- Support production prediction\n"
                "- Compare mining performance\n"
                "- Generate detailed reports\n"
                "- Create downloadable report output\n"
                "- Use uploaded PDF, CSV, TXT and image sources"
            ),
        }

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------

    if any(word in question_lower for word in ["summarize", "summary"]):
        return {
            "brain": "Brain 2",
            "intent": "summarization",
            "answer": (
                "Brain 2 received your summarization request. "
                "It can use available Brain 1 historical data and uploaded "
                "intelligence sources to prepare a structured summary."
            ),
        }

    # ---------------------------------------------------------
    # PREDICTION
    # ---------------------------------------------------------

    if any(
        word in question_lower
        for word in ["predict", "prediction", "forecast", "forecasting"]
    ):
        return {
            "brain": "Brain 2",
            "intent": "prediction",
            "answer": (
                "Brain 2 received your prediction request. "
                "MINQORA will use relevant historical information from "
                "Brain 1 and available uploaded data to support the "
                "prediction analysis."
            ),
        }

    # ---------------------------------------------------------
    # REPORT
    # ---------------------------------------------------------

    if any(
        word in question_lower
        for word in ["report", "generate report", "create report"]
    ):
        return {
            "brain": "Brain 2",
            "intent": "report_generation",
            "answer": (
                "Brain 2 received your report generation request. "
                "MINQORA can structure the requested mining intelligence "
                "into detailed sections, analysis and tables, using Brain 1 "
                "data and uploaded sources where available."
            ),
        }

    # ---------------------------------------------------------
    # DATE DETECTION
    # ---------------------------------------------------------

    years = re.findall(r"\b(19\d{2}|20\d{2})\b", question)

    if years:
        year_text = ", ".join(years)

        return {
            "brain": "Brain 2",
            "intent": "historical_date_query",
            "answer": (
                f"Brain 2 detected a historical date/year request for: "
                f"{year_text}. "
                "It can refer to the available Brain 1 mining intelligence "
                "and relevant uploaded sources for analysis."
            ),
        }

    # ---------------------------------------------------------
    # DEFAULT INTELLIGENCE RESPONSE
    # ---------------------------------------------------------

    return {
        "brain": "Brain 2",
        "intent": "general_intelligence",
        "answer": (
            "I understand your request. MINQORA Brain 2 can reason using "
            "Brain 1 historical mining intelligence and uploaded information. "
            "You can ask about production, mines, seams, dates, geological "
            "information, predictions, summaries or reports."
        ),
    }