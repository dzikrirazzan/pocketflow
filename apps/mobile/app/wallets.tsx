import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { api } from "@/lib/api";
import { rupiah, parseRupiahInput } from "@/lib/format";
import { Wallet } from "@/lib/types";
import { colors } from "@/theme/colors";

export default function WalletsScreen() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [name, setName] = useState("");
  const [displayBalance, setDisplayBalance] = useState("");
  const [rawBalance, setRawBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const data = await api.wallets();
      setWallets(data.wallets);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal memuat daftar wallet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleBalanceChange(text: string) {
    const { display, raw } = parseRupiahInput(text);
    setDisplayBalance(display);
    setRawBalance(raw);
  }

  async function addWallet() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await api.createWallet({
        name,
        type: "cash",
        balance: rawBalance,
        color: "#0f766e",
      });
      setName("");
      setDisplayBalance("");
      setRawBalance(0);
      Alert.alert("Wallet saved", "Dompet baru sudah siap dipakai.");
      load();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal menambahkan wallet.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteWallet(id: string, walletName: string) {
    Alert.alert(
      "Hapus Wallet",
      `Apakah Anda yakin ingin menghapus wallet "${walletName}"? Transaksi yang ada akan tetap disimpan dengan aman.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await api.deleteWallet(id);
              Alert.alert("Sukses", "Wallet berhasil dihapus.");
              load();
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Gagal menghapus wallet.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }

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
        <Text style={styles.title}>Wallets</Text>
        <Text style={styles.subtitle}>Pisahkan cash, bank, e-wallet, dan tabungan.</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Field label="Wallet name" value={name} onChangeText={setName} placeholder="BCA, Cash, GoPay" />
          <Field
            label="Starting balance"
            value={displayBalance}
            onChangeText={handleBalanceChange}
            keyboardType="numeric"
            placeholder="0"
          />
          <Button label="Add Wallet" onPress={addWallet} loading={adding} disabled={adding} />
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
            <TouchableOpacity onPress={() => handleDeleteWallet(wallet.id, wallet.name)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.red} />
            </TouchableOpacity>
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
  amount: { color: colors.ink, fontWeight: "900" },
  deleteBtn: { padding: 4, marginLeft: 8 },
});
