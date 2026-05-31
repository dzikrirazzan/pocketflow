import { Text, TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput 
        placeholderTextColor="#94a3b8" 
        style={[styles.input, error ? styles.inputError : null, style]} 
        {...props} 
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: colors.ink,
    backgroundColor: "#fff",
    fontSize: 15
  },
  inputError: {
    borderColor: colors.red,
    borderWidth: 1.5,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -2
  }
});
