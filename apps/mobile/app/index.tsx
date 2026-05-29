import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Segmented } from "@/components/Segmented";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import { rupiah, shortDate } from "@/lib/format";
import { Summary, Transaction, Wallet } from "@/lib/types";
import { colors } from "@/theme/colors";

type ChartBucket = { label: string; income: number; expense: number };

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Date period filters
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Interactive Chart Tooltip State
  const [selectedBar, setSelectedBar] = useState<(ChartBucket & { index: number }) | null>(null);

  // Advanced Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [filterWalletId, setFilterWalletId] = useState<"all" | string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  useEffect(() => {
    load(period, startDate, endDate, true);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      load(period, startDate, endDate, false);
    });
    return unsubscribe;
  }, [navigation, period, startDate, endDate]);

  async function load(
    currentPeriod = period,
    start = startDate,
    end = endDate,
    isInitial = false
  ) {
    if (isInitial) setLoading(true);
    else setLoadingData(true);

    try {
      const opts = currentPeriod === "custom"
        ? { period: "custom", startDate: start, endDate: end }
        : { period: currentPeriod };

      const [walletData, transactionData, summaryData] = await Promise.all([
        api.wallets(),
        api.transactions(opts),
        api.summary(opts),
      ]);
      setWallets(walletData.wallets);
      setTransactions(transactionData.transactions);
      setSummary(summaryData);
      
      setSelectedBar(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setLoadingData(false);
    }
  }

  function handlePeriodChange(newPeriod: typeof period) {
    setPeriod(newPeriod);
    load(newPeriod, startDate, endDate, false);
  }

  function handleApplyCustomRange() {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(startDate) || !regex.test(endDate)) {
      Alert.alert("Validasi Gagal", "Format tanggal harus YYYY-MM-DD");
      return;
    }
    load("custom", startDate, endDate, false);
  }

  async function handleDeleteTransaction(id: string, noteText: string) {
    Alert.alert(
      "Hapus Transaksi",
      `Apakah Anda yakin ingin menghapus transaksi "${noteText || "Tanpa Catatan"}"? Saldo dompet akan disesuaikan otomatis.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            setLoadingData(true);
            try {
              await api.deleteTransaction(id);
              Alert.alert("Sukses", "Transaksi berhasil dihapus.");
              load(period, startDate, endDate, false);
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Gagal menghapus transaksi.");
            } finally {
              setLoadingData(false);
            }
          }
        }
      ]
    );
  }

  function handleEditTransaction(transaction: Transaction) {
    router.push({
      pathname: "/edit" as any,
      params: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        note: transaction.note || "",
        walletId: transaction.walletId || "",
        targetWalletId: transaction.targetWalletId || "",
        categoryId: transaction.categoryId || "",
        budgetId: transaction.budgetId || "",
        happenedAt: transaction.happenedAt
      }
    });
  }

  // Calculate total balance
  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);

  // Group transactions for bar chart
  const chartBuckets: ChartBucket[] = (() => {
    const buckets: ChartBucket[] = [];
    if (period === "daily") {
      const labels = ["00-06", "06-12", "12-18", "18-24"];
      labels.forEach(l => buckets.push({ label: l, income: 0, expense: 0 }));
      transactions.forEach((t) => {
        const date = new Date(t.happenedAt);
        const hour = date.getHours();
        const idx = Math.floor(hour / 6);
        if (idx >= 0 && idx < 4) {
          const amt = Number(t.amount);
          if (t.type === "income") buckets[idx].income += amt;
          else if (t.type === "expense") buckets[idx].expense += amt;
        }
      });
    } else if (period === "weekly") {
      const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
      labels.forEach(l => buckets.push({ label: l, income: 0, expense: 0 }));
      transactions.forEach((t) => {
        const date = new Date(t.happenedAt);
        let day = date.getDay() - 1; // 0=Mon, 6=Sun
        if (day === -1) day = 6;
        if (day >= 0 && day < 7) {
          const amt = Number(t.amount);
          if (t.type === "income") buckets[day].income += amt;
          else if (t.type === "expense") buckets[day].expense += amt;
        }
      });
    } else if (period === "yearly") {
      const labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      labels.forEach(l => buckets.push({ label: l, income: 0, expense: 0 }));
      transactions.forEach((t) => {
        const date = new Date(t.happenedAt);
        const month = date.getMonth();
        if (month >= 0 && month < 12) {
          const amt = Number(t.amount);
          if (t.type === "income") buckets[month].income += amt;
          else if (t.type === "expense") buckets[month].expense += amt;
        }
      });
    } else if (period === "custom") {
      const labels = ["Bag 1", "Bag 2", "Bag 3", "Bag 4", "Bag 5"];
      labels.forEach(l => buckets.push({ label: l, income: 0, expense: 0 }));
      if (transactions.length > 0) {
        const dates = transactions.map(t => new Date(t.happenedAt).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const diff = maxDate - minDate || 1;
        transactions.forEach((t) => {
          const date = new Date(t.happenedAt).getTime();
          let idx = Math.floor(((date - minDate) / diff) * 5);
          if (idx >= 5) idx = 4;
          if (idx >= 0 && idx < 5) {
            const amt = Number(t.amount);
            if (t.type === "income") buckets[idx].income += amt;
            else if (t.type === "expense") buckets[idx].expense += amt;
          }
        });
      }
    } else {
      // Monthly
      const labels = ["Mng 1", "Mng 2", "Mng 3", "Mng 4"];
      labels.forEach(l => buckets.push({ label: l, income: 0, expense: 0 }));
      transactions.forEach((t) => {
        const date = new Date(t.happenedAt);
        const dayOfMonth = date.getDate();
        let idx = Math.floor((dayOfMonth - 1) / 7.75);
        if (idx >= 4) idx = 3;
        if (idx >= 0 && idx < 4) {
          const amt = Number(t.amount);
          if (t.type === "income") buckets[idx].income += amt;
          else if (t.type === "expense") buckets[idx].expense += amt;
        }
      });
    }
    return buckets;
  })();

  const chartMaxVal = Math.max(...chartBuckets.map(b => Math.max(b.income, b.expense)), 1);

  // Apply Real-time Searching, Filtering and Sorting
  const filteredAndSortedTransactions = transactions
    .filter((tx) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const noteMatch = (tx.note || "").toLowerCase().includes(q);
        const typeMatch = tx.type.toLowerCase().includes(q);
        const walletName = wallets.find(w => w.id === tx.walletId)?.name || "";
        const walletMatch = walletName.toLowerCase().includes(q);
        const catName = tx.categoryId
          ? summary?.byCategory.find((c) => c.categoryId === tx.categoryId)?.categoryName || ""
          : "";
        const catMatch = catName.toLowerCase().includes(q);

        if (!noteMatch && !typeMatch && !walletMatch && !catMatch) {
          return false;
        }
      }

      // 2. Type Filter
      if (filterType !== "all" && tx.type !== filterType) {
        return false;
      }

      // 3. Wallet Filter
      if (filterWalletId !== "all" && tx.walletId !== filterWalletId) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.happenedAt).getTime() - new Date(b.happenedAt).getTime();
      }
      if (sortOrder === "highest") {
        return Number(b.amount) - Number(a.amount);
      }
      if (sortOrder === "lowest") {
        return Number(a.amount) - Number(b.amount);
      }
      return 0;
    });

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
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

      <View style={styles.filterSection}>
        <Segmented
          value={period}
          options={["daily", "weekly", "monthly", "yearly", "custom"]}
          onChange={handlePeriodChange}
        />
        {period === "custom" && (
          <View style={styles.customRangeWrap}>
            <View style={styles.customDateFields}>
              <View style={{ flex: 1 }}>
                <Field label="Mulai (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-05-01" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Selesai (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-05-30" />
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <Button label="Terapkan Filter" onPress={handleApplyCustomRange} />
            </View>
          </View>
        )}
      </View>

      {loadingData && (
        <ActivityIndicator size="small" color={colors.teal} style={{ marginVertical: 14 }} />
      )}

      {/* Interactive Financial Bar Chart */}
      <Text style={styles.sectionTitle}>Income vs Expense Chart</Text>
      <Card>
        {transactions.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Belum ada transaksi di periode ini.</Text>
          </View>
        ) : (
          <View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
                <Text style={styles.legendLabel}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
                <Text style={styles.legendLabel}>Expense</Text>
              </View>
            </View>

            <View style={styles.chartArea}>
              {chartBuckets.map((bucket, idx) => {
                const incHeight = (bucket.income / chartMaxVal) * 90;
                const expHeight = (bucket.expense / chartMaxVal) * 90;
                const isSelected = selectedBar?.index === idx;

                return (
                  <View key={idx} style={styles.chartCol}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setSelectedBar(isSelected ? null : { ...bucket, index: idx })}
                      style={[styles.barClickArea, isSelected && styles.selectedColBackground]}
                    >
                      <View style={styles.barPair}>
                        <View style={[styles.barInc, { height: `${incHeight + 2}%` }]} />
                        <View style={[styles.barExp, { height: `${expHeight + 2}%` }]} />
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.barLabel}>{bucket.label}</Text>
                  </View>
                );
              })}
            </View>

            {selectedBar && (
              <View style={styles.chartTooltip}>
                <Text style={styles.tooltipTitle}>Detail {selectedBar.label}:</Text>
                <Text style={styles.goodText}>Income: {rupiah(selectedBar.income)}</Text>
                <Text style={styles.badText}>Expense: {rupiah(selectedBar.expense)}</Text>
                <Text style={styles.netText}>
                  Net: {rupiah(selectedBar.income - selectedBar.expense)}
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Expense by Category Progress Chart */}
      <Text style={styles.sectionTitle}>Expense by Category</Text>
      <Card>
        {!summary || summary.byCategory.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Tidak ada pengeluaran kategori.</Text>
          </View>
        ) : (
          <View style={styles.categoriesArea}>
            {summary.byCategory.map((cat, idx) => {
              const catTotal = Number(cat.total);
              const totalExp = summary.totals.expense || 1;
              const pct = Math.round((catTotal / totalExp) * 100);
              return (
                <View key={idx} style={styles.categoryRow}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryTitleWrap}>
                      <View style={[styles.categoryDot, { backgroundColor: cat.color || colors.muted }]} />
                      <Text style={styles.categoryName}>{cat.categoryName || "Uncategorized"}</Text>
                    </View>
                    <Text style={styles.categoryAmount}>{rupiah(catTotal)} ({pct}%)</Text>
                  </View>
                  <View style={styles.categoryProgressTrack}>
                    <View
                      style={[
                        styles.categoryProgressBar,
                        { width: `${pct}%`, backgroundColor: cat.color || colors.teal }
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* My Wallets Breakdown */}
      <Text style={styles.sectionTitle}>My Wallets</Text>
      <View style={styles.walletGrid}>
        {wallets.length === 0 ? (
          <Text style={styles.emptyText}>Belum ada wallet. Silakan buat di menu Wallet.</Text>
        ) : (
          wallets.map((wallet) => (
            <View key={wallet.id} style={[styles.walletCard, { borderLeftColor: wallet.color }]}>
              <Text style={styles.walletName}>{wallet.name}</Text>
              <Text style={styles.walletBalance}>{rupiah(wallet.balance)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Advanced Transaction List Header with Search, Filter & Sort */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Text style={styles.badgeCount}>
          {filteredAndSortedTransactions.length} items
        </Text>
      </View>

      <Card>
        <View style={styles.searchFilterWrap}>
          {/* Search Box */}
          <Field
            label=""
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari catatan, wallet, kategori..."
          />

          {/* Type Filter Row */}
          <Text style={styles.subFilterLabel}>Tipe Transaksi:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {(["all", "income", "expense", "transfer"] as const).map((typeOpt) => (
              <TouchableOpacity
                key={typeOpt}
                onPress={() => setFilterType(typeOpt)}
                style={[styles.pill, filterType === typeOpt && styles.pillActive]}
              >
                <Text style={[styles.pillText, filterType === typeOpt && styles.pillTextActive]}>
                  {typeOpt === "all" ? "Semua Tipe" : typeOpt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Wallet Filter Row */}
          <Text style={styles.subFilterLabel}>Pilih Wallet:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              onPress={() => setFilterWalletId("all")}
              style={[styles.pill, filterWalletId === "all" && styles.pillActive]}
            >
              <Text style={[styles.pillText, filterWalletId === "all" && styles.pillTextActive]}>
                Semua Dompet
              </Text>
            </TouchableOpacity>
            {wallets.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => setFilterWalletId(w.id)}
                style={[styles.pill, filterWalletId === w.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, filterWalletId === w.id && styles.pillTextActive]}>
                  {w.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sorting Row */}
          <Text style={styles.subFilterLabel}>Urutkan Berdasarkan:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {(["newest", "oldest", "highest", "lowest"] as const).map((sortOpt) => (
              <TouchableOpacity
                key={sortOpt}
                onPress={() => setSortOrder(sortOpt)}
                style={[styles.pill, sortOrder === sortOpt && styles.pillActive]}
              >
                <Text style={[styles.pillText, sortOrder === sortOpt && styles.pillTextActive]}>
                  {sortOpt === "newest" ? "Terbaru" : sortOpt === "oldest" ? "Terlama" : sortOpt === "highest" ? "Nominal Terbesar" : "Nominal Terkecil"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Card>

      {/* Render Transactions List */}
      {filteredAndSortedTransactions.length === 0 ? (
        <Card>
          <View style={styles.emptyCenter}>
            <Ionicons name="receipt-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Tidak ada transaksi yang cocok.</Text>
          </View>
        </Card>
      ) : (
        filteredAndSortedTransactions.map((transaction) => {
          const categoryName = transaction.categoryId
            ? summary?.byCategory.find((c) => c.categoryId === transaction.categoryId)?.categoryName || "Category"
            : null;
          
          const walletName = transaction.walletId
            ? wallets.find(w => w.id === transaction.walletId)?.name || "Wallet"
            : null;

          return (
            <Card key={transaction.id}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.transactionNote}>{transaction.note || transaction.type}</Text>
                  <Text style={styles.transactionMeta}>
                    {shortDate(transaction.happenedAt)}
                    {walletName ? ` • ${walletName}` : ""}
                    {categoryName ? ` • ${categoryName}` : ""}
                  </Text>
                </View>
                
                <View style={styles.rightActionRow}>
                  <Text style={transaction.type === "income" ? styles.goodAmount : styles.badAmount}>
                    {transaction.type === "income" ? "+" : "-"}
                    {rupiah(transaction.amount)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => handleEditTransaction(transaction)} style={styles.actionBtn}>
                      <Ionicons name="pencil-outline" size={16} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(transaction.id, transaction.note || transaction.type)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { marginBottom: 4 },
  eyebrow: { color: colors.teal, fontWeight: "800", marginBottom: 8 },
  title: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: "800" },
  cardLabel: { color: colors.muted, fontWeight: "700", marginBottom: 8 },
  balance: { color: colors.ink, fontSize: 32, fontWeight: "900", marginBottom: 14 },
  row: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  good: { color: colors.green, fontWeight: "800" },
  bad: { color: colors.red, fontWeight: "800" },
  goodAmount: { color: colors.green, fontWeight: "900", fontSize: 16 },
  badAmount: { color: colors.red, fontWeight: "900", fontSize: 16 },
  walletGrid: { gap: 10 },
  walletCard: { backgroundColor: "#fff", borderRadius: 8, padding: 14, borderLeftWidth: 5, borderColor: colors.line },
  walletName: { color: colors.muted, fontWeight: "700" },
  walletBalance: { color: colors.ink, fontSize: 20, fontWeight: "900", marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 10 },
  transactionNote: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  transactionMeta: { color: colors.muted, marginTop: 4, fontSize: 12 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 8 },
  emptyText: { color: colors.muted, fontWeight: "600", fontSize: 14, textAlign: "center" },
  filterSection: { gap: 10 },
  customRangeWrap: { backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.line },
  customDateFields: { flexDirection: "row", gap: 10 },
  
  // Bar Chart Styling
  chartLegend: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: colors.muted, fontWeight: "700", fontSize: 12 },
  chartArea: { flexDirection: "row", height: 180, alignItems: "flex-end", justifyContent: "space-around", paddingTop: 10 },
  chartCol: { alignItems: "center", flex: 1 },
  barClickArea: { height: "100%", width: "100%", justifyContent: "flex-end", alignItems: "center", borderRadius: 6, paddingVertical: 4 },
  selectedColBackground: { backgroundColor: "#f1f5f9" },
  barPair: { flexDirection: "row", gap: 4, alignItems: "flex-end", height: "100%" },
  barInc: { width: 8, backgroundColor: colors.green, borderRadius: 4 },
  barExp: { width: 8, backgroundColor: colors.red, borderRadius: 4 },
  barLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", marginTop: 6 },
  
  // Interactive Tooltip Styling
  chartTooltip: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 6, borderWidth: 1, borderColor: "#cbd5e1", marginTop: 14 },
  tooltipTitle: { color: colors.ink, fontWeight: "900", marginBottom: 4 },
  goodText: { color: colors.green, fontWeight: "800", fontSize: 13 },
  badText: { color: colors.red, fontWeight: "800", fontSize: 13 },
  netText: { color: colors.teal, fontWeight: "900", fontSize: 13, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 4, marginTop: 4 },
  emptyChart: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  
  // Categories Progress styling
  categoriesArea: { gap: 14 },
  categoryRow: { gap: 6 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  categoryAmount: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  categoryProgressTrack: { height: 8, borderRadius: 4, backgroundColor: "#f1f5f9", overflow: "hidden" },
  categoryProgressBar: { height: "100%", borderRadius: 4 },
  
  // Action Buttons
  rightActionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionButtons: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 6, borderRadius: 6, backgroundColor: "#f1f5f9" },

  // Advanced Search & Filter UX
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  badgeCount: { backgroundColor: "#e2e8f0", color: colors.muted, fontWeight: "800", fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  searchFilterWrap: { gap: 10 },
  subFilterLabel: { color: colors.ink, fontWeight: "800", fontSize: 13, marginTop: 4 },
  chipScroll: { flexDirection: "row", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: colors.line, marginRight: 6 },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { color: colors.muted, fontWeight: "700", fontSize: 12, textTransform: "capitalize" },
  pillTextActive: { color: "#fff" },
});
