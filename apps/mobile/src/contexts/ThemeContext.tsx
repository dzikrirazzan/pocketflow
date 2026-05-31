import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Theme = "light" | "dark";

export const lightColors = {
  ink: "#1c1c1e",
  muted: "#8e8e93",
  line: "#e5e5ea",
  bg: "#f2f2f7",
  panel: "#ffffff",
  blue: "#007aff",
  teal: "#30b0c7",
  green: "#34c759",
  red: "#ff3b30",
  amber: "#ff9500",
  violet: "#af52de"
};

export const darkColors = {
  ink: "#ffffff",
  muted: "#98989f",
  line: "#2c2c2e",
  bg: "#000000",
  panel: "#1c1c1e",
  blue: "#0a84ff",
  teal: "#64d2ff",
  green: "#30d158",
  red: "#ff453a",
  amber: "#ff9f0a",
  violet: "#bf5af2"
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
