import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { ErrorState, LoadingState, TopProgressBar } from "@/components/StateViews";
import { api } from "@/lib/api";
import { parseRupiahInput } from "@/lib/format";
import { Budget, Category, Wallet } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

export default function AddScreen() {
  const { colors, theme } = useTheme();
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
  const [loadingForm, setLoadingForm] = useState(true);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline Validation States
  const [amountError, setAmountError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [targetWalletError, setTargetWalletError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  async function fetchData() {
    setLoadingForm(true);
    setFormError("");
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
      setFormError(err.message || "Failed to load form data");
    } finally {
      setLoadingForm(false);
    }
  }

  useEffect(() => {
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
    if (saving) return;

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

  const getChipStyle = (isActive: boolean) => [
    styles.chip,
    {
      backgroundColor: isActive
        ? colors.blue
        : theme === "light"
          ? colors.panel
          : "#2c2c2e",
      borderColor: isActive ? colors.blue : colors.line,
    }
  ];

  const getChipTextStyle = (isActive: boolean) => [
    styles.chipText,
    {
      color: isActive ? "#ffffff" : colors.muted,
    }
  ];

  return (
    <Screen contentStyle={styles.scrollContent}>
      <TopProgressBar visible={saving} />
        <View>
          <Text style={[styles.title, { color: colors.ink }]}>Add Transaction</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Catat uang masuk, keluar, atau pindah dompet.</Text>
        </View>

        {formError ? (
          <ErrorState message={formError} onRetry={fetchData} />
        ) : loadingForm ? (
          <LoadingState title="Menyiapkan form transaksi" subtitle="Memuat wallet, kategori, dan budget kamu." />
        ) : (
          <>

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
          <Text style={[styles.section, { color: colors.ink }]}>Wallet Asal</Text>
          {walletError ? <Text style={[styles.sectionError, { color: colors.red }]}>{walletError}</Text> : null}
        </View>
        <View style={styles.chips}>
          {wallets.map((wallet) => (
            <Pressable key={wallet.id} hitSlop={4} onPress={() => handleWalletSelect(wallet.id)} style={getChipStyle(walletId === wallet.id)}>
              <Text numberOfLines={1} style={getChipTextStyle(walletId === wallet.id)}>{wallet.name}</Text>
            </Pressable>
          ))}
        </View>

        {type === "transfer" ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.section, { color: colors.ink }]}>Wallet Tujuan</Text>
              {targetWalletError ? <Text style={[styles.sectionError, { color: colors.red }]}>{targetWalletError}</Text> : null}
            </View>
            <View style={styles.chips}>
              {wallets
                .filter((wallet) => wallet.id !== walletId)
                .map((wallet) => (
                  <Pressable key={wallet.id} hitSlop={4} onPress={() => handleTargetWalletSelect(wallet.id)} style={getChipStyle(targetWalletId === wallet.id)}>
                    <Text numberOfLines={1} style={getChipTextStyle(targetWalletId === wallet.id)}>{wallet.name}</Text>
                  </Pressable>
                ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.section, { color: colors.ink }]}>Kategori</Text>
              {categoryError ? <Text style={[styles.sectionError, { color: colors.red }]}>{categoryError}</Text> : null}
            </View>
            <View style={styles.chips}>
              {categories
                .filter((category) => category.kind === type)
                .map((category) => (
                  <Pressable key={category.id} hitSlop={4} onPress={() => handleCategorySelect(category.id)} style={getChipStyle(categoryId === category.id)}>
                    <Text numberOfLines={1} style={getChipTextStyle(categoryId === category.id)}>{category.name}</Text>
                  </Pressable>
                ))}
            </View>
          </>
        )}

        {type === "expense" ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.section, { color: colors.ink }]}>Budget (Opsional)</Text>
            </View>
            <View style={styles.chips}>
              <Pressable hitSlop={4} onPress={() => setBudgetId("")} style={getChipStyle(!budgetId)}>
                <Text numberOfLines={1} style={getChipTextStyle(!budgetId)}>No budget</Text>
              </Pressable>
              {budgets.map((budget) => (
                <Pressable key={budget.id} hitSlop={4} onPress={() => setBudgetId(budget.id)} style={getChipStyle(budgetId === budget.id)}>
                  <Text numberOfLines={1} style={getChipTextStyle(budgetId === budget.id)}>{budget.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={{ marginTop: 14 }}>
          <Button label="Save Transaction" onPress={save} loading={saving} disabled={saving} />
        </View>
          </>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: 14 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: 0 },
  subtitle: { marginTop: 6, fontSize: 15, letterSpacing: 0, lineHeight: 21 },
  form: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10 },
  section: { fontWeight: "900", fontSize: 16, letterSpacing: 0 },
  sectionError: { flexShrink: 1, fontSize: 12, fontWeight: "700", textAlign: "right" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { minHeight: 42, maxWidth: "100%", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, borderWidth: 1, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "700", letterSpacing: 0 },
});
