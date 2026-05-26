import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { rupiah, shortDate } from "@/lib/format";
import { demoMode, supabase } from "@/lib/supabase";
import { Summary, Transaction, Wallet } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function HomeScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(demoMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const hasSession = demoMode || !!data.session;
      setSignedIn(hasSession);
      if (hasSession) load();
      else setLoading(false);
    });
  }, []);

  async function load() {
    setLoading(true);
    Promise.all([api.wallets(), api.transactions(), api.summary()])
      .then(([walletData, transactionData, summaryData]) => {
        setWallets(walletData.wallets);
        setTransactions(transactionData.transactions);
        setSummary(summaryData);
      })
      .finally(() => setLoading(false));
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert("Sign in failed", error.message);
      return;
    }
    setSignedIn(true);
    load();
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }
    Alert.alert("Account created", "Kalau Supabase meminta email confirmation, cek email dulu sebelum login.");
  }

  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (!signedIn) {
    return (
      <Screen>
        <View>
          <Text style={styles.eyebrow}>PocketFlow</Text>
          <Text style={styles.title}>Masuk dulu untuk sinkron data finance kamu.</Text>
        </View>
        <Card>
          <View style={styles.authForm}>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@email.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 6 karakter" />
            <Button label="Sign In" onPress={signIn} />
            <Button label="Create Account" tone="soft" onPress={signUp} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>PocketFlow</Text>
        <Text style={styles.title}>Uang kamu ada di mana, kelihatan jelas.</Text>
      </View>

      <Card>
        <Text style={styles.cardLabel}>Total Balance</Text>
        <Text style={styles.balance}>{rupiah(totalBalance)}</Text>
        <View style={styles.row}>
          <Text style={styles.good}>Income {rupiah(summary?.totals.income ?? 0)}</Text>
          <Text style={styles.bad}>Expense {rupiah(summary?.totals.expense ?? 0)}</Text>
        </View>
      </Card>

      <View style={styles.walletGrid}>
        {wallets.map((wallet) => (
          <View key={wallet.id} style={[styles.walletCard, { borderLeftColor: wallet.color }]}>
            <Text style={styles.walletName}>{wallet.name}</Text>
            <Text style={styles.walletBalance}>{rupiah(wallet.balance)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>Recent Transactions</Text>
      {transactions.map((transaction) => (
        <Card key={transaction.id}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.transactionNote}>{transaction.note || transaction.type}</Text>
              <Text style={styles.muted}>{shortDate(transaction.happenedAt)}</Text>
            </View>
            <Text style={transaction.type === "income" ? styles.goodAmount : styles.badAmount}>
              {transaction.type === "income" ? "+" : "-"}
              {rupiah(transaction.amount)}
            </Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.teal, fontWeight: "800", marginBottom: 8 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: "800" },
  cardLabel: { color: colors.muted, fontWeight: "700", marginBottom: 8 },
  balance: { color: colors.ink, fontSize: 32, fontWeight: "900", marginBottom: 14 },
  row: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  good: { color: colors.green, fontWeight: "800" },
  bad: { color: colors.red, fontWeight: "800" },
  goodAmount: { color: colors.green, fontWeight: "900" },
  badAmount: { color: colors.red, fontWeight: "900" },
  walletGrid: { gap: 10 },
  walletCard: { backgroundColor: "#fff", borderRadius: 8, padding: 14, borderLeftWidth: 5, borderColor: colors.line },
  walletName: { color: colors.muted, fontWeight: "700" },
  walletBalance: { color: colors.ink, fontSize: 20, fontWeight: "900", marginTop: 4 },
  section: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  transactionNote: { color: colors.ink, fontWeight: "800" },
  muted: { color: colors.muted, marginTop: 4 }
  ,
  authForm: { gap: 12 }
});
