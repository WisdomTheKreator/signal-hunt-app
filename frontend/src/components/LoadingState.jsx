import React, { useState, useEffect } from "react";

const LOADING_STEPS = [
  "Hunting signals...",
  "Extracting page copy...",
  "Analyzing design layout & spacing...",
  "Evaluating brand health indicators...",
  "Checking market growth triggers...",
  "Drafting personalized outreach DM...",
];

/**
 * LoadingState component containing an active spinner and cycling status messages.
 */
export default function LoadingState() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Cycle through messages to give the user real-time status updates
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="loading-state">
      <div className="spinner"></div>
      <p>{LOADING_STEPS[stepIndex]}</p>
    </section>
  );
}
