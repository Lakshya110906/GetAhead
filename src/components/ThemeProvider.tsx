"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";

export type ThemeType = "default" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "site-theme";

// The authoritative theme is the class on <html>, which the blocking script
// in layout.tsx sets from localStorage (or the system preference) before
// first paint. React must READ that, never own it: this component used to
// hold the theme in useState and sync it in a mount effect, which meant the
// first client render always claimed "default" and then set state — a
// cascading render on every page load, and a value that disagreed with the
// DOM for one frame.
//
// useSyncExternalStore is the supported way to subscribe to state that lives
// outside React. getServerSnapshot returns "default" because the server
// cannot know the visitor's preference; React re-reads getSnapshot after
// hydration and re-renders only if it actually differs.
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): ThemeType {
  return document.documentElement.classList.contains("theme-dark") ? "dark" : "default";
}

function getServerSnapshot(): ThemeType {
  return "default";
}

function applyThemeClass(next: ThemeType): void {
  const root = document.documentElement;
  root.classList.toggle("theme-dark", next === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = (newTheme: ThemeType) => {
    applyThemeClass(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Private browsing or blocked site data — the theme still applies for
      // this page view, it just won't be remembered. Never a hard failure.
    }
    listeners.forEach((l) => l());
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
