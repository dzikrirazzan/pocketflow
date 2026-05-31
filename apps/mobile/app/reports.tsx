import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { Summary } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function ReportsScreen() {
  const { colors, theme } = useTheme();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api.summary(period);
      setSummary(data);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal memuat laporan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [period]);

  const maxCategory = Math.max(1, ...(summary?.byCategory.map((item) => Number(item.total)) ?? []));

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Reports</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Lihat uang keluar ke mana saja.</Text>
      </View>

      <Segmented value={period} options={["daily", "weekly", "monthly"]} onChange={setPeriod} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Card>
            <View style={styles.summaryRow}>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Income</Text>
                <Text style={[styles.good, { color: colors.green }]}>{rupiah(summary?.totals.income ?? 0)}</Text>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.muted }]}>Expense</Text>
                <Text style={[styles.bad, { color: colors.red }]}>{rupiah(summary?.totals.expense ?? 0)}</Text>
              </View>
            </View>
            <View style={[styles.netBox, { borderTopColor: colors.line }]}>
              <Text style={[styles.label, { color: colors.muted }]}>Net cashflow</Text>
              <Text style={[styles.net, { color: colors.ink }]}>{rupiah(summary?.totals.net ?? 0)}</Text>
            </View>
          </Card>

          <Text style={[styles.section, { color: colors.ink }]}>By Category</Text>
          {summary?.byCategory.map((item, index) => {
            const total = Number(item.total);
            return (
              <Card key={`${item.categoryName}-${index}`}>
                <View style={styles.row}>
                  <Text style={[styles.name, { color: colors.ink }]}>{item.categoryName ?? "Uncategorized"}</Text>
                  <Text style={[styles.amount, { color: colors.ink }]}>{rupiah(total)}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: theme === "light" ? "#e2e8f0" : "#2c2c2e" }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${(total / maxCategory) * 100}%`,
                        backgroundColor: item.color ?? colors.blue,
                      },
                    ]}
                  />
                </View>
              </Card>
            );
          })}

          <Text style={[styles.section, { color: colors.ink }]}>By Wallet</Text>
          {summary?.byWallet.map((item, index) => (
            <Card key={`${item.walletName}-${index}`}>
              <View style={styles.row}>
                <Text style={[styles.name, { color: colors.ink }]}>{item.walletName ?? "Unknown"}</Text>
                <Text style={[styles.amount, { color: colors.ink }]}>{rupiah(item.total)}</Text>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 4 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { fontSize: 16, marginTop: 4, letterSpacing: -0.24 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  label: { fontWeight: "700", marginBottom: 6, fontSize: 13, letterSpacing: -0.1 },
  good: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  bad: { fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  netBox: { marginTop: 18, paddingTop: 18, borderTopWidth: 1 },
  net: { fontSize: 26, fontWeight: "900", letterSpacing: -0.6 },
  section: { fontWeight: "800", fontSize: 17, marginTop: 16, marginBottom: 4, letterSpacing: -0.2 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  name: { fontWeight: "700", fontSize: 15, letterSpacing: -0.2 },
  amount: { fontWeight: "800", fontSize: 15, letterSpacing: -0.2 },
  track: { height: 10, borderRadius: 5, overflow: "hidden", marginTop: 12 },
  fill: { height: "100%" },
});
