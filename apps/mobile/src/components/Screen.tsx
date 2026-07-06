import { PropsWithChildren } from "react";
import { ScrollView, StyleProp, StyleSheet, useWindowDimensions, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

type Props = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function Screen({ children, contentStyle }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 375 ? 16 : width > 430 ? 24 : 20;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16,
  },
});
