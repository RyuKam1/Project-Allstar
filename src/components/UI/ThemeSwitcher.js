"use client";
import React, { useState } from 'react';
import { useTheme } from "@/context/ThemeContext";

const themes = [
  { id: 'default', name: 'Original', color: '#6366f1' },
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
    <div style={{ position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999 }}>
      
      {isOpen && (
        <div className="glass-panel" style={{ 
            marginBottom: '15px', 
            padding: '10px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            minWidth: '200px'
        }}>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Select Theme</h4>
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
                        boxShadow: `0 0 8px ${t.color}` 
                    }} />
                    {t.name}
                </button>
            ))}
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
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
        🎨
      </button>
    </div>
  );
}
