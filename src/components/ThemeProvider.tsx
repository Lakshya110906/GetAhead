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
    // The blocking inline script in layout.tsx already applied the right
    // class before first paint (saved preference, or system preference on a
    // first visit) — this just syncs React state to match, no re-apply needed.
    const savedTheme = localStorage.getItem("site-theme") as ThemeType;
    if (savedTheme && ["default", "dark"].includes(savedTheme)) {
      setThemeState(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
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
