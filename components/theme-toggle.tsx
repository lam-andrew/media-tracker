"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Toggles between the "Literary light" and "Warm dark" themes by setting
 * data-theme on <html>, persisted to localStorage. A pre-hydration script in the
 * root layout applies the saved theme before paint (no flash); this control just
 * flips it and keeps its icon in sync.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") {
      // Sync the icon to whatever the pre-hydration script already applied.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(current);
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("marqd.theme", next);
    } catch {
      // ignore unavailable storage
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-ink"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
