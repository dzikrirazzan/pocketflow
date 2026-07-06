import { Text, TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, style, ...props }: Props) {
  const { colors, theme } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.muted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme === "light" ? "#d1d5db" : "#4b5563"}
        style={[
          styles.input,
          {
            backgroundColor: theme === "light" ? "#f9fafb" : "#1f2937",
            borderColor: error ? colors.red : theme === "light" ? "#e5e7eb" : "#374151",
            color: colors.ink,
          },
          style,
        ]}
        selectionColor={colors.blue}
        {...props}
      />
      {error ? <Text style={[styles.error, { color: colors.red }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "400",
  },
  error: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
