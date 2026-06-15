import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import HuntForm from "./components/HuntForm";
import LoadingState from "./components/LoadingState";
import ResultsDisplay from "./components/ResultsDisplay";
import SavedProspectsList from "./components/SavedProspectsList";

/**
 * Main application component for Signal Hunt.
 * Coordinates UI states: Input (default), Loading, and Results.
 * Uses browser LocalStorage for stateless database-free prospect persistence.
 */
function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Read saved prospects from LocalStorage on mount
  const [savedProspects, setSavedProspects] = useState(() => {
    try {
      const stored = localStorage.getItem("savedProspects");
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error("Error reading saved prospects from LocalStorage:", err);
      return [];
    }
  });

  // Sync saved prospects list to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("savedProspects", JSON.stringify(savedProspects));
  }, [savedProspects]);

  // Executes URL qualification sequence using relative Vercel-compatible paths
  const handleHunt = async (targetUrl) => {
    if (!targetUrl || !targetUrl.trim()) {
      setError("Please enter a valid URL or handle.");
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/hunt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: targetUrl }),
        },
      );

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        setError(
          "Analysis failed: Invalid response from server (possible backend deployment issue).",
        );
        return;
      }

      if (response.ok && data?.success) {
        setResult(data);
      } else {
        setError(
          data?.error ||
            "Analysis failed: The server encountered an error processing this request.",
        );
      }
    } catch (err) {
      setError("Backend unreachable: Could not connect to the API server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  // Adds active result to LocalStorage dashboard
  const handleSaveProspect = (prospect) => {
    // Check if already saved
    if (savedProspects.some((p) => p.url === prospect.url)) return;

    const updatedProspect = {
      ...prospect,
      savedAt: new Date().toISOString(),
    };
    setSavedProspects((prev) => [updatedProspect, ...prev]);
  };

  // Deletes single item from list
  const handleDeleteProspect = (huntId) => {
    setSavedProspects((prev) => prev.filter((p) => p.hunt_id !== huntId));
  };

  // Clears list with confirmation
  const handleClearAll = () => {
    if (
      window.confirm(
        "Are you sure you want to clear your saved prospects list? This cannot be undone.",
      )
    ) {
      setSavedProspects([]);
    }
  };

  // Checks if active result is already saved
  const isResultSaved = result
    ? savedProspects.some((p) => p.url === result.url)
    : false;

  return (
    <div className="app-container">
      <Header />

      <main className="container">
        {/* Only show Hero when not displaying results */}
        {!result && <Hero />}

        <div
          className="beta-limit-card"
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "1.2rem 1.3rem",
            marginBottom: "1.5rem",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h2>Beta Launch Limits</h2>
          <p>
            This MVP is in its beta phase. You can currently make up to{" "}
            <strong>5 hunts per minute</strong> and{" "}
            <strong>500 hunts per day</strong>. If you hit a limit, please wait
            a bit before trying again. Thank You!
          </p>
        </div>

        {/* Input Form visible if not loading and no active results */}
        {!isLoading && !result && (
          <HuntForm onSubmit={handleHunt} isLoading={isLoading} />
        )}

        {/* Display backend connection or scraping failure error */}
        {error && !isLoading && (
          <div
            className="error-message"
            style={{ justifyContent: "center", marginBottom: "2rem" }}
          >
            <span role="img" aria-label="Error">
              ❌
            </span>{" "}
            {error}
          </div>
        )}

        {/* Active scraping spinner loader */}
        {isLoading && <LoadingState />}

        {/* Completed prospect audit display */}
        {result && !isLoading && (
          <ResultsDisplay
            data={result}
            onReset={handleReset}
            onSaveProspect={handleSaveProspect}
            isSaved={isResultSaved}
          />
        )}

        {/* Persistent LocalStorage dashboard table (visible when not loading) */}
        {!isLoading && (
          <SavedProspectsList
            prospects={savedProspects}
            onDelete={handleDeleteProspect}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} Signal Hunt. Built by The Kreator
          for Designers' cold outreach.
        </p>
      </footer>
    </div>
  );
}

export default App;
