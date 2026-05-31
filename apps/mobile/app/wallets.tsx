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
import { useTheme } from "@/contexts/ThemeContext";

export default function WalletsScreen() {
  const { colors, theme } = useTheme();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [name, setName] = useState("");
  const [displayBalance, setDisplayBalance] = useState("");
  const [rawBalance, setRawBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Form validation errors
  const [nameError, setNameError] = useState("");
  const [balanceError, setBalanceError] = useState("");

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
    if (balanceError) setBalanceError("");
  }

  function handleNameChange(text: string) {
    setName(text);
    if (nameError) setNameError("");
  }

  function startEditWallet(wallet: Wallet) {
    setEditingWallet(wallet);
    setName(wallet.name);
    const { display, raw } = parseRupiahInput(Math.round(Number(wallet.balance)).toString());
    setDisplayBalance(display);
    setRawBalance(raw);
    setNameError("");
    setBalanceError("");
  }

  function cancelEdit() {
    setEditingWallet(null);
    setName("");
    setDisplayBalance("");
    setRawBalance(0);
    setNameError("");
    setBalanceError("");
  }

  async function saveWallet() {
    let isValid = true;
    if (!name.trim()) {
      setNameError("Nama wallet wajib diisi.");
      isValid = false;
    }
    if (isNaN(rawBalance)) {
      setBalanceError("Saldo harus berupa angka valid.");
      isValid = false;
    }

    if (!isValid) return;

    setAdding(true);
    try {
      if (editingWallet) {
        await api.updateWallet(editingWallet.id, {
          name,
          balance: rawBalance,
          type: editingWallet.type,
          color: editingWallet.color,
        });
        Alert.alert("Wallet updated", "Wallet berhasil diperbarui.");
        setEditingWallet(null);
      } else {
        await api.createWallet({
          name,
          type: "cash",
          balance: rawBalance,
          color: "#007aff",
        });
        Alert.alert("Wallet saved", "Dompet baru sudah siap dipakai.");
      }
      setName("");
      setDisplayBalance("");
      setRawBalance(0);
      load();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Gagal menyimpan wallet.");
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Wallets</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Pisahkan cash, bank, e-wallet, dan tabungan.</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Text style={[styles.formHeader, { color: colors.ink }]}>
            {editingWallet ? `Edit Wallet: ${editingWallet.name}` : "Tambahkan Wallet Baru"}
          </Text>
          
          <Field 
            label="Wallet name" 
            value={name} 
            onChangeText={handleNameChange} 
            placeholder="BCA, Cash, GoPay" 
            error={nameError}
          />
          
          <Field
            label={editingWallet ? "Adjust balance" : "Starting balance"}
            value={displayBalance}
            onChangeText={handleBalanceChange}
            keyboardType="numeric"
            placeholder="0"
            error={balanceError}
          />
          
          <View style={styles.buttonRow}>
            {editingWallet && (
              <View style={{ flex: 1 }}>
                <Button label="Batal" onPress={cancelEdit} tone="soft" disabled={adding} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button 
                label={editingWallet ? "Simpan Perubahan" : "Add Wallet"} 
                onPress={saveWallet} 
                loading={adding} 
                disabled={adding} 
              />
            </View>
          </View>
        </View>
      </Card>

      {wallets.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="wallet-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Belum ada wallet. Silakan tambahkan wallet baru di atas.</Text>
        </View>
      ) : (
        wallets.map((wallet) => (
          <Card key={wallet.id}>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: wallet.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.ink }]}>{wallet.name}</Text>
                <Text style={[styles.meta, { color: colors.muted }]}>{wallet.type}</Text>
              </View>
              <Text style={[styles.amount, { color: colors.ink }]}>{rupiah(wallet.balance)}</Text>
              
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => startEditWallet(wallet)} style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#f1f5f9" : "#2c2c2e" }]}>
                  <Ionicons name="pencil-outline" size={16} color={colors.ink} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteWallet(wallet.id, wallet.name)} style={[styles.deleteBtn, { backgroundColor: theme === "light" ? "#fef2f2" : "#3b1e1e" }]}>
                  <Ionicons name="trash-outline" size={16} color={colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 4 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { fontSize: 16, marginTop: 4, letterSpacing: -0.24 },
  form: { gap: 12 },
  formHeader: { fontWeight: "800", fontSize: 16, marginBottom: 4, letterSpacing: -0.15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontWeight: "700", fontSize: 16, letterSpacing: -0.2 },
  meta: { marginTop: 3, textTransform: "capitalize", fontSize: 12, fontWeight: "500" },
  amount: { fontWeight: "800", fontSize: 16, letterSpacing: -0.2 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 8 },
  actionBtn: { padding: 6, borderRadius: 6 },
  deleteBtn: { padding: 6, borderRadius: 6 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontWeight: "600", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
});
