 "use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "mgcom-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Инициализация из localStorage или системной темы
    const stored =
      (typeof window !== "undefined" &&
        (window.localStorage.getItem(STORAGE_KEY) as Theme | null)) ||
      null;

    if (stored === "light" || stored === "dark") {
      applyTheme(stored);
      setTheme(stored);
      return;
    }

    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initial: Theme = prefersDark ? "dark" : "light";
    applyTheme(initial);
    setTheme(initial);
  }, []);

  const applyTheme = (value: Theme) => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", value);
    window.localStorage.setItem(STORAGE_KEY, value);
  };

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label="Переключить тему"
    >
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-amber-300 dark:bg-slate-100 dark:text-slate-900"
        aria-hidden="true"
      >
        {theme === "light" ? "☀" : "☾"}
      </span>
      <span>{theme === "light" ? "Светлая" : "Тёмная"} тема</span>
    </button>
  );
}

