import { useState } from "react";
import { Alert, StyleSheet, Text, View, TouchableOpacity, Share, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Segmented } from "@/components/Segmented";
import { TopProgressBar } from "@/components/StateViews";
import { api } from "@/lib/api";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";
  const compactSettings = width < 390;

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

  async function handleExportCSV() {
    if (exporting) return;

    try {
      setExporting(true);
      // Fetch all transactions, wallets, and categories
      const [transData, walletData, catData] = await Promise.all([
        api.transactions({ period: "all" }),
        api.wallets(),
        api.categories(),
      ]);

      const txs = transData.transactions;
      const wlts = walletData.wallets;
      const cats = catData.categories;

      if (txs.length === 0) {
        Alert.alert("Ekspor Gagal", "Belum ada data transaksi untuk diekspor.");
        return;
      }

      // Generate CSV content
      const headers = "Tanggal,Tipe,Nominal,Dompet Asal,Dompet Tujuan,Kategori,Catatan\n";
      const rows = txs.map((t) => {
        const date = t.happenedAt.slice(0, 10);
        const wName = wlts.find((w) => w.id === t.walletId)?.name ?? "";
        const targetWName = t.targetWalletId ? (wlts.find((w) => w.id === t.targetWalletId)?.name ?? "") : "";
        const catName = t.categoryId ? (cats.find((c) => c.id === t.categoryId)?.name ?? "") : "";
        const cleanedNote = (t.note ?? "").replace(/"/g, '""'); // escape double quotes for CSV safety

        return `"${date}","${t.type}",${t.amount},"${wName}","${targetWName}","${catName}","${cleanedNote}"`;
      }).join("\n");

      const csvContent = headers + rows;

      // Share CSV content natively
      await Share.share({
        message: csvContent,
        title: "PocketFlow_Ekspor_Transaksi.csv",
      });
    } catch (err: any) {
      Alert.alert("Ekspor Gagal", err?.message ?? "Gagal mengekspor data.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Akun & preferensi aplikasi</Text>
      </View>

      <TopProgressBar visible={exporting || loading} />

      {/* User Info Group */}
      <Card>
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.ink }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.info}>
            <Text style={[styles.email, { color: colors.ink }]} numberOfLines={1}>
              {email}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.statusIndicator, { backgroundColor: colors.green }]} />
              <Text style={[styles.status, { color: colors.muted }]}>Akun Aktif</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Preferences Group */}
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>PREFERENSI TAMPILAN</Text>
      <Card>
        <View style={[styles.settingsRow, compactSettings && styles.settingsRowStacked]}>
          <View style={styles.settingLabelWrap}>
            <View style={[styles.iconBox, { backgroundColor: colors.ink }]}>
              <Ionicons 
                name={theme === "light" ? "sunny" : "moon"} 
                size={16} 
                color={theme === "light" ? "#ffffff" : "#000000"} 
              />
            </View>
            <View style={styles.settingTextWrap}>
              <Text numberOfLines={1} style={[styles.settingLabel, { color: colors.ink }]}>Tema Aplikasi</Text>
              <Text numberOfLines={2} style={[styles.settingSublabel, { color: colors.muted }]}>Atur tema terang atau gelap</Text>
            </View>
          </View>
          <View style={[styles.themeControl, compactSettings && styles.themeControlCompact]}>
            <Segmented 
              value={theme} 
              options={["light", "dark"]} 
              onChange={(val) => setTheme(val as any)} 
            />
          </View>
        </View>
      </Card>

      {/* Export Group */}
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>EKSPOR DATA</Text>
      <Card>
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={handleExportCSV}
          disabled={exporting}
          hitSlop={8}
          style={[styles.settingsRow, styles.exportRow, exporting && styles.disabledRow]}
        >
          <View style={styles.settingLabelWrap}>
            <View style={[styles.iconBox, { backgroundColor: colors.green }]}>
              {exporting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="document-text" size={16} color="#ffffff" />
              )}
            </View>
            <View style={styles.settingTextWrap}>
              <Text numberOfLines={1} style={[styles.settingLabel, { color: colors.ink }]}>Ekspor Transaksi (CSV)</Text>
              <Text numberOfLines={2} style={[styles.settingSublabel, { color: colors.muted }]}>Bagikan atau simpan laporan riwayat keuangan</Text>
            </View>
          </View>
          <View style={[styles.trailingIcon, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }]}>
            <Ionicons name="share-outline" size={18} color={colors.muted} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Application Group */}
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>INFORMASI APLIKASI</Text>
      <Card>
        <View style={styles.infoRow}>
          <View style={styles.settingLabelWrap}>
            <View style={[styles.iconBox, { backgroundColor: colors.teal }]}>
              <Ionicons name="information-circle" size={16} color="#ffffff" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text numberOfLines={1} style={[styles.settingLabel, { color: colors.ink }]}>Versi Aplikasi</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.infoValue, { color: colors.muted }]}>v1.2.0 (Stable)</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <View style={styles.infoRow}>
          <View style={styles.settingLabelWrap}>
            <View style={[styles.iconBox, { backgroundColor: colors.violet }]}>
              <Ionicons name="code-working" size={16} color="#ffffff" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text numberOfLines={1} style={[styles.settingLabel, { color: colors.ink }]}>Engine</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.infoValue, { color: colors.muted }]}>Expo SDK 54</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <View style={styles.infoRow}>
          <View style={styles.settingLabelWrap}>
            <View style={[styles.iconBox, { backgroundColor: colors.green }]}>
              <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text numberOfLines={1} style={[styles.settingLabel, { color: colors.ink }]}>Keamanan</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={[styles.infoValue, { color: colors.muted }]}>Supabase Protected</Text>
        </View>
      </Card>

      {/* Logout Action */}
      <View style={styles.signOutWrapper}>
        <Button
          label="Sign Out dari Akun"
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
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 22,
    marginBottom: 6,
    paddingLeft: 4,
  },
  settingsRow: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  settingsRowStacked: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 12,
  },
  exportRow: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  disabledRow: {
    opacity: 0.65,
  },
  settingLabelWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  themeControl: {
    width: 140,
    flexShrink: 0,
  },
  themeControlCompact: {
    width: "100%",
  },
  trailingIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  settingSublabel: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 1,
    lineHeight: 16,
  },
  infoRow: {
    minHeight: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 2,
  },
  infoValue: {
    flexShrink: 1,
    maxWidth: "50%",
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  signOutWrapper: {
    marginTop: 20,
    marginBottom: 20,
  },
});
