import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/theme/colors";

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  tone?: "primary" | "soft" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, tone = "primary", loading = false, disabled = false }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: isDisabled ? 0.55 : 1 }}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          tone === "soft" && styles.soft,
          tone === "danger" && styles.danger,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={tone === "soft" ? colors.blue : "#fff"}
          />
        ) : (
          <Text
            style={[
              styles.label,
              tone === "soft" && styles.softLabel,
            ]}
          >
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
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  soft: {
    backgroundColor: "#e0f2fe",
  },
  danger: {
    backgroundColor: colors.red,
  },
  label: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  softLabel: {
    color: colors.blue,
  },
});
