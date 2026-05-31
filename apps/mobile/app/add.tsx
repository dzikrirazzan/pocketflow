import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
import { parseRupiahInput } from "@/lib/format";
import { Budget, Category, Wallet } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function AddScreen() {
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [walletId, setWalletId] = useState("");
  const [targetWalletId, setTargetWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline Validation States
  const [amountError, setAmountError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [targetWalletError, setTargetWalletError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [walletData, categoryData, budgetData] = await Promise.all([
          api.wallets(),
          api.categories(),
          api.budgets(),
        ]);
        setWallets(walletData.wallets);
        setCategories(categoryData.categories);
        setBudgets(budgetData.budgets);
        
        setWalletId(walletData.wallets[0]?.id ?? "");
        setTargetWalletId(walletData.wallets[1]?.id ?? "");
        const firstExpenseCategory = categoryData.categories.find((c) => c.kind === "expense");
        setCategoryId(firstExpenseCategory?.id ?? "");
        setBudgetId("");
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load form data");
      }
    }
    fetchData();
  }, []);

  // Auto-select first matching category when type changes
  useEffect(() => {
    if (type === "transfer") return;
    const kind = type === "expense" ? "expense" : "income";
    const firstMatch = categories.find((c) => c.kind === kind);
    setCategoryId(firstMatch?.id ?? "");
    setCategoryError("");
  }, [type, categories]);

  function handleAmountChange(text: string) {
    const { display, raw } = parseRupiahInput(text);
    setDisplayAmount(display);
    setRawAmount(raw);
    if (amountError) setAmountError("");
  }

  function handleWalletSelect(id: string) {
    setWalletId(id);
    if (walletError) setWalletError("");
    if (type === "transfer" && id === targetWalletId) {
      setTargetWalletId(wallets.find(w => w.id !== id)?.id ?? "");
    }
  }

  function handleTargetWalletSelect(id: string) {
    setTargetWalletId(id);
    if (targetWalletError) setTargetWalletError("");
  }

  function handleCategorySelect(id: string) {
    setCategoryId(id);
    if (categoryError) setCategoryError("");
  }

  async function save() {
    let isValid = true;

    if (rawAmount <= 0) {
      setAmountError("Masukkan nominal transaksi yang valid (lebih dari Rp0).");
      isValid = false;
    }
    if (!walletId) {
      setWalletError("Silakan pilih dompet asal.");
      isValid = false;
    }
    if (type === "transfer" && !targetWalletId) {
      setTargetWalletError("Silakan pilih dompet tujuan transfer.");
      isValid = false;
    }
    if (type === "transfer" && walletId === targetWalletId) {
      setTargetWalletError("Dompet tujuan harus berbeda dengan dompet asal.");
      isValid = false;
    }
    if (type !== "transfer" && !categoryId) {
      setCategoryError("Silakan pilih kategori transaksi.");
      isValid = false;
    }

    if (!isValid) return;

    setSaving(true);
    try {
      await api.createTransaction({
        type,
        amount: rawAmount,
        walletId,
        targetWalletId: type === "transfer" ? targetWalletId : null,
        categoryId: type === "transfer" ? null : categoryId || null,
        budgetId: type === "expense" ? budgetId || null : null,
        note,
        happenedAt: new Date().toISOString(),
      });
      
      setDisplayAmount("");
      setRawAmount(0);
      setNote("");
      Alert.alert("Transaction saved", "Transaksi Anda telah berhasil dicatat.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View>
          <Text style={styles.title}>Add Transaction</Text>
          <Text style={styles.subtitle}>Catat uang masuk, keluar, atau pindah dompet.</Text>
        </View>

        <Card>
          <View style={styles.form}>
            <Segmented value={type} options={["expense", "income", "transfer"]} onChange={setType} />
            
            <Field
              label="Amount (Rp)"
              value={displayAmount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              error={amountError}
            />
            
            <Field label="Note" value={note} onChangeText={setNote} placeholder="Makan siang" />
          </View>
        </Card>

        {/* Wallet Selection */}
        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Wallet Asal</Text>
          {walletError ? <Text style={styles.sectionError}>{walletError}</Text> : null}
        </View>
        <View style={styles.chips}>
          {wallets.map((wallet) => (
            <Pressable key={wallet.id} onPress={() => handleWalletSelect(wallet.id)} style={[styles.chip, walletId === wallet.id && styles.active]}>
              <Text style={[styles.chipText, walletId === wallet.id && styles.activeText]}>{wallet.name}</Text>
            </Pressable>
          ))}
        </View>

        {type === "transfer" ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.section}>Wallet Tujuan</Text>
              {targetWalletError ? <Text style={styles.sectionError}>{targetWalletError}</Text> : null}
            </View>
            <View style={styles.chips}>
              {wallets
                .filter((wallet) => wallet.id !== walletId)
                .map((wallet) => (
                  <Pressable key={wallet.id} onPress={() => handleTargetWalletSelect(wallet.id)} style={[styles.chip, targetWalletId === wallet.id && styles.active]}>
                    <Text style={[styles.chipText, targetWalletId === wallet.id && styles.activeText]}>{wallet.name}</Text>
                  </Pressable>
                ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.section}>Kategori</Text>
              {categoryError ? <Text style={styles.sectionError}>{categoryError}</Text> : null}
            </View>
            <View style={styles.chips}>
              {categories
                .filter((category) => category.kind === type)
                .map((category) => (
                  <Pressable key={category.id} onPress={() => handleCategorySelect(category.id)} style={[styles.chip, categoryId === category.id && styles.active]}>
                    <Text style={[styles.chipText, categoryId === category.id && styles.activeText]}>{category.name}</Text>
                  </Pressable>
                ))}
            </View>
          </>
        )}

        {type === "expense" ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.section}>Budget (Opsional)</Text>
            </View>
            <View style={styles.chips}>
              <Pressable onPress={() => setBudgetId("")} style={[styles.chip, !budgetId && styles.active]}>
                <Text style={[styles.chipText, !budgetId && styles.activeText]}>No budget</Text>
              </Pressable>
              {budgets.map((budget) => (
                <Pressable key={budget.id} onPress={() => setBudgetId(budget.id)} style={[styles.chip, budgetId === budget.id && styles.active]}>
                  <Text style={[styles.chipText, budgetId === budget.id && styles.activeText]}>{budget.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ marginTop: 14 }}>
          <Button label="Save Transaction" onPress={save} loading={saving} disabled={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContainer: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  section: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  sectionError: { color: colors.red, fontSize: 12, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.line, justifyContent: "center", backgroundColor: "#fff" },
  active: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.muted, fontWeight: "800" },
  activeText: { color: "#fff" },
});
