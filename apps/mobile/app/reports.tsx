import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { Summary } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function ReportsScreen() {
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
      <View>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Lihat uang keluar ke mana saja.</Text>
      </View>

      <Segmented value={period} options={["daily", "weekly", "monthly"]} onChange={setPeriod} />

      {loading ? (
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Card>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.label}>Income</Text>
                <Text style={styles.good}>{rupiah(summary?.totals.income ?? 0)}</Text>
              </View>
              <View>
                <Text style={styles.label}>Expense</Text>
                <Text style={styles.bad}>{rupiah(summary?.totals.expense ?? 0)}</Text>
              </View>
            </View>
            <View style={styles.netBox}>
              <Text style={styles.label}>Net cashflow</Text>
              <Text style={styles.net}>{rupiah(summary?.totals.net ?? 0)}</Text>
            </View>
          </Card>

          <Text style={styles.section}>By Category</Text>
          {summary?.byCategory.map((item, index) => {
            const total = Number(item.total);
            return (
              <Card key={`${item.categoryName}-${index}`}>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.categoryName ?? "Uncategorized"}</Text>
                  <Text style={styles.amount}>{rupiah(total)}</Text>
                </View>
                <View style={styles.track}>
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

          <Text style={styles.section}>By Wallet</Text>
          {summary?.byWallet.map((item, index) => (
            <Card key={`${item.walletName}-${index}`}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.walletName ?? "Unknown"}</Text>
                <Text style={styles.amount}>{rupiah(item.total)}</Text>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  label: { color: colors.muted, fontWeight: "800", marginBottom: 6 },
  good: { color: colors.green, fontSize: 18, fontWeight: "900" },
  bad: { color: colors.red, fontSize: 18, fontWeight: "900" },
  netBox: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.line },
  net: { color: colors.ink, fontSize: 26, fontWeight: "900" },
  section: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  name: { color: colors.ink, fontWeight: "900" },
  amount: { color: colors.ink, fontWeight: "900" },
  track: { height: 10, borderRadius: 5, backgroundColor: "#e2e8f0", overflow: "hidden", marginTop: 12 },
  fill: { height: "100%" },
});
