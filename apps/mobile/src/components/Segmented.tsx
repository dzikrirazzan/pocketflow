import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type Props<T extends string> = {
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => (
        <Pressable key={option} onPress={() => onChange(option)} style={[styles.item, value === option && styles.active]}>
          <Text style={[styles.label, value === option && styles.activeLabel]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 8
  },
  item: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  active: {
    backgroundColor: "#fff"
  },
  label: {
    color: colors.muted,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  activeLabel: {
    color: colors.ink
  }
});
