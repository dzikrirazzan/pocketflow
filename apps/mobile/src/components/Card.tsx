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
          borderColor: colors.line,
          shadowColor: theme === "light" ? "#1c1c1e" : "transparent",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: theme === "light" ? 0.05 : 0,
          shadowRadius: 3,
          elevation: theme === "light" ? 1 : 0
        }
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    overflow: "hidden",
  }
});
