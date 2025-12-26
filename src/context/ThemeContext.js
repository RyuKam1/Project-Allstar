"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('default');

  useEffect(() => {
    // Load saved theme
    const saved = localStorage.getItem('allstar_theme');
    if (saved) setTheme(saved);
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('allstar_theme', newTheme);
  };

  useEffect(() => {
    // Apply theme class/attribute to HTML or BODY
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
