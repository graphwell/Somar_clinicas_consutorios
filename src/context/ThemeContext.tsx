"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppearancePreset = 'dark-stellar' | 'light-soft' | 'modern-blue';

interface ThemeContextType { 
  theme: AppearancePreset; 
  setTheme: (preset: AppearancePreset) => void; 
}

const ThemeContext = createContext<ThemeContextType>({ 
  theme: 'dark-stellar', 
  setTheme: () => {} 
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setPreset] = useState<AppearancePreset>('dark-stellar');

  useEffect(() => {
    const stored = localStorage.getItem('somar-theme') as AppearancePreset | null;
    if (stored && ['dark-stellar', 'light-soft', 'modern-blue'].includes(stored)) {
      setPreset(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Remove all possible theme classes
    root.classList.remove('dark-stellar', 'light-soft', 'modern-blue', 'dark', 'light');
    // Add the selected one
    root.classList.add(theme);
    // Backward compatibility for components checking .dark or .light
    if (theme === 'dark-stellar') root.classList.add('dark');
    else root.classList.add('light');

    localStorage.setItem('somar-theme', theme);
  }, [theme]);

  const setTheme = (preset: AppearancePreset) => setPreset(preset);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
