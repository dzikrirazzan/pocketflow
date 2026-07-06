import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { ErrorState, LoadingState, TopProgressBar } from "@/components/StateViews";
import { api } from "@/lib/api";
import { rupiah, parseRupiahInput } from "@/lib/format";
import { Budget, Summary } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function BudgetsScreen() {
  const { colors, theme } = useTheme();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [name, setName] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState(0);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  // Validation states
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");

  async function load(showInitial = false) {
    if (showInitial) setLoading(true);
    else setRefreshing(true);
    setLoadError("");

    try {
      const [budgetData, summaryData] = await Promise.all([
        api.budgets(),
        api.summary(period)]);
      setBudgets(budgetData.budgets);
      setSummary(summaryData);
    } catch (err: any) {
      setLoadError(err?.message ?? "Gagal memuat data budget.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(summary === null);
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
    if (adding) return;

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
      await load(false);
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
            if (deletingBudgetId) return;

            setDeletingBudgetId(id);
            try {
              await api.deleteBudget(id);
              Alert.alert("Sukses", "Budget berhasil dihapus.");
              await load(false);
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Gagal menghapus budget.");
            } finally {
              setDeletingBudgetId(null);
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.ink }]}>Budgets</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Bikin batas harian, mingguan, atau bulanan.</Text>
        </View>
        <LoadingState title="Memuat budget" subtitle="Menyiapkan limit dan progres pengeluaran terbaru." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Budgets</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Bikin batas harian, mingguan, atau bulanan.</Text>
      </View>

      <TopProgressBar visible={refreshing || adding || Boolean(deletingBudgetId)} />

      {loadError ? <ErrorState message={loadError} onRetry={() => load(false)} /> : null}

      <Card>
        <View style={styles.form}>
          <Text style={[styles.formHeader, { color: colors.ink }]}>
            {editingBudget ? `Edit Budget: ${editingBudget.name}` : "Buat Budget Baru"}
          </Text>

          <Segmented value={period} options={["daily", "weekly", "monthly"]} onChange={setPeriod} />
          
          <Field 
            label="Budget name" 
            value={name} 
            onChangeText={handleNameChange} 
            placeholder="Makan Bulanan" 
            error={nameError}
          />
          
          <Field
            label="Limit"
            value={displayAmount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            placeholder="1.500.000"
            error={amountError}
          />
          
          <View style={styles.buttonRow}>
            {editingBudget && (
              <View style={{ flex: 1 }}>
                <Button label="Batal" onPress={cancelEdit} tone="soft" disabled={adding} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button 
                label={editingBudget ? "Simpan Perubahan" : "Add Budget"} 
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
          <Ionicons name="pie-chart-outline" size={36} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Belum ada budget. Silakan tambahkan budget baru di atas.</Text>
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
                <View style={styles.budgetTextWrap}>
                  <Text numberOfLines={1} style={[styles.name, { color: colors.ink }]}>{budget.name}</Text>
                  <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>{budget.period}</Text>
                </View>
                <View style={styles.rightInfo}>
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.amount, { color: colors.teal }]}>
                    {isOverspent ? "Overspent " : "Remaining "}
                    {rupiah(Math.abs(limit - used))}
                  </Text>
                  
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      hitSlop={6}
                      disabled={Boolean(deletingBudgetId) || adding}
                      onPress={() => startEditBudget(budget)}
                      style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }]}
                    >
                      <Ionicons name="pencil-outline" size={15} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      hitSlop={6}
                      disabled={Boolean(deletingBudgetId) || adding}
                      onPress={() => handleDeleteBudget(budget.id, budget.name)}
                      style={[styles.deleteBtn, { backgroundColor: theme === "light" ? "#fef2f2" : "#3b1e1e" }]}
                    >
                      {deletingBudgetId === budget.id ? (
                        <ActivityIndicator size="small" color={colors.red} />
                      ) : (
                        <Ionicons name="trash-outline" size={15} color={colors.red} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={[styles.track, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }]}>
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
                <Text numberOfLines={1} style={[styles.meta, styles.footerMeta, { color: colors.muted }]}>
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
  header: { marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 4, letterSpacing: -0.1, lineHeight: 20 },
  form: { gap: 12 },
  formHeader: { fontWeight: "600", fontSize: 16, marginBottom: 4, letterSpacing: -0.1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  budgetTextWrap: { flex: 1, minWidth: 0 },
  name: { fontWeight: "600", fontSize: 16, letterSpacing: -0.1 },
  meta: { marginTop: 2, textTransform: "capitalize", fontSize: 12, fontWeight: "400" },
  amount: { fontWeight: "600", fontSize: 14, letterSpacing: -0.1, textAlign: "right" },
  rightInfo: { alignItems: "flex-end", gap: 8, maxWidth: "52%" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 14 },
  fill: { height: "100%" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontWeight: "500", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 6 },
  footerMeta: { flex: 1, minWidth: 0 },
  overspentWarning: { color: "#ff3b30", fontWeight: "700", fontSize: 12, letterSpacing: -0.1 },
  warningWarning: { color: "#d97706", fontWeight: "700", fontSize: 12, letterSpacing: -0.1 },
});
