import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
import { rupiah, parseRupiahInput } from "@/lib/format";
import { Budget, Summary } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [name, setName] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState(0);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const [budgetData, summaryData] = await Promise.all([api.budgets(), api.summary(period)]);
      setBudgets(budgetData.budgets);
      setSummary(summaryData);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal memuat data budget.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [period]);

  function handleAmountChange(text: string) {
    const { display, raw } = parseRupiahInput(text);
    setDisplayAmount(display);
    setRawAmount(raw);
  }

  async function addBudget() {
    if (!name || !rawAmount) return;
    setAdding(true);
    try {
      await api.createBudget({
        name,
        amount: rawAmount,
        period,
        startsOn: new Date().toISOString().slice(0, 10),
      });
      setName("");
      setDisplayAmount("");
      setRawAmount(0);
      Alert.alert("Budget saved", "Budget baru sudah aktif.");
      load();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal menambahkan budget.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteBudget(id: string, budgetName: string) {
    Alert.alert(
      "Hapus Budget",
      `Apakah Anda yakin ingin menghapus budget "${budgetName}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.deleteBudget(id);
              Alert.alert("Sukses", "Budget berhasil dihapus.");
              load();
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Gagal menghapus budget.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  const usageByBudget = new Map(summary?.budgetUsage.map((item) => [item.budgetId, item]) ?? []);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={styles.title}>Budgets</Text>
        <Text style={styles.subtitle}>Bikin batas harian, mingguan, atau bulanan.</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Segmented value={period} options={["daily", "weekly", "monthly"]} onChange={setPeriod} />
          <Field label="Budget name" value={name} onChangeText={setName} placeholder="Makan Bulanan" />
          <Field
            label="Limit"
            value={displayAmount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder="1.500.000"
          />
          <Button label="Add Budget" onPress={addBudget} loading={adding} disabled={adding} />
        </View>
      </Card>

      {budgets.map((budget) => {
        const usage = usageByBudget.get(budget.id);
        const used = Number(usage?.used ?? 0);
        const limit = Number(budget.amount);
        const progress = Math.min(1, limit ? used / limit : 0);

        return (
          <Card key={budget.id}>
            <View style={styles.row}>
              <View>
                <Text style={styles.name}>{budget.name}</Text>
                <Text style={styles.meta}>{budget.period}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={styles.amount}>{rupiah(limit - used)}</Text>
                <TouchableOpacity onPress={() => handleDeleteBudget(budget.id, budget.name)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.meta}>
              Used {rupiah(used)} of {rupiah(limit)}
            </Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  name: { color: colors.ink, fontWeight: "900" },
  meta: { color: colors.muted, marginTop: 5, textTransform: "capitalize" },
  amount: { color: colors.teal, fontWeight: "900" },
  track: { height: 10, borderRadius: 5, backgroundColor: "#e2e8f0", overflow: "hidden", marginTop: 14 },
  fill: { height: "100%", backgroundColor: colors.teal },
  deleteBtn: { padding: 4 },
});
