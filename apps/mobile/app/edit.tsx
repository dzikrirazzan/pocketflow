import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
import { parseRupiahInput } from "@/lib/format";
import { Budget, Category, Wallet } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function EditScreen() {
  const router = useRouter();
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

  // Initialize display amount
  useEffect(() => {
    if (params.amount) {
      const { display, raw } = parseRupiahInput(Math.round(Number(params.amount)).toString());
      setDisplayAmount(display);
      setRawAmount(raw);
    }
  }, [params.amount]);

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
        
        if (!walletId && walletData.wallets.length > 0) {
          setWalletId(walletData.wallets[0].id);
        }
        if (!targetWalletId && walletData.wallets.length > 1) {
          setTargetWalletId(walletData.wallets[1].id);
        }
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to load form data");
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  // Auto-select first matching category when type changes, but ONLY if we switch type
  useEffect(() => {
    if (type === "transfer") return;
    const kind = type === "expense" ? "expense" : "income";
    
    // Only auto-select if current category is not matching new type
    const currentCat = categories.find(c => c.id === categoryId);
    if (!currentCat || currentCat.kind !== kind) {
      const firstMatch = categories.find((c) => c.kind === kind);
      setCategoryId(firstMatch?.id ?? "");
    }
  }, [type, categories]);

  function handleAmountChange(text: string) {
    const { display, raw } = parseRupiahInput(text);
    setDisplayAmount(display);
    setRawAmount(raw);
  }

  async function save() {
    if (!walletId) {
      Alert.alert("Error", "Pilih wallet dulu");
      return;
    }
    if (rawAmount <= 0) {
      Alert.alert("Error", "Masukkan jumlah yang valid");
      return;
    }

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

  return (
    <Screen>
      <View>
        <Text style={styles.title}>Edit Transaction</Text>
        <Text style={styles.subtitle}>Ubah detail transaksi kamu.</Text>
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
          />
          <Field label="Note" value={note} onChangeText={setNote} placeholder="Makan siang" />
        </View>
      </Card>

      <Text style={styles.section}>Wallet</Text>
      <View style={styles.chips}>
        {wallets.map((wallet) => (
          <Pressable key={wallet.id} onPress={() => setWalletId(wallet.id)} style={[styles.chip, walletId === wallet.id && styles.active]}>
            <Text style={[styles.chipText, walletId === wallet.id && styles.activeText]}>{wallet.name}</Text>
          </Pressable>
        ))}
      </View>

      {type === "transfer" ? (
        <>
          <Text style={styles.section}>Target Wallet</Text>
          <View style={styles.chips}>
            {wallets
              .filter((wallet) => wallet.id !== walletId)
              .map((wallet) => (
                <Pressable key={wallet.id} onPress={() => setTargetWalletId(wallet.id)} style={[styles.chip, targetWalletId === wallet.id && styles.active]}>
                  <Text style={[styles.chipText, targetWalletId === wallet.id && styles.activeText]}>{wallet.name}</Text>
                </Pressable>
              ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.section}>Category</Text>
          <View style={styles.chips}>
            {categories
              .filter((category) => category.kind === type)
              .map((category) => (
                <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.active]}>
                  <Text style={[styles.chipText, categoryId === category.id && styles.activeText]}>{category.name}</Text>
                </Pressable>
              ))}
          </View>
        </>
      )}

      {type === "expense" ? (
        <>
          <Text style={styles.section}>Budget optional</Text>
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

      <View style={styles.buttonRow}>
        <View style={{ flex: 1 }}>
          <Button label="Cancel" onPress={() => router.back()} tone="soft" disabled={saving} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Save Changes" onPress={save} loading={saving} disabled={saving} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  section: { color: colors.ink, fontWeight: "900", fontSize: 16, marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.line, justifyContent: "center", backgroundColor: "#fff" },
  active: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.muted, fontWeight: "800" },
  activeText: { color: "#fff" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 40 },
});
