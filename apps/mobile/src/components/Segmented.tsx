import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props<T extends string> = {
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  const { colors, theme } = useTheme();

  const wrapStyle = {
    backgroundColor: theme === "light" ? "#e3e3e9" : "#1c1c1e",
  };

  const activeItemStyle = {
    backgroundColor: theme === "light" ? "#ffffff" : "#2c2c2e",
    shadowColor: theme === "light" ? "#000" : "transparent",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme === "light" ? 0.08 : 0,
    shadowRadius: 1.5,
    elevation: theme === "light" ? 1 : 0,
  };

  return (
    <View style={[styles.wrap, wrapStyle]}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <Pressable 
            key={option} 
            onPress={() => onChange(option)} 
            style={[styles.item, isActive && activeItemStyle]}
          >
            <Text 
              style={[
                styles.label, 
                { color: isActive ? colors.ink : colors.muted }
              ]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 9,
  },
  item: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: -0.08,
  },
});
