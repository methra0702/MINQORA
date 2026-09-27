import { useEffect, useRef, useState } from "react";
import "../App.css";

const BRAIN2_API = "http://127.0.0.1:8001";

function Brain2() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      brain: "MINQORA",
      text:
        "Hello! I am MINQORA Brain 2, your coal mining intelligence assistant. Ask me anything about coal mining, geology, production, mine planning or mining intelligence.",
    },
  ]);

  const [attachments, setAttachments] = useState([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, loading, generatingImage]);

  const getErrorMessage = async (response) => {
    try {
      const data = await response.json();

      if (typeof data?.detail === "string") return data.detail;

      if (Array.isArray(data?.detail)) {
        return data.detail
          .map((item) => item?.msg || item?.message || String(item))
          .join(" | ");
      }

      return `Request failed with HTTP ${response.status}.`;
    } catch {
      return `Request failed with HTTP ${response.status}.`;
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response;
      try {
        response = await fetch(`${BRAIN2_API}/upload`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();

      const item = {
        id: `${Date.now()}-${Math.random()}`,
        filename: data.filename,
        storedFilename: data.stored_filename,
        fileType: data.file_type,
        sizeBytes: data.size_bytes,
        downloadUrl: `${BRAIN2_API}${data.download_url}`,
        extractedText: data.extracted_text || "",
      };

      setAttachments((prev) => [...prev, item]);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          brain: "MINQORA BRAIN 2",
          text:
            data.file_type === "document"
              ? `📄 ${data.filename} uploaded. Ask me a question about this document.`
              : `🖼 ${data.filename} uploaded. Use "Analyze Photo" below to inspect it.`,
        },
      ]);
    } catch (error) {
      const message =
        error?.name === "AbortError"
          ? "Upload timed out after 30 seconds. Try a smaller file or check that Brain 2 is running."
          : error?.message || "Upload failed.";

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          brain: "SYSTEM",
          text: `Upload error: ${message}`,
        },
      ]);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const analyzePhoto = async (attachment) => {
    if (!attachment || attachment.fileType !== "image") return;

    setLoading(true);

    try {
      const response = await fetch(
        `${BRAIN2_API}/analyze-image/${encodeURIComponent(
          attachment.storedFilename
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: attachment.storedFilename,
            question:
              question.trim() ||
              "Analyze this image. Describe visible objects, text, geological/mining features, equipment, engineering details, and safety-relevant information. Clearly state uncertainty.",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          brain: "MINQORA PHOTO INTELLIGENCE",
          text: data.answer,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          brain: "SYSTEM",
          text: `Photo intelligence error: ${
            error?.message || "Unable to analyze photo."
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || generatingImage) return;

    setGeneratingImage(true);

    try {
      const response = await fetch(`${BRAIN2_API}/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          width: 512,
          height: 512,
          steps: 4,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      const imageUrl = `${BRAIN2_API}${data.image_url}`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          brain: "MINQORA IMAGE GENERATION",
          text: `Generated image for: "${prompt}"`,
          imageUrl,
          downloadUrl: `${BRAIN2_API}${data.download_url}`,
        },
      ]);

      setImagePrompt("");
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          brain: "SYSTEM",
          text: `Image generation error: ${
            error?.message || "Image generation is unavailable."
          }`,
        },
      ]);
    } finally {
      setGeneratingImage(false);
    }
  };

  const askMINQORA = async () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    const history = messages
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.text === "string"
      )
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: m.text,
      }));

    setMessages((prev) => [
      ...prev,
      { role: "user", brain: "YOU", text: cleanQuestion },
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${BRAIN2_API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          history,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            file_type: a.fileType,
            extracted_text: a.extractedText,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          brain: "MINQORA BRAIN 2",
          text:
            data?.answer ||
            data?.response ||
            "MINQORA Brain 2 returned an empty answer.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          brain: "SYSTEM",
          text: `Brain 2 connection error: ${
            error?.message || "Unable to connect."
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const downloadChat = () => {
    const text = messages
      .map((m) => `${m.brain}\n${m.text}`)
      .join("\n\n");

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "minqora-brain2-chat.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const newChat = () => {
    setMessages([
      {
        role: "assistant",
        brain: "MINQORA",
        text:
          "Hello! I am MINQORA Brain 2, your coal mining intelligence assistant. Ask me anything about coal mining, geology, production, mine planning or mining intelligence.",
      },
    ]);
    setAttachments([]);
    setQuestion("");
    setImagePrompt("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askMINQORA();
    }
  };

  return (
    <div className="page brain2-page">
      <div className="brain2-shell">
        <div className="brain2-header">
          <div className="brain2-title">
            <div className="logo-box">M</div>
            <h1>MINQORA Brain 2</h1>
          </div>

          <button className="secondary-button" onClick={newChat}>
            + New Chat
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`chat-message ${message.role}`}
            >
              <div className="chat-bubble">
                <div className="chat-label">{message.brain}</div>
                <div className="chat-text">{message.text}</div>

                {message.imageUrl && (
                  <div style={{ marginTop: 12 }}>
                    <img
                      src={message.imageUrl}
                      alt="MINQORA generated"
                      style={{
                        maxWidth: "100%",
                        borderRadius: 12,
                        display: "block",
                      }}
                    />

                    <a
                      href={message.downloadUrl}
                      download
                      className="secondary-button"
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        textDecoration: "none",
                      }}
                    >
                      ⬇ Download Image
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message assistant">
              <div className="chat-bubble">
                <div className="chat-label">MINQORA BRAIN 2</div>
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="brain2-tools">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg,.jpeg,.webp"
            onChange={uploadFile}
            style={{ display: "none" }}
          />

          <button
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "📎 Upload Document / Photo"}
          </button>

          {attachments
            .filter((a) => a.fileType === "image")
            .map((attachment) => (
              <button
                key={attachment.id}
                className="secondary-button"
                onClick={() => analyzePhoto(attachment)}
                disabled={loading}
              >
                🔎 Analyze Photo
              </button>
            ))}

          <button className="secondary-button" onClick={downloadChat}>
            ⬇ Download Chat
          </button>
        </div>

        {attachments.length > 0 && (
          <div style={{ padding: "0 20px 12px" }}>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                }}
              >
                <span>
                  {attachment.fileType === "image" ? "🖼️" : "📄"}{" "}
                  {attachment.filename}
                </span>

                <a
                  href={attachment.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                  style={{ textDecoration: "none" }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "0 20px 12px",
          }}
        >
          <input
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Generate an image... e.g. geological coal seam cross-section"
            disabled={generatingImage}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "12px 14px",
              border: "1px solid #d8dee8",
              borderRadius: 10,
              fontSize: 14,
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                generateImage();
              }
            }}
          />

          <button
            className="secondary-button"
            onClick={generateImage}
            disabled={
              generatingImage || !imagePrompt.trim()
            }
          >
            {generatingImage ? "Generating..." : "🖼 Generate Image"}
          </button>
        </div>

        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MINQORA anything about coal mining..."
            rows={2}
            disabled={loading}
          />

          <button
            className="primary-button"
            onClick={askMINQORA}
            disabled={
              loading ||
              !question.trim()
            }
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Brain2;
