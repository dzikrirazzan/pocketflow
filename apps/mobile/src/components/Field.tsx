import { Text, TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, style, ...props }: Props) {
  const { colors, theme } = useTheme();

  const labelStyle = {
    color: colors.muted,
  };

  const inputStyle = {
    backgroundColor: theme === "light" ? "#ffffff" : "#1c1c1e",
    borderColor: error ? colors.red : colors.line,
    color: colors.ink,
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <TextInput 
        placeholderTextColor={theme === "light" ? "#c7c7cc" : "#48484a"} 
        style={[styles.input, inputStyle, style]} 
        {...props} 
      />
      {error ? <Text style={[styles.error, { color: colors.red }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  error: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  }
});
