"use client";
import React, { useState } from 'react';
import { useTheme } from "@/context/ThemeContext";

const themes = [
  { id: 'default', name: 'Street Court', color: '#D9281C' },
  { id: 'tactical', name: 'Tactical OPS', color: '#00ff9d' },
  { id: 'kingdom', name: 'Ancient Kingdom', color: '#d4af37' },
  { id: 'nightcity', name: 'Night City', color: '#3b82f6' },
  { id: 'pro', name: 'Pro League', color: '#ff4400' },
  { id: 'retro', name: 'Synthwave 84', color: '#ff00ff' },
  { id: 'minimal', name: 'Minimal Tech', color: '#e2e8f0' },
  { id: 'street', name: 'Street Sport', color: '#fbbf24' },
  { id: 'utility', name: 'Urban Utility', color: '#a3e635' },
  { id: 'maximalist', name: 'Maximalist', color: '#ccff00' },
];

export default function ThemeSwitcher() {
  const { theme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999 }} className="theme-switcher-root">

      {isOpen && (
        <div className="glass-panel" style={{
          marginBottom: '15px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '200px'
        }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-header)' }}>Select Theme</h4>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => { changeTheme(t.id); setIsOpen(false); }}
              style={{
                background: theme === t.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: '1px solid transparent',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                borderRadius: '6px',
                fontFamily: 'var(--font-main)',
                textAlign: 'left'
              }}
            >
              <span style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: t.color,
                filter: `drop-shadow(0 0 8px ${t.color})`,
                flexShrink: 0,
              }} />
              {t.name}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close theme switcher" : "Open theme switcher"}
        style={{
          width: '50px', height: '50px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '2px solid var(--border-glass)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
        title="Change Theme"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C13.66 21 15 19.66 15 18C15 17.22 14.69 16.52 14.19 16.01C13.68 15.51 13.37 14.81 13.37 14.03C13.37 12.47 14.64 11.2 16.2 11.2H18C19.66 11.2 21 9.86 21 8.2C21 5.33 16.97 3 12 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6.5" cy="11.5" r="1" fill="currentColor" />
          <circle cx="9.5" cy="7.5" r="1" fill="currentColor" />
          <circle cx="13.5" cy="7.5" r="1" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}
