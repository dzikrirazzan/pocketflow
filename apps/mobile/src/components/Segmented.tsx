import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props<T extends string> = {
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  const { colors, theme } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }]}>
      {options.map((option) => {
        const isActive = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            hitSlop={4}
            onPress={() => onChange(option)}
            style={[
              styles.item,
              isActive && {
                backgroundColor: colors.panel,
                shadowColor: theme === "light" ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: theme === "light" ? 0.08 : 0,
                shadowRadius: 3,
                elevation: theme === "light" ? 2 : 0,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              style={[styles.label, { color: isActive ? colors.ink : colors.muted }]}
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
    minHeight: 40,
    padding: 3,
    borderRadius: 10,
    gap: 2,
    width: "100%",
  },
  item: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
    letterSpacing: -0.1,
  },
});
