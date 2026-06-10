import React, { useState, useEffect } from "react";

/**
 * Helper to determine CSS color code based on score
 */
const getScoreColor = (score) => {
  if (score >= 75) return "var(--color-green)";
  if (score >= 40) return "var(--color-yellow)";
  return "var(--color-red)";
};

/**
 * ResultsDisplay component showcasing target scores, insights, DM templates, and the Save Prospect utility.
 */
export default function ResultsDisplay({
  data,
  onReset,
  onSaveProspect,
  isSaved,
}) {
  const [copied, setCopied] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailSuccess, setMailSuccess] = useState(false);
  const [mailError, setMailError] = useState("");
  const [bhWidth, setBhWidth] = useState(0);
  const [orWidth, setOrWidth] = useState(0);

  // Trigger progress bar animations after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setBhWidth(data.brand_health.score);
      setOrWidth(data.outreach_readiness.score);
    }, 150);
    return () => clearTimeout(timer);
  }, [data]);

  // Copy DM to user clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.dm_suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Submit email capture to backend (stateless Nodemailer)
  const handleSendEmailReport = async (e) => {
    e.preventDefault();
    setIsSendingMail(true);
    setMailError("");
    setMailSuccess(false);

    try {
      const response = await fetch("/api/save-prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          prospect: data,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setMailSuccess(true);
        setEmail("");
      } else {
        setMailError(resData.error || "Failed to email report.");
      }
    } catch (err) {
      console.error("Email sending failed:", err);
      setMailError("Network error. Is the server online?");
    } finally {
      setIsSendingMail(false);
    }
  };

  const handleSaveToDashboard = () => {
    onSaveProspect(data);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "URL",
      "Brand Health Score",
      "Brand Health Insight",
      "Readiness Score",
      "Readiness Insight",
      "DM Pitch",
      "Generated At",
    ];
    const row = [
      data.url,
      data.brand_health.score,
      `"${data.brand_health.insight.replace(/"/g, '""')}"`,
      data.outreach_readiness.score,
      `"${data.outreach_readiness.insight.replace(/"/g, '""')}"`,
      `"${data.dm_suggestion.replace(/"/g, '""')}"`,
      new Date().toISOString(),
    ];

    const csvContent = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Signal_Hunt_Result_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="results-section">
      {/* Brand Health Score Card */}
      <div className="score-card">
        <div className="score-header">
          <h3>Brand Health</h3>
          <div className="score-value-container">
            <span
              className="score-value"
              style={{ color: getScoreColor(data.brand_health.score) }}
            >
              {data.brand_health.score}
            </span>
            <span className="score-max">/100</span>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${bhWidth}%`,
              backgroundColor: getScoreColor(data.brand_health.score),
            }}
          ></div>
        </div>
        <p className="score-insight">{data.brand_health.insight}</p>
      </div>

      {/* Outreach Readiness Score Card */}
      <div className="score-card">
        <div className="score-header">
          <h3>Outreach Readiness</h3>
          <div className="score-value-container">
            <span
              className="score-value"
              style={{ color: getScoreColor(data.outreach_readiness.score) }}
            >
              {data.outreach_readiness.score}
            </span>
            <span className="score-max">/100</span>
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${orWidth}%`,
              backgroundColor: getScoreColor(data.outreach_readiness.score),
            }}
          ></div>
        </div>
        <p className="score-insight">{data.outreach_readiness.insight}</p>
      </div>

      {/* DM Suggestion Widget */}
      <div className="dm-card">
        <h3>
          <span role="img" aria-label="Pitch">
            💬
          </span>{" "}
          Suggested Outreach Angle
        </h3>
        <div className="dm-text">{data.dm_suggestion}</div>
        <div className="dm-actions">
          <button className="btn btn-primary" onClick={handleCopy}>
            Copy DM Suggestion
          </button>
          {copied && <span className="copy-feedback">✓ Copied!</span>}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <div className="action-buttons-left">
          <button className="btn btn-secondary" onClick={onReset}>
            Hunt Another
          </button>
          <button className="btn btn-primary" onClick={handleDownloadCSV}>
            Download CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveToDashboard}
            disabled={isSaved}
            style={
              isSaved
                ? { backgroundColor: "var(--color-green)", border: "none" }
                : {}
            }
          >
            {isSaved ? "✓ Saved to List" : "Save Prospect"}
          </button>
          <button
            className="btn btn-tertiary"
            onClick={() => setShowEmailCapture(!showEmailCapture)}
          >
            {showEmailCapture ? "Close Emailer" : "Email Report"}
          </button>
        </div>
      </div>

      {/* Optional Email Report Form */}
      {showEmailCapture && (
        <div
          className="dm-card"
          style={{
            gridColumn: "span 2",
            marginTop: "1rem",
            borderLeft: "4px solid var(--color-brand)",
          }}
        >
          <h3>
            <span role="img" aria-label="Mail">
              ✉️
            </span>{" "}
            Email Audit Report
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: "1.25rem",
              fontSize: "0.95rem",
            }}
          >
            Enter your email to receive a beautifully formatted copy of this
            prospect's scores and pitch.
          </p>

          {mailSuccess ? (
            <div
              style={{
                color: "var(--color-green)",
                fontWeight: "600",
                padding: "0.5rem 0",
              }}
            >
              ✓ Email Sent! Check your inbox for the report.
            </div>
          ) : (
            <form
              onSubmit={handleSendEmailReport}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div className="input-wrapper" style={{ boxShadow: "none" }}>
                <input
                  type="email"
                  className="url-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSendingMail}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSendingMail}
                >
                  {isSendingMail ? "Sending..." : "Send"}
                </button>
              </div>
              {mailError && (
                <div className="error-message">
                  <span role="img" aria-label="Error">
                    ⚠️
                  </span>{" "}
                  {mailError}
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
