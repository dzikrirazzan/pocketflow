import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

type Props = {
  label: string;
  onPress: () => void;
  tone?: "primary" | "soft";
};

export function Button({ label, onPress, tone = "primary" }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.button, tone === "soft" && styles.soft]}>
      <Text style={[styles.label, tone === "soft" && styles.softLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.ink
  },
  soft: {
    backgroundColor: "#e0f2fe"
  },
  label: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  },
  softLabel: {
    color: colors.blue
  }
});
