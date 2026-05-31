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
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  }

  const isDisabled = disabled || loading;

  // Premium dynamic style tokens based on active iOS theme
  const buttonStyle = {
    backgroundColor: 
      tone === "primary" 
        ? colors.blue 
        : tone === "soft"
          ? (theme === "light" ? "#e5e5ea" : "#2c2c2e")
          : colors.red,
  };

  const labelStyle = {
    color: 
      tone === "soft"
        ? colors.ink
        : "#ffffff",
  };

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: isDisabled ? 0.6 : 1 }}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, buttonStyle]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={tone === "soft" ? colors.ink : "#ffffff"}
          />
        ) : (
          <Text style={[styles.label, labelStyle]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.24,
  },
});
