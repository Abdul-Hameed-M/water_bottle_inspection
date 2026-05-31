import React, { createContext, useContext, useState, useEffect } from 'react';
import { lightTheme, darkTheme } from './theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to light
    const savedTheme = localStorage.getItem('seewise_theme');
    return savedTheme === 'dark' ? darkTheme : lightTheme;
  });

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme.mode === 'light' ? darkTheme : lightTheme;
      localStorage.setItem('seewise_theme', newTheme.mode);
      return newTheme;
    });
  };

  const setThemeMode = (mode) => {
    if (mode === 'dark') {
      setTheme(darkTheme);
      localStorage.setItem('seewise_theme', 'dark');
    } else {
      setTheme(lightTheme);
      localStorage.setItem('seewise_theme', 'light');
    }
  };

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme.mode);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
