import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { api } from "@/lib/api";
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
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    Promise.all([api.wallets(), api.categories(), api.budgets()]).then(([walletData, categoryData, budgetData]) => {
      setWallets(walletData.wallets);
      setCategories(categoryData.categories);
      setBudgets(budgetData.budgets);
      setWalletId(walletData.wallets[0]?.id ?? "");
      setTargetWalletId(walletData.wallets[1]?.id ?? "");
      setCategoryId(categoryData.categories[0]?.id ?? "");
      setBudgetId(budgetData.budgets[0]?.id ?? "");
    });
  }, []);

  async function save() {
    if (!walletId || !amount) return;
    await api.createTransaction({
      type,
      amount: Number(amount),
      walletId,
      targetWalletId: type === "transfer" ? targetWalletId : null,
      categoryId: type === "transfer" ? null : categoryId || null,
      budgetId: type === "expense" ? budgetId || null : null,
      note,
      happenedAt: new Date().toISOString()
    });
    setAmount("");
    setNote("");
    Alert.alert("Transaction saved", "Transaksi sudah masuk.");
  }

  return (
    <Screen>
      <View>
        <Text style={styles.title}>Add Transaction</Text>
        <Text style={styles.subtitle}>Catat uang masuk, keluar, atau pindah dompet.</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Segmented value={type} options={["expense", "income", "transfer"]} onChange={setType} />
          <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="50000" />
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

      <Button label="Save Transaction" onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  section: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.line, justifyContent: "center", backgroundColor: "#fff" },
  active: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.muted, fontWeight: "800" },
  activeText: { color: "#fff" }
});
