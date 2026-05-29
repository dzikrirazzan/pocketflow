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
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Validation states
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");

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
    if (amountError) setAmountError("");
  }

  function handleNameChange(text: string) {
    setName(text);
    if (nameError) setNameError("");
  }

  function startEditBudget(budget: Budget) {
    setEditingBudget(budget);
    setName(budget.name);
    setPeriod(budget.period);
    const { display, raw } = parseRupiahInput(Math.round(Number(budget.amount)).toString());
    setDisplayAmount(display);
    setRawAmount(raw);
    setNameError("");
    setAmountError("");
  }

  function cancelEdit() {
    setEditingBudget(null);
    setName("");
    setDisplayAmount("");
    setRawAmount(0);
    setNameError("");
    setAmountError("");
  }

  async function saveBudget() {
    let isValid = true;
    if (!name.trim()) {
      setNameError("Nama budget wajib diisi.");
      isValid = false;
    }
    if (rawAmount <= 0) {
      setAmountError("Batas budget harus lebih besar dari Rp0.");
      isValid = false;
    }

    if (!isValid) return;

    setAdding(true);
    try {
      if (editingBudget) {
        await api.updateBudget(editingBudget.id, {
          name,
          amount: rawAmount,
          period,
          startsOn: new Date().toISOString().slice(0, 10),
        });
        Alert.alert("Budget updated", "Budget berhasil diperbarui.");
        setEditingBudget(null);
      } else {
        await api.createBudget({
          name,
          amount: rawAmount,
          period,
          startsOn: new Date().toISOString().slice(0, 10),
        });
        Alert.alert("Budget saved", "Budget baru sudah aktif.");
      }
      setName("");
      setDisplayAmount("");
      setRawAmount(0);
      load();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal menyimpan budget.");
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
          <Text style={styles.formHeader}>
            {editingBudget ? `Edit Budget: ${editingBudget.name}` : "Buat Budget Baru"}
          </Text>

          <Segmented value={period} options={["daily", "weekly", "monthly"]} onChange={setPeriod} />
          
          <Field 
            label="Budget name" 
            value={name} 
            onChangeText={handleNameChange} 
            placeholder="Makan Bulanan" 
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          
          <Field
            label="Limit"
            value={displayAmount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder="1.500.000"
          />
          {amountError ? <Text style={styles.errorText}>{amountError}</Text> : null}
          
          <View style={styles.buttonRow}>
            {editingBudget && (
              <View style={{ flex: 1 }}>
                <Button label="Cancel" onPress={cancelEdit} tone="soft" disabled={adding} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button 
                label={editingBudget ? "Save Changes" : "Add Budget"} 
                onPress={saveBudget} 
                loading={adding} 
                disabled={adding} 
              />
            </View>
          </View>
        </View>
      </Card>

      {budgets.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="pie-chart-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>Belum ada budget. Silakan tambahkan budget baru di atas.</Text>
        </View>
      ) : (
        budgets.map((budget) => {
          const usage = usageByBudget.get(budget.id);
          const used = Number(usage?.used ?? 0);
          const limit = Number(budget.amount);
          const progress = Math.min(1, limit ? used / limit : 0);
          const isOverspent = used > limit;
          const isWarning = !isOverspent && progress > 0.8;

          return (
            <Card key={budget.id}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{budget.name}</Text>
                  <Text style={styles.meta}>{budget.period}</Text>
                </View>
                <View style={styles.rightInfo}>
                  <Text style={styles.amount}>
                    {isOverspent ? "Overspent " : "Remaining "}
                    {rupiah(Math.abs(limit - used))}
                  </Text>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => startEditBudget(budget)} style={styles.actionBtn}>
                      <Ionicons name="pencil-outline" size={18} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteBudget(budget.id, budget.name)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.track}>
                <View 
                  style={[
                    styles.fill, 
                    { 
                      width: `${progress * 100}%`,
                      backgroundColor: isOverspent ? colors.red : isWarning ? "#eab308" : colors.teal
                    }
                  ]} 
                />
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.meta}>
                  Used {rupiah(used)} of {rupiah(limit)}
                </Text>
                {isOverspent ? (
                  <Text style={styles.overspentWarning}>Melebihi Batas!</Text>
                ) : isWarning ? (
                  <Text style={styles.warningWarning}>Hampir Penuh!</Text>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  formHeader: { color: colors.ink, fontWeight: "900", fontSize: 16, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  name: { color: colors.ink, fontWeight: "900" },
  meta: { color: colors.muted, marginTop: 5, textTransform: "capitalize" },
  amount: { color: colors.teal, fontWeight: "900" },
  rightInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn: { padding: 6, borderRadius: 6, backgroundColor: "#f1f5f9" },
  deleteBtn: { padding: 6, borderRadius: 6, backgroundColor: "#fef2f2" },
  track: { height: 10, borderRadius: 5, backgroundColor: "#e2e8f0", overflow: "hidden", marginTop: 14 },
  fill: { height: "100%" },
  errorText: { color: colors.red, fontSize: 12, fontWeight: "700", marginTop: -6 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.muted, fontWeight: "600", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  overspentWarning: { color: colors.red, fontWeight: "800", fontSize: 12 },
  warningWarning: { color: "#d97706", fontWeight: "800", fontSize: 12 },
});
