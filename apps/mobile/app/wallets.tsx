import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState, TopProgressBar } from "@/components/StateViews";
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
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);

  // Form validation errors
  const [nameError, setNameError] = useState("");
  const [balanceError, setBalanceError] = useState("");

  async function load(showInitial = false) {
    if (showInitial) setLoading(true);
    else setRefreshing(true);
    setLoadError("");

    try {
      const data = await api.wallets();
      setWallets(data.wallets);
    } catch (err: any) {
      setLoadError(err?.message ?? "Gagal memuat daftar wallet.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
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
    if (adding) return;

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
      await load(false);
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
            if (deletingWalletId) return;

            setDeletingWalletId(id);
            try {
              await api.deleteWallet(id);
              Alert.alert("Sukses", "Wallet berhasil dihapus.");
              await load(false);
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Gagal menghapus wallet.");
            } finally {
              setDeletingWalletId(null);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.ink }]}>Wallets</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Pisahkan cash, bank, e-wallet, dan tabungan.</Text>
        </View>
        <LoadingState title="Memuat wallet" subtitle="Menyiapkan daftar dompet dan saldo terbaru." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Wallets</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Pisahkan cash, bank, e-wallet, dan tabungan.</Text>
      </View>

      <TopProgressBar visible={refreshing || adding || Boolean(deletingWalletId)} />

      {loadError ? <ErrorState message={loadError} onRetry={() => load(false)} /> : null}

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
              <View style={styles.walletTextWrap}>
                <Text numberOfLines={1} style={[styles.name, { color: colors.ink }]}>{wallet.name}</Text>
                <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>{wallet.type}</Text>
              </View>
              <View style={styles.walletRightWrap}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.amount, { color: colors.ink }]}>
                  {rupiah(wallet.balance)}
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    hitSlop={6}
                    disabled={Boolean(deletingWalletId) || adding}
                    onPress={() => startEditWallet(wallet)}
                    style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#f1f5f9" : "#2c2c2e" }]}
                  >
                    <Ionicons name="pencil-outline" size={17} color={colors.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    hitSlop={6}
                    disabled={Boolean(deletingWalletId) || adding}
                    onPress={() => handleDeleteWallet(wallet.id, wallet.name)}
                    style={[styles.deleteBtn, { backgroundColor: theme === "light" ? "#fef2f2" : "#3b1e1e" }]}
                  >
                    {deletingWalletId === wallet.id ? (
                      <ActivityIndicator size="small" color={colors.red} />
                    ) : (
                      <Ionicons name="trash-outline" size={17} color={colors.red} />
                    )}
                  </TouchableOpacity>
                </View>
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
  title: { fontSize: 32, fontWeight: "800", letterSpacing: 0 },
  subtitle: { fontSize: 16, marginTop: 4, letterSpacing: 0, lineHeight: 22 },
  form: { gap: 12 },
  formHeader: { fontWeight: "800", fontSize: 16, marginBottom: 4, letterSpacing: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletTextWrap: { flex: 1, minWidth: 0 },
  walletRightWrap: { alignItems: "flex-end", gap: 8, maxWidth: "48%" },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontWeight: "700", fontSize: 16, letterSpacing: 0 },
  meta: { marginTop: 3, textTransform: "capitalize", fontSize: 12, fontWeight: "500" },
  amount: { fontWeight: "800", fontSize: 16, letterSpacing: 0, textAlign: "right" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontWeight: "600", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
});
