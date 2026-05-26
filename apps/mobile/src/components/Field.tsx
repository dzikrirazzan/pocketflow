import { Text, TextInput, TextInputProps, StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";

type Props = TextInputProps & {
  label: string;
};

export function Field({ label, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={styles.input} {...props} />
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
  }
});
