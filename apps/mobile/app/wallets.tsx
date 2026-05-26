import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { Wallet } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function WalletsScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");

  async function load() {
    const data = await api.wallets();
    setWallets(data.wallets);
  }

  useEffect(() => {
    load();
  }, []);

  async function addWallet() {
    if (!name.trim()) return;
    await api.createWallet({ name, type: "cash", balance: Number(balance || 0), color: "#0f766e" });
    setName("");
    setBalance("");
    Alert.alert("Wallet saved", "Dompet baru sudah siap dipakai.");
    load();
  }

  return (
    <Screen>
      <View>
        <Text style={styles.title}>Wallets</Text>
        <Text style={styles.subtitle}>Pisahkan cash, bank, e-wallet, dan tabungan.</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Field label="Wallet name" value={name} onChangeText={setName} placeholder="BCA, Cash, GoPay" />
          <Field label="Starting balance" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholder="0" />
          <Button label="Add Wallet" onPress={addWallet} />
        </View>
      </Card>

      {wallets.map((wallet) => (
        <Card key={wallet.id}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: wallet.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{wallet.name}</Text>
              <Text style={styles.meta}>{wallet.type}</Text>
            </View>
            <Text style={styles.amount}>{rupiah(wallet.balance)}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { color: colors.ink, fontWeight: "900" },
  meta: { color: colors.muted, marginTop: 3, textTransform: "capitalize" },
  amount: { color: colors.ink, fontWeight: "900" }
});
