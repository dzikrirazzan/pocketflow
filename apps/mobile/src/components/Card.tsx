import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export function Card({ children }: PropsWithChildren) {
  const { colors, theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.panel,
          borderColor: theme === "dark" ? colors.line : "transparent",
          borderWidth: theme === "dark" ? 1 : 0,
          shadowColor: theme === "light" ? "#000" : "transparent",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme === "light" ? 0.04 : 0,
          shadowRadius: 12,
          elevation: theme === "light" ? 2 : 0,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    overflow: "hidden",
  },
});
