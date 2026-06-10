import React, { useState, useEffect } from "react";
import "./FirstTimeDemo.css";

/**
 * FirstTimeDemo Component
 * Displays a demo video modal on first site visit.
 * Uses localStorage to track if user has seen the demo.
 */
function FirstTimeDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has seen demo on mount
  useEffect(() => {
    const hasSeenDemo = localStorage.getItem("signal-hunt-demo-seen");
    if (!hasSeenDemo) {
      setShowDemo(true);
      // Mark as seen
      localStorage.setItem("signal-hunt-demo-seen", "true");
    }

    // Fetch demo video metadata from backend (or use env variable)
    const fetchDemoUrl = async () => {
      try {
        // First check environment variable
        const envUrl = import.meta.env.VITE_DEMO_VIDEO_URL;
        if (envUrl) {
          setVideoUrl(envUrl);
          setIsLoading(false);
          return;
        }

        // Fallback: try to get from backend API
        const response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/demo-video-url`);
        if (response.ok) {
          const data = await response.json();
          setVideoUrl(data.url);
        } else {
          console.warn("Could not fetch demo video URL");
        }
      } catch (error) {
        console.error("Error loading demo video:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemoUrl();
  }, []);

  const handleClose = () => {
    setShowDemo(false);
  };

  const handleSkip = () => {
    setShowDemo(false);
  };

  if (!showDemo || !videoUrl) return null;

  return (
    <div className="demo-overlay" onClick={handleClose}>
      <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="demo-header">
          <h2>Welcome to Signal Hunt! 🎯</h2>
          <button
            className="demo-close-btn"
            onClick={handleClose}
            aria-label="Close demo"
          >
            ✕
          </button>
        </div>

        {/* Video Container */}
        <div className="demo-video-container">
          {isLoading ? (
            <div className="demo-loading">
              <div className="spinner"></div>
              <p>Loading demo...</p>
            </div>
          ) : (
            <video
              controls
              autoPlay
              className="demo-video"
              onEnded={handleClose}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Footer */}
        <div className="demo-footer">
          <p>Learn how to hunt the right prospects in seconds!</p>
          <div className="demo-buttons">
            <button className="demo-btn skip-btn" onClick={handleSkip}>
              Skip
            </button>
            <button
              className="demo-btn watch-btn"
              onClick={() => {
                const video = document.querySelector(".demo-video");
                if (video) video.play();
              }}
            >
              Watch Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirstTimeDemo;
