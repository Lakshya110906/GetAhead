"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeType = "default" | "dark" | "emerald" | "sunset";

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
    // Remove existing themes
    root.classList.remove("theme-dark", "theme-emerald", "theme-sunset");

    // Add new theme
    if (newTheme === "dark") root.classList.add("theme-dark");
    else if (newTheme === "emerald") root.classList.add("theme-emerald");
    else if (newTheme === "sunset") root.classList.add("theme-sunset");
  };

  useEffect(() => {
    // Read from localStorage on mount
    const savedTheme = localStorage.getItem("site-theme") as ThemeType;
    if (savedTheme && ["default", "dark", "emerald", "sunset"].includes(savedTheme)) {
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
