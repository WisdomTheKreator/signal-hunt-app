import React, { useState } from 'react';

/**
 * HuntForm component for capturing and validating the prospect URL or Twitter handle.
 */
export default function HuntForm({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  // Validate the input before calling onSubmit
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL or Twitter handle.');
      return;
    }

    // Basic URL validation or Twitter handle validation (starts with @ or standard domain names)
    const isTwitterHandle = trimmed.startsWith('@');
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const hasDomain = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(trimmed);

    if (!isTwitterHandle && !hasProtocol && !hasDomain) {
      setError('Please enter a valid website URL (e.g., example.com) or Twitter handle (e.g., @founder).');
      return;
    }

    onSubmit(trimmed);
  };

  return (
    <section className="input-section">
      <form onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <input
            type="text"
            className="url-input"
            placeholder="https://example.com or @twitter_handle"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            aria-label="Prospect URL or handle input"
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Hunting...' : 'Hunt'}
          </button>
        </div>
        {error && (
          <div className="error-message">
            <span role="img" aria-label="Error">⚠️</span> {error}
          </div>
        )}
      </form>
    </section>
  );
}
