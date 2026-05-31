import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { Segmented } from "@/components/Segmented";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import { rupiah, shortDate } from "@/lib/format";
import { Summary, Transaction, Wallet } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

type ChartBucket = { label: string; income: number; expense: number };

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Date period filters
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Interactive Chart States
  const [chartView, setChartView] = useState<"expense" | "income">("expense");
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

  // Group transactions for area chart
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

  const chartMaxVal = Math.max(
    ...chartBuckets.map(b => chartView === "income" ? b.income : b.expense), 
    1
  );

  // Apply Real-time Searching, Filtering and Sorting
  const filteredAndSortedTransactions = transactions
    .filter((tx) => {
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

      if (filterType !== "all" && tx.type !== filterType) {
        return false;
      }

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
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top", "left", "right"]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.blue }]}>PocketFlow</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Uang kamu ada di mana, kelihatan jelas.</Text>
        </View>

        <Card>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Total Balance</Text>
          <Text style={[styles.balance, { color: colors.ink }]}>{rupiah(totalBalance)}</Text>
          <View style={styles.row}>
            <Text style={[styles.good, { color: colors.green }]}>Income {rupiah(summary?.totals.income ?? 0)}</Text>
            <Text style={[styles.bad, { color: colors.red }]}>Expense {rupiah(summary?.totals.expense ?? 0)}</Text>
          </View>
        </Card>

        <View style={styles.filterSection}>
          <Segmented
            value={period}
            options={["daily", "weekly", "monthly", "yearly", "custom"]}
            onChange={handlePeriodChange}
          />
          {period === "custom" && (
            <View style={[styles.customRangeWrap, { backgroundColor: colors.panel, borderColor: colors.line }]}>
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
          <ActivityIndicator size="small" color={colors.blue} style={{ marginVertical: 14 }} />
        )}

        {/* Premium Filled Area Chart */}
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Trend Analisis (Area Chart)</Text>
        <Card>
          {transactions.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="analytics-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>Belum ada transaksi di periode ini.</Text>
            </View>
          ) : (
            <View>
              <View style={styles.chartHeaderRow}>
                <View style={{ width: 150 }}>
                  <Segmented
                    value={chartView}
                    options={["expense", "income"]}
                    onChange={(val) => setChartView(val as any)}
                  />
                </View>
                <View style={styles.legendItem}>
                  <View 
                    style={[
                      styles.legendDot, 
                      { backgroundColor: chartView === "income" ? colors.green : colors.red }
                    ]} 
                  />
                  <Text style={[styles.legendLabel, { color: colors.muted }]}>
                    {chartView === "income" ? "Income" : "Expense"}
                  </Text>
                </View>
              </View>

              {/* Area Canvas */}
              <View style={styles.chartArea}>
                {/* Horizontal Grid lines */}
                <View style={[styles.gridLine, { top: "10%", borderBottomColor: colors.line }]} />
                <View style={[styles.gridLine, { top: "45%", borderBottomColor: colors.line }]} />
                <View style={[styles.gridLine, { top: "80%", borderBottomColor: colors.line }]} />

                <View style={styles.segmentsRow}>
                  {chartBuckets.map((bucket, idx) => {
                    const value = chartView === "income" ? bucket.income : bucket.expense;
                    const heightPct = (value / chartMaxVal) * 85; // cap height at 85%
                    const isSelected = selectedBar?.index === idx;

                    // Area segment filled style
                    const segmentStyle = {
                      height: `${heightPct + 5}%` as any, // min height 5% for visual consistency
                      backgroundColor: isSelected 
                        ? (chartView === "income" ? "rgba(52, 199, 89, 0.24)" : "rgba(255, 69, 58, 0.24)")
                        : (chartView === "income" ? "rgba(52, 199, 89, 0.1)" : "rgba(255, 69, 58, 0.1)"),
                      borderTopWidth: 2,
                      borderTopColor: chartView === "income" ? colors.green : colors.red,
                    };

                    return (
                      <View key={idx} style={styles.chartCol}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setSelectedBar(isSelected ? null : { ...bucket, index: idx })}
                          style={[styles.areaClickArea, isSelected && styles.selectedAreaCol]}
                        >
                          <View style={[styles.areaSegment, segmentStyle]} />
                        </TouchableOpacity>
                        <Text style={[styles.barLabel, { color: colors.muted }]}>{bucket.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {selectedBar && (
                <View style={[styles.chartTooltip, { backgroundColor: theme === "light" ? "#f2f2f7" : "#2c2c2e", borderColor: colors.line }]}>
                  <Text style={[styles.tooltipTitle, { color: colors.ink }]}>Detail {selectedBar.label}:</Text>
                  {chartView === "income" ? (
                    <Text style={[styles.goodText, { color: colors.green }]}>Income: {rupiah(selectedBar.income)}</Text>
                  ) : (
                    <Text style={[styles.badText, { color: colors.red }]}>Expense: {rupiah(selectedBar.expense)}</Text>
                  )}
                  <Text style={[styles.netText, { color: colors.blue, borderTopColor: colors.line }]}>
                    Net: {rupiah(selectedBar.income - selectedBar.expense)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Expense by Category Progress Chart */}
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Expense by Category</Text>
        <Card>
          {!summary || summary.byCategory.length === 0 ? (
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>Tidak ada pengeluaran kategori.</Text>
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
                        <Text style={[styles.categoryName, { color: colors.ink }]}>{cat.categoryName || "Uncategorized"}</Text>
                      </View>
                      <Text style={[styles.categoryAmount, { color: colors.ink }]}>{rupiah(catTotal)} ({pct}%)</Text>
                    </View>
                    <View style={[styles.categoryProgressTrack, { backgroundColor: theme === "light" ? "#e5e5ea" : "#2c2c2e" }]}>
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
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>My Wallets</Text>
        <View style={styles.walletGrid}>
          {wallets.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>Belum ada wallet. Silakan buat di menu Wallet.</Text>
          ) : (
            wallets.map((wallet) => (
              <View 
                key={wallet.id} 
                style={[
                  styles.walletCard, 
                  { 
                    backgroundColor: colors.panel, 
                    borderLeftColor: wallet.color,
                    borderColor: colors.line,
                    borderWidth: 1,
                  }
                ]}
              >
                <Text style={[styles.walletName, { color: colors.muted }]}>{wallet.name}</Text>
                <Text style={[styles.walletBalance, { color: colors.ink }]}>{rupiah(wallet.balance)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Recent Transactions list */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Recent Transactions</Text>
          <Text style={[styles.badgeCount, { backgroundColor: theme === "light" ? "#e5e5ea" : "#2c2c2e", color: colors.muted }]}>
            {filteredAndSortedTransactions.length} items
          </Text>
        </View>

        <Card>
          <View style={styles.searchFilterWrap}>
            <Field
              label=""
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari catatan, wallet, kategori..."
            />

            <Text style={[styles.subFilterLabel, { color: colors.ink }]}>Tipe Transaksi:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(["all", "income", "expense", "transfer"] as const).map((typeOpt) => (
                <TouchableOpacity
                  key={typeOpt}
                  onPress={() => setFilterType(typeOpt)}
                  style={[
                    styles.pill, 
                    { borderColor: colors.line },
                    filterType === typeOpt ? { backgroundColor: colors.blue, borderColor: colors.blue } : { backgroundColor: theme === "light" ? "#e5e5ea" : "#1c1c1e" }
                  ]}
                >
                  <Text 
                    style={[
                      styles.pillText, 
                      { color: filterType === typeOpt ? "#ffffff" : colors.muted }
                    ]}
                  >
                    {typeOpt === "all" ? "Semua Tipe" : typeOpt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.subFilterLabel, { color: colors.ink }]}>Pilih Wallet:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                onPress={() => setFilterWalletId("all")}
                style={[
                  styles.pill, 
                  { borderColor: colors.line },
                  filterWalletId === "all" ? { backgroundColor: colors.blue, borderColor: colors.blue } : { backgroundColor: theme === "light" ? "#e5e5ea" : "#1c1c1e" }
                ]}
              >
                <Text 
                  style={[
                    styles.pillText, 
                    { color: filterWalletId === "all" ? "#ffffff" : colors.muted }
                  ]}
                >
                  Semua Dompet
                </Text>
              </TouchableOpacity>
              {wallets.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => setFilterWalletId(w.id)}
                  style={[
                    styles.pill, 
                    { borderColor: colors.line },
                    filterWalletId === w.id ? { backgroundColor: colors.blue, borderColor: colors.blue } : { backgroundColor: theme === "light" ? "#e5e5ea" : "#1c1c1e" }
                  ]}
                >
                  <Text 
                    style={[
                      styles.pillText, 
                      { color: filterWalletId === w.id ? "#ffffff" : colors.muted }
                    ]}
                  >
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.subFilterLabel, { color: colors.ink }]}>Urutkan:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(["newest", "oldest", "highest", "lowest"] as const).map((sortOpt) => (
                <TouchableOpacity
                  key={sortOpt}
                  onPress={() => setSortOrder(sortOpt)}
                  style={[
                    styles.pill, 
                    { borderColor: colors.line },
                    sortOrder === sortOpt ? { backgroundColor: colors.blue, borderColor: colors.blue } : { backgroundColor: theme === "light" ? "#e5e5ea" : "#1c1c1e" }
                  ]}
                >
                  <Text 
                    style={[
                      styles.pillText, 
                      { color: sortOrder === sortOpt ? "#ffffff" : colors.muted }
                    ]}
                  >
                    {sortOpt === "newest" ? "Terbaru" : sortOpt === "oldest" ? "Terlama" : sortOpt === "highest" ? "Terbesar" : "Terkecil"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Card>

        {/* Transactions list */}
        {filteredAndSortedTransactions.length === 0 ? (
          <Card>
            <View style={styles.emptyCenter}>
              <Ionicons name="receipt-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>Tidak ada transaksi yang cocok.</Text>
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
                    <Text style={[styles.transactionNote, { color: colors.ink }]}>{transaction.note || transaction.type}</Text>
                    <Text style={[styles.transactionMeta, { color: colors.muted }]}>
                      {shortDate(transaction.happenedAt)}
                      {walletName ? ` • ${walletName}` : ""}
                      {categoryName ? ` • ${categoryName}` : ""}
                    </Text>
                  </View>
                  
                  <View style={styles.rightActionRow}>
                    <Text style={transaction.type === "income" ? [styles.goodAmount, { color: colors.green }] : [styles.badAmount, { color: colors.red }]}>
                      {transaction.type === "income" ? "+" : "-"}
                      {rupiah(transaction.amount)}
                    </Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity onPress={() => handleEditTransaction(transaction)} style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#f1f5f9" : "#2c2c2e" }]}>
                        <Ionicons name="pencil-outline" size={16} color={colors.ink} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(transaction.id, transaction.note || transaction.type)}
                        style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#fef2f2" : "#3b1e1e" }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { marginBottom: 4 },
  eyebrow: { fontWeight: "800", marginBottom: 6, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "800", letterSpacing: -0.6 },
  cardLabel: { fontWeight: "700", marginBottom: 6, fontSize: 13, letterSpacing: -0.1 },
  balance: { fontSize: 32, fontWeight: "900", marginBottom: 12, letterSpacing: -0.8 },
  row: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  good: { fontWeight: "800", fontSize: 14 },
  bad: { fontWeight: "800", fontSize: 14 },
  goodAmount: { fontWeight: "900", fontSize: 16, letterSpacing: -0.2 },
  badAmount: { fontWeight: "900", fontSize: 16, letterSpacing: -0.2 },
  walletGrid: { gap: 10 },
  walletCard: { borderRadius: 12, padding: 14, borderLeftWidth: 5 },
  walletName: { fontWeight: "700", fontSize: 13 },
  walletBalance: { fontSize: 20, fontWeight: "800", marginTop: 4, letterSpacing: -0.3 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginTop: 10, letterSpacing: -0.3 },
  transactionNote: { fontWeight: "700", fontSize: 15, letterSpacing: -0.2 },
  transactionMeta: { marginTop: 4, fontSize: 12, fontWeight: "500" },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontWeight: "600", fontSize: 14, textAlign: "center" },
  filterSection: { gap: 10 },
  customRangeWrap: { borderRadius: 12, padding: 12, borderWidth: 1 },
  customDateFields: { flexDirection: "row", gap: 10 },
  
  // Filled Area Chart Styling
  chartHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontWeight: "700", fontSize: 12 },
  chartArea: { height: 180, justifyContent: "flex-end", position: "relative", overflow: "hidden", paddingTop: 10 },
  gridLine: { position: "absolute", left: 0, right: 0, borderBottomWidth: 1, borderStyle: "dashed", opacity: 0.2 },
  segmentsRow: { flexDirection: "row", height: "100%", alignItems: "flex-end", justifyContent: "space-around" },
  chartCol: { alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" },
  areaClickArea: { height: "100%", width: "100%", justifyContent: "flex-end", alignItems: "stretch", borderRadius: 4, paddingHorizontal: 2 },
  selectedAreaCol: { backgroundColor: "rgba(142, 142, 147, 0.05)" },
  areaSegment: { borderTopWidth: 2, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.85, width: "100%" },
  barLabel: { fontSize: 11, fontWeight: "800", marginTop: 6, letterSpacing: -0.1 },
  
  // Interactive Tooltip Styling
  chartTooltip: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 14 },
  tooltipTitle: { fontWeight: "800", marginBottom: 4, fontSize: 12 },
  goodText: { fontWeight: "800", fontSize: 13 },
  badText: { fontWeight: "800", fontSize: 13 },
  netText: { fontWeight: "900", fontSize: 13, borderTopWidth: 1, paddingTop: 4, marginTop: 4 },
  emptyChart: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  
  // Categories Progress styling
  categoriesArea: { gap: 14 },
  categoryRow: { gap: 6 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontWeight: "700", fontSize: 14, letterSpacing: -0.1 },
  categoryAmount: { fontWeight: "700", fontSize: 14, letterSpacing: -0.1 },
  categoryProgressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  categoryProgressBar: { height: "100%", borderRadius: 4 },
  
  // Action Buttons
  rightActionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionButtons: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 6, borderRadius: 6 },

  // Advanced Search & Filter UX
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  badgeCount: { fontWeight: "800", fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  searchFilterWrap: { gap: 10 },
  subFilterLabel: { fontWeight: "700", fontSize: 12, marginTop: 4, letterSpacing: -0.1 },
  chipScroll: { flexDirection: "row", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  pillText: { fontWeight: "700", fontSize: 12, textTransform: "capitalize", letterSpacing: -0.1 },
});
