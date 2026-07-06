import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  tone?: "primary" | "soft" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, tone = "primary", loading = false, disabled = false }: Props) {
  const { colors, theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    if (isDisabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  }

  const isDisabled = disabled || loading;

  const bg =
    tone === "primary"
      ? colors.ink
      : tone === "soft"
        ? theme === "light" ? "#f3f4f6" : "#1f2937"
        : colors.red;

  const fg =
    tone === "primary"
      ? theme === "light" ? "#ffffff" : "#000000"
      : tone === "soft"
        ? colors.ink
        : "#ffffff";

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: isDisabled ? 0.5 : 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        hitSlop={8}
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, { backgroundColor: bg }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.label, { color: fg }]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
