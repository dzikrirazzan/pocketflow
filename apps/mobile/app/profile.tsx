import { useState } from "react";
import { Alert, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Segmented } from "@/components/Segmented";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";

  function handleSignOut() {
    Alert.alert("Sign Out", "Yakin mau keluar dari PocketFlow?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await signOut();
          } catch (err: any) {
            Alert.alert("Error", err?.message ?? "Gagal sign out.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Akun & pengaturan</Text>
      </View>

      <Card>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.blue }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.info}>
            <Text style={[styles.email, { color: colors.ink }]} numberOfLines={1}>
              {email}
            </Text>
            <Text style={[styles.status, { color: colors.muted }]}>Signed in</Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Pengaturan Tema</Text>
      <Card>
        <View style={styles.settingsRow}>
          <View style={styles.settingLabelWrap}>
            <Ionicons 
              name={theme === "light" ? "sunny-outline" : "moon-outline"} 
              size={20} 
              color={colors.blue} 
            />
            <Text style={[styles.settingLabel, { color: colors.ink }]}>Pilih Mode</Text>
          </View>
          <View style={{ width: 140 }}>
            <Segmented 
              value={theme} 
              options={["light", "dark"]} 
              onChange={(val) => setTheme(val as any)} 
            />
          </View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Informasi Aplikasi</Text>
      <Card>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>Versi</Text>
          <Text style={[styles.infoValue, { color: colors.ink }]}>v1.1.0 (Production)</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.muted }]}>Engine</Text>
          <Text style={[styles.infoValue, { color: colors.ink }]}>Expo Router v6</Text>
        </View>
      </Card>

      <View style={styles.signOutWrapper}>
        <Button
          label="Sign Out"
          onPress={handleSignOut}
          tone="danger"
          loading={loading}
          disabled={loading}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    letterSpacing: -0.24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  info: {
    flex: 1,
  },
  email: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.32,
  },
  status: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: -0.15,
    marginTop: 18,
    marginBottom: 4,
    paddingLeft: 4,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.15,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  signOutWrapper: {
    marginTop: 24,
    marginBottom: 32,
  },
});
