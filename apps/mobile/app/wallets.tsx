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
          color: "#0f766e",
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
      <View>
        <Text style={styles.title}>Wallets</Text>
        <Text style={styles.subtitle}>Pisahkan cash, bank, e-wallet, dan tabungan.</Text>
      </View>

      <Card>
        <View style={styles.form}>
          <Text style={styles.formHeader}>
            {editingWallet ? `Edit Wallet: ${editingWallet.name}` : "Tambahkan Wallet Baru"}
          </Text>
          
          <Field 
            label="Wallet name" 
            value={name} 
            onChangeText={handleNameChange} 
            placeholder="BCA, Cash, GoPay" 
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          
          <Field
            label={editingWallet ? "Adjust balance" : "Starting balance"}
            value={displayBalance}
            onChangeText={handleBalanceChange}
            keyboardType="numeric"
            placeholder="0"
          />
          {balanceError ? <Text style={styles.errorText}>{balanceError}</Text> : null}
          
          <View style={styles.buttonRow}>
            {editingWallet && (
              <View style={{ flex: 1 }}>
                <Button label="Cancel" onPress={cancelEdit} tone="soft" disabled={adding} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button 
                label={editingWallet ? "Save Changes" : "Add Wallet"} 
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
          <Text style={styles.emptyText}>Belum ada wallet. Silakan tambahkan wallet baru di atas.</Text>
        </View>
      ) : (
        wallets.map((wallet) => (
          <Card key={wallet.id}>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: wallet.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{wallet.name}</Text>
                <Text style={styles.meta}>{wallet.type}</Text>
              </View>
              <Text style={styles.amount}>{rupiah(wallet.balance)}</Text>
              
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => startEditWallet(wallet)} style={styles.actionBtn}>
                  <Ionicons name="pencil-outline" size={18} color={colors.ink} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteWallet(wallet.id, wallet.name)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
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
  title: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, marginTop: 6 },
  form: { gap: 12 },
  formHeader: { color: colors.ink, fontWeight: "900", fontSize: 16, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { color: colors.ink, fontWeight: "900" },
  meta: { color: colors.muted, marginTop: 3, textTransform: "capitalize" },
  amount: { color: colors.ink, fontWeight: "900" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 8 },
  actionBtn: { padding: 6, borderRadius: 6, backgroundColor: "#f1f5f9" },
  deleteBtn: { padding: 6, borderRadius: 6, backgroundColor: "#fef2f2" },
  errorText: { color: colors.red, fontSize: 12, fontWeight: "700", marginTop: -6 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { color: colors.muted, fontWeight: "600", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
});
