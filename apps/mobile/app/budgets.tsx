import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { Budget, Summary } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  async function load() {
    const [budgetData, summaryData] = await Promise.all([api.budgets(), api.summary(period)]);
    setBudgets(budgetData.budgets);
    setSummary(summaryData);
  }

  useEffect(() => {
    load();
  }, [period]);

  async function addBudget() {
    if (!name || !amount) return;
    await api.createBudget({
      name,
      amount: Number(amount),
      period,
      startsOn: new Date().toISOString().slice(0, 10)
    });
    setName("");
    setAmount("");
    Alert.alert("Budget saved", "Budget baru sudah aktif.");
    load();
  }

  const usageByBudget = new Map(summary?.budgetUsage.map((item) => [item.budgetId, item]) ?? []);

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
          <Field label="Limit" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1500000" />
          <Button label="Add Budget" onPress={addBudget} />
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
              <Text style={styles.amount}>{rupiah(limit - used)}</Text>
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
  fill: { height: "100%", backgroundColor: colors.teal }
});
