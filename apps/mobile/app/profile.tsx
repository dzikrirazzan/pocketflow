import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/theme/colors";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";

  function handleSignOut() {
    Alert.alert("Sign Out", "Yakin mau keluar?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
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
      <View>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Akun & pengaturan</Text>
      </View>

      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
            <Text style={styles.status}>Signed in</Text>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginTop: 4,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.teal,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
  },
  info: {
    flex: 1,
  },
  email: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.ink,
  },
  status: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
  },
  signOutWrapper: {
    marginTop: 16,
  },
});
