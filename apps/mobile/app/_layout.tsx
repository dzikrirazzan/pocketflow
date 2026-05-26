import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme/colors";

export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            borderTopColor: colors.line,
            height: 84,
            paddingTop: 8,
            paddingBottom: 24
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "700"
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />
          }}
        />
        <Tabs.Screen
          name="wallets"
          options={{
            title: "Wallet",
            tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={22} color={color} />
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "Add",
            tabBarIcon: ({ color }) => <Ionicons name="add-circle-outline" size={24} color={color} />
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: "Budget",
            tabBarIcon: ({ color }) => <Ionicons name="pie-chart-outline" size={22} color={color} />
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: "Report",
            tabBarIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />
          }}
        />
      </Tabs>
    </>
  );
}
