import React, { useEffect, useState } from 'react';

/**
 * Header component featuring the brand logo and the dark/light mode toggle.
 */
export default function Header() {
  const [theme, setTheme] = useState(() => {
    // Read initial theme preference from LocalStorage or system defaults
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  });

  // Apply theme class to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <span className="logo-icon" role="img" aria-label="Target">🎯</span>
          <h1>Signal Hunt</h1>
        </div>
        <button 
          className="theme-toggle" 
          onClick={toggleTheme} 
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <span className="theme-icon">
            {theme === 'light' ? '🌙' : '☀️'}
          </span>
        </button>
      </div>
    </header>
  );
}
