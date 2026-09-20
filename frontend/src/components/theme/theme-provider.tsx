"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("powerful_theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setThemeState(saved);
      applyTheme(saved);
    } else {
      applyTheme("light");
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    }
  };

  const setTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.add("theme-transitioning");

    const commit = () => {
      setThemeState(newTheme);
      localStorage.setItem("powerful_theme", newTheme);
      applyTheme(newTheme);
    };

    if (typeof document !== "undefined" && "startViewTransition" in document) {
      // @ts-expect-error View Transitions API
      document.startViewTransition(() => {
        commit();
      });
    } else {
      commit();
    }

    setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 400);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      className={`relative inline-flex items-center justify-center h-9 w-9 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden group ${
        isLight
          ? "bg-white border-zinc-200 text-amber-500 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 hover:shadow"
          : "bg-[#0D1322] border-white/10 text-indigo-300 shadow-sm hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -14, opacity: 0, rotate: -70, scale: 0.65 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          exit={{ y: 14, opacity: 0, rotate: 70, scale: 0.65 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center"
        >
          {isLight ? (
            <Sun className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20 group-hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-300 fill-indigo-300/20 group-hover:-rotate-12 transition-transform duration-300" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
