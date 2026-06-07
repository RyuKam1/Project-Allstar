"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import {
  applyThemeTypography,
  buildThemeCookieValue,
  normalizeThemeId,
} from '@/lib/themeTypography';

const ThemeContext = createContext();

function persistTheme(themeId) {
  const normalized = normalizeThemeId(themeId);
  localStorage.setItem('allstar_theme', normalized);
  document.cookie = buildThemeCookieValue(normalized);
  return normalized;
}

export function ThemeProvider({ children, initialTheme = 'default' }) {
  const [theme, setTheme] = useState(() => normalizeThemeId(initialTheme));

  useEffect(() => {
    const stored = normalizeThemeId(localStorage.getItem('allstar_theme') || initialTheme);
    if (stored !== normalizeThemeId(initialTheme)) {
      setTheme(stored);
      document.cookie = buildThemeCookieValue(stored);
      return;
    }
    localStorage.setItem('allstar_theme', normalizeThemeId(initialTheme));
  }, [initialTheme]);

  const changeTheme = (newTheme) => {
    const normalized = persistTheme(newTheme);
    setTheme(normalized);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    applyThemeTypography(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
