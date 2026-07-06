import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark";

export const lightColors = {
  ink: "#111111",
  muted: "#6b7280",
  line: "#e5e7eb",
  bg: "#fafafa",
  panel: "#ffffff",
  blue: "#1a73e8",
  teal: "#0d9488",
  green: "#059669",
  red: "#dc2626",
  amber: "#d97706",
  violet: "#7c3aed"
};

export const darkColors = {
  ink: "#f9fafb",
  muted: "#9ca3af",
  line: "#1f2937",
  bg: "#000000",
  panel: "#111111",
  blue: "#3b82f6",
  teal: "#14b8a6",
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  violet: "#8b5cf6"
};

type ThemeContextType = {
  theme: Theme;
  colors: typeof lightColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    async function loadTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem("@pocketflow_theme");
        if (savedTheme === "light" || savedTheme === "dark") {
          setThemeState(savedTheme);
        }
      } catch (e) {
        console.warn("Gagal membaca tema dari AsyncStorage", e);
      }
    }
    loadTheme();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem("@pocketflow_theme", newTheme);
    } catch (e) {
      console.warn("Gagal menyimpan tema ke AsyncStorage", e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const colors = theme === "light" ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
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
