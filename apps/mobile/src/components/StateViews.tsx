import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Card } from "@/components/Card";

type IconName = keyof typeof Ionicons.glyphMap;

type LoadingStateProps = {
  title?: string;
  subtitle?: string;
};

export function LoadingState({
  title = "Memuat data...",
  subtitle = "Tunggu sebentar, data sedang disiapkan.",
}: LoadingStateProps) {
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.stateWrap}>
        <ActivityIndicator size="large" color={colors.muted} />
        <View style={styles.stateTextWrap}>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>{title}</Text>
          <Text style={[styles.stateSubtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
      </View>
    </Card>
  );
}

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={36} color={colors.muted} style={{ opacity: 0.5 }} />
      <View style={styles.stateTextWrap}>
        <Text style={[styles.stateTitle, { color: colors.muted }]}>{title}</Text>
        {subtitle ? <Text style={[styles.stateSubtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors, theme } = useTheme();

  return (
    <Card>
      <View style={styles.errorWrap}>
        <View style={[styles.errorIcon, { backgroundColor: theme === "light" ? "#fef2f2" : "#371717" }]}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.red} />
        </View>
        <View style={styles.errorTextWrap}>
          <Text style={[styles.stateTitle, { color: colors.ink }]}>Data gagal dimuat</Text>
          <Text style={[styles.stateSubtitle, { color: colors.muted }]}>{message}</Text>
        </View>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onRetry}
            style={[styles.retryButton, { backgroundColor: colors.ink }]}
          >
            <Text style={[styles.retryText, { color: theme === "light" ? "#ffffff" : "#000000" }]}>Coba Lagi</Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

export function TopProgressBar({ visible }: { visible: boolean }) {
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    if (!visible) {
      translateX.setValue(-width);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 1000,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [translateX, visible, width]);

  if (!visible) return null;

  return (
    <View style={[styles.progressTrack, { backgroundColor: theme === "light" ? "#e5e7eb" : "#1f2937" }]}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: colors.ink,
            width: Math.max(120, width * 0.35),
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    minHeight: 140,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  stateTextWrap: {
    alignItems: "center",
    gap: 4,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  stateSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 120,
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  errorWrap: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTextWrap: {
    alignItems: "center",
    gap: 4,
    maxWidth: 320,
  },
  retryButton: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressTrack: {
    height: 2,
    borderRadius: 999,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});
