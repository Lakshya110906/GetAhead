"use client";

import { useTheme, ThemeType } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeSlider({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  const themes: { id: ThemeType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "default", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-1 bg-gray-100 border border-rule p-1 rounded-xl shadow-sm w-full max-w-full justify-between transition-all duration-300 no-print theme-slider-container"
    >
      {themes.map((t) => {
        const isActive = theme === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(t.id)}
            title={`${t.label} theme`}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isActive
                ? "bg-white text-ink shadow-sm font-bold scale-[1.03]"
                : "text-graphite hover:text-ink hover:bg-white/40"
            }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {!compact && <span className="hidden xs:inline sm:inline">{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
