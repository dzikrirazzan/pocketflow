import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { isSignedIn, isLoading } = useAuth();
  const { theme, colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.muted} />
        <Text style={[styles.loaderText, { color: colors.muted }]}>Loading...</Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
      </Stack>
    );
  }

  return (
    <>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.panel,
              borderTopColor: theme === "light" ? "#f0f0f0" : colors.line,
            },
          ],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wallets"
          options={{
            title: "Wallet",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "Add",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: "Budget",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="edit" options={{ href: null }} />
        <Tabs.Screen name="reports" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabBar: {
    height: 84,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
