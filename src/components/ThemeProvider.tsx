"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "default" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>("default");

  const applyThemeClass = (newTheme: ThemeType) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("theme-dark");
    if (newTheme === "dark") root.classList.add("theme-dark");
  };

  useEffect(() => {
    // Read from localStorage on mount
    const savedTheme = localStorage.getItem("site-theme") as ThemeType;
    if (savedTheme && ["default", "dark"].includes(savedTheme)) {
      setTimeout(() => {
        setThemeState(savedTheme);
        applyThemeClass(savedTheme);
      }, 0);
    }
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem("site-theme", newTheme);
    applyThemeClass(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
