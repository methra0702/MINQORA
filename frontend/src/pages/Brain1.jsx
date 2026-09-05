import { useState } from "react";

function Brain1() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!question.trim()) {
      setError("Please enter a mining intelligence question.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/brain1/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze the question.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion("");
    setResult(null);
    setError("");
  };

  return (
    <div className="brain-page">
      <section className="brain-question-card">
        <div className="section-label">ASK BRAIN 1</div>

        <h1>Mining Intelligence Questions</h1>

        <p>
          Ask Brain 1 questions about your actual mining data.
        </p>

        <div className="brain-question-form">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your mining data..."
            className="brain-textarea"
          />

          <div className="brain-buttons">
            <button
              type="button"
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>

            <button
              type="button"
              className="clear-button"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="brain-error">
            {error}
          </div>
        )}

        {result && (
          <div className="brain-result">
            <div className="result-header">
              <span>{result.brain || "BRAIN 1"}</span>
              <span>
                Records Used: {result.records_used || 0}
              </span>
            </div>

            <div className="result-answer">
              {result.answer}
            </div>
          </div>
        )}
      </section>

      <section className="roadmap-section">
        <div className="section-label">BRAIN 1 ROADMAP</div>

        <h2>Complete 9-Phase Intelligence System</h2>

        <div className="roadmap-grid">
          <div className="roadmap-card active">
            <div className="phase-number">01</div>
            <div className="phase-status">ACTIVE</div>
            <h3>Data Understanding</h3>
            <p>Mining records and operational data analysis.</p>
          </div>

          <div className="roadmap-card active">
            <div className="phase-number">02</div>
            <div className="phase-status">ACTIVE</div>
            <h3>Mining Intelligence</h3>
            <p>Analyze mining information and answer questions.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">03</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Pattern Detection</h3>
            <p>Identify important operational patterns.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">04</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Risk Analysis</h3>
            <p>Analyze mining and production risks.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">05</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Prediction</h3>
            <p>Predict future mining performance.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">06</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Optimization</h3>
            <p>Recommend better operational decisions.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">07</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Decision Support</h3>
            <p>Support management decisions with intelligence.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">08</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Advanced Intelligence</h3>
            <p>Expand mining intelligence capabilities.</p>
          </div>

          <div className="roadmap-card">
            <div className="phase-number">09</div>
            <div className="phase-status">UPCOMING</div>
            <h3>Autonomous Intelligence</h3>
            <p>Future autonomous mining intelligence system.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Brain1;