import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function EditScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const params = useLocalSearchParams<{
    id: string;
    type: "expense" | "income" | "transfer";
    amount: string;
    note: string;
    walletId: string;
    targetWalletId: string;
    categoryId: string;
    budgetId: string;
    happenedAt: string;
  }>();

  const [type, setType] = useState<"expense" | "income" | "transfer">(params.type || "expense");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [walletId, setWalletId] = useState(params.walletId || "");
  const [targetWalletId, setTargetWalletId] = useState(params.targetWalletId || "");
  const [categoryId, setCategoryId] = useState(params.categoryId || "");
  const [budgetId, setBudgetId] = useState(params.budgetId || "");
  
  // Format initial amount
  const initialAmountVal = params.amount ? Math.round(Number(params.amount)) : 0;
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState(initialAmountVal);
  const [note, setNote] = useState(params.note || "");
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formError, setFormError] = useState("");

  // Inline Validation States
  const [amountError, setAmountError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [targetWalletError, setTargetWalletError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // Initialize display amount
  useEffect(() => {
    if (params.amount) {
      const { display, raw } = parseRupiahInput(Math.round(Number(params.amount)).toString());
      setDisplayAmount(display);
      setRawAmount(raw);
    }
  }, [params.amount]);

  async function fetchData() {
    setLoadingData(true);
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

      if (!walletId && walletData.wallets.length > 0) {
        setWalletId(walletData.wallets[0].id);
      }
      if (!targetWalletId && walletData.wallets.length > 1) {
        setTargetWalletId(walletData.wallets[1].id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to load form data");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-select first matching category when type changes, but ONLY if we switch type
  useEffect(() => {
    if (type === "transfer") return;
    const kind = type === "expense" ? "expense" : "income";
    
    const currentCat = categories.find(c => c.id === categoryId);
    if (!currentCat || currentCat.kind !== kind) {
      const firstMatch = categories.find((c) => c.kind === kind);
      setCategoryId(firstMatch?.id ?? "");
    }
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
      await api.updateTransaction(params.id, {
        type,
        amount: rawAmount,
        walletId,
        targetWalletId: type === "transfer" ? targetWalletId : null,
        categoryId: type === "transfer" ? null : categoryId || null,
        budgetId: type === "expense" ? budgetId || null : null,
        note,
        happenedAt: params.happenedAt || new Date().toISOString(),
      });
      
      Alert.alert("Transaction updated", "Transaksi berhasil diperbarui.", [
        { text: "OK", onPress: () => router.replace("/") }
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Gagal memperbarui transaksi");
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
          <Text style={[styles.title, { color: colors.ink }]}>Edit Transaction</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Ubah detail transaksi kamu.</Text>
        </View>

        {formError ? (
          <ErrorState message={formError} onRetry={fetchData} />
        ) : loadingData ? (
          <LoadingState title="Menyiapkan data transaksi" subtitle="Memuat wallet, kategori, dan budget terbaru." />
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

        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}>
            <Button label="Cancel" onPress={() => router.back()} tone="soft" disabled={saving} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Save Changes" onPress={save} loading={saving} disabled={saving} />
          </View>
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
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 20 },
});
