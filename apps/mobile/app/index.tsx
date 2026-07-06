import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, ScrollView, useWindowDimensions } from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { Segmented } from "@/components/Segmented";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState, TopProgressBar } from "@/components/StateViews";
import { api } from "@/lib/api";
import { rupiah, shortDate } from "@/lib/format";
import { Summary, Transaction, Wallet } from "@/lib/types";
import { useTheme } from "@/contexts/ThemeContext";

type ChartBucket = { label: string; income: number; expense: number };

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, theme } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  // Date period filters
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Interactive Chart States
  const [chartView, setChartView] = useState<"expense" | "income">("expense");
  const [selectedBar, setSelectedBar] = useState<(ChartBucket & { index: number }) | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

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
    setLoadError("");

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
      setLoadError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setLoadingData(false);
    }
  }

  function handlePeriodChange(newPeriod: typeof period) {
    if (newPeriod === period || loadingData) return;
    setPeriod(newPeriod);
    load(newPeriod, startDate, endDate, false);
  }

  function handleApplyCustomRange() {
    if (loadingData) return;

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
            if (deletingTransactionId) return;

            setDeletingTransactionId(id);
            setLoadingData(true);
            try {
              await api.deleteTransaction(id);
              Alert.alert("Sukses", "Transaksi berhasil dihapus.");
              await load(period, startDate, endDate, false);
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Gagal menghapus transaksi.");
            } finally {
              setDeletingTransactionId(null);
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

  // Calculate continuous connector coordinates for responsive Area line chart
  const canvasHeight = 130;
  const lines: any[] = [];
  const dots: any[] = [];

  if (chartWidth > 0 && chartBuckets.length > 0) {
    const colWidth = chartWidth / chartBuckets.length;
    
    chartBuckets.forEach((bucket, idx) => {
      const value = chartView === "income" ? bucket.income : bucket.expense;
      const heightPct = (value / chartMaxVal) * 75; // max 75% height to prevent clipping
      const cx = (idx + 0.5) * colWidth;
      const cy = canvasHeight - (heightPct / 100) * canvasHeight + 10;
      dots.push({
        cx,
        cy,
        bucket,
        idx,
        value,
        heightPct
      });
    });

    for (let i = 0; i < dots.length - 1; i++) {
      const p1 = dots[i];
      const p2 = dots[i + 1];

      const dx = p2.cx - p1.cx;
      const dy = p2.cy - p1.cy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const rad = Math.atan2(dy, dx);
      const deg = rad * (180 / Math.PI);

      lines.push({
        key: `line-${i}`,
        left: p1.cx,
        top: p1.cy - 1.5,
        width: len,
        angle: deg,
      });
    }
  }

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
      <Screen contentStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.blue }]}>PocketFlow</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Uang kamu ada di mana, kelihatan jelas.</Text>
        </View>
        <LoadingState title="Memuat dashboard" subtitle="Sinkronisasi dompet, transaksi, dan ringkasan keuangan." />
      </Screen>
    );
  }

  if (loadError && !summary && wallets.length === 0 && transactions.length === 0) {
    return (
      <Screen contentStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.blue }]}>PocketFlow</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Uang kamu ada di mana, kelihatan jelas.</Text>
        </View>
        <ErrorState message={loadError} onRetry={() => load(period, startDate, endDate, true)} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>PocketFlow</Text>
        <Text style={[styles.title, { color: colors.ink }]}>Uang kamu ada di mana, kelihatan jelas.</Text>
      </View>

      <TopProgressBar visible={loadingData || Boolean(deletingTransactionId)} />
      {loadError ? <ErrorState message={loadError} onRetry={() => load(period, startDate, endDate, false)} /> : null}

      <Card>
        <Text style={[styles.cardLabel, { color: colors.muted }]}>Total Balance</Text>
        <Text style={[styles.balance, { color: colors.ink }]}>{rupiah(totalBalance)}</Text>
        <View style={styles.row}>
          <View style={styles.indicatorWrap}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={colors.green} />
            <Text style={[styles.good, { color: colors.green }]}>Income {rupiah(summary?.totals.income ?? 0)}</Text>
          </View>
          <View style={styles.indicatorWrap}>
            <Ionicons name="arrow-down-circle-outline" size={16} color={colors.red} />
            <Text style={[styles.bad, { color: colors.red }]}>Expense {rupiah(summary?.totals.expense ?? 0)}</Text>
          </View>
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
            <View style={[styles.customDateFields, isCompact && styles.customDateFieldsStacked]}>
              <View style={[styles.customDateField, isCompact && styles.customDateFieldStacked]}>
                <Field label="Mulai (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-05-01" />
              </View>
              <View style={[styles.customDateField, isCompact && styles.customDateFieldStacked]}>
                <Field label="Selesai (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} placeholder="2026-05-30" />
              </View>
            </View>
            <View style={{ marginTop: 8 }}>
              <Button label="Terapkan Filter" onPress={handleApplyCustomRange} loading={loadingData} disabled={loadingData} />
            </View>
          </View>
        )}
      </View>

      {/* Premium Filled Area Chart */}
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Trend Analisis (Area Chart)</Text>
      <Card>
        {transactions.length === 0 ? (
          <View style={styles.emptyChart}>
            <Ionicons name="analytics-outline" size={36} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Belum ada transaksi di periode ini.</Text>
          </View>
        ) : (
          <View>
            <View style={styles.chartHeaderRow}>
              <View style={styles.chartSegmentWrap}>
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
            <View 
              style={styles.chartArea}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
            >
              {/* Horizontal Grid lines */}
              <View style={[styles.gridLine, { top: "15%", borderBottomColor: colors.line }]} />
              <View style={[styles.gridLine, { top: "45%", borderBottomColor: colors.line }]} />
              <View style={[styles.gridLine, { top: "75%", borderBottomColor: colors.line }]} />

              {/* Translucent Area Fills styled as clean vertical accent needles to stay strictly below vector slopes */}
              <View style={[styles.segmentsRow, { zIndex: 1 }]}>
                {chartBuckets.map((bucket, idx) => {
                  const value = chartView === "income" ? bucket.income : bucket.expense;
                  const heightPct = (value / chartMaxVal) * 75; // matching dot calculation
                  const isSelected = selectedBar?.index === idx;

                  return (
                    <View key={idx} style={styles.chartCol}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setSelectedBar(isSelected ? null : { ...bucket, index: idx })}
                        style={[
                          styles.areaClickArea, 
                          isSelected && { backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 255, 255, 0.04)" }
                        ]}
                      >
                        <View 
                          style={{ 
                            height: `${heightPct}%`,
                            width: 6,
                            backgroundColor: isSelected 
                              ? (chartView === "income" ? colors.green : colors.red)
                              : (chartView === "income" ? "rgba(5, 150, 105, 0.1)" : "rgba(220, 38, 38, 0.1)"),
                            borderRadius: 3,
                            alignSelf: "center",
                          }} 
                        />
                      </TouchableOpacity>
                      <Text numberOfLines={1} style={[styles.barLabel, { color: colors.muted, zIndex: 5 }]}>{bucket.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Continuous Line Overlays */}
              {lines.map((line) => (
                <View
                  key={line.key}
                  style={{
                    position: "absolute",
                    left: line.left,
                    top: line.top,
                    width: line.width,
                    height: 2,
                    backgroundColor: chartView === "income" ? colors.green : colors.red,
                    transform: [
                      { translateX: -line.width / 2 },
                      { rotate: `${line.angle}deg` },
                      { translateX: line.width / 2 },
                    ],
                    opacity: 0.9,
                    zIndex: 2,
                  }}
                />
              ))}

              {/* Glowing Data Dots */}
              {dots.map((dot) => {
                const isSelected = selectedBar?.index === dot.idx;
                return (
                  <View
                    key={`dot-${dot.idx}`}
                    style={{
                      position: "absolute",
                      left: dot.cx - 4,
                      top: dot.cy - 4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: chartView === "income" ? colors.green : colors.red,
                      borderWidth: 1.5,
                      borderColor: colors.panel,
                      zIndex: 3,
                      shadowColor: chartView === "income" ? colors.green : colors.red,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isSelected ? 0.8 : 0.4,
                      shadowRadius: isSelected ? 6 : 3,
                      elevation: 3,
                    }}
                  />
                );
              })}
            </View>

            {selectedBar && (
              <View style={[styles.chartTooltip, { backgroundColor: theme === "light" ? "#f9fafb" : "#1f2937", borderColor: colors.line }]}>
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
            <Ionicons name="pie-chart-outline" size={36} color={colors.muted} />
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
                      <Text numberOfLines={1} style={[styles.categoryName, { color: colors.ink }]}>{cat.categoryName || "Uncategorized"}</Text>
                    </View>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.categoryAmount, { color: colors.ink }]}>{rupiah(catTotal)} ({pct}%)</Text>
                  </View>
                  <View style={[styles.categoryProgressTrack, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }]}>
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
                  borderColor: colors.line,
                  borderWidth: 1,
                }
              ]}
            >
              <View style={styles.walletHeaderRow}>
                <View style={[styles.walletDot, { backgroundColor: wallet.color }]} />
                <Text numberOfLines={1} style={[styles.walletName, { color: colors.muted }]}>{wallet.name}</Text>
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.walletBalance, { color: colors.ink }]}>{rupiah(wallet.balance)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Recent Transactions list */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Recent Transactions</Text>
        <Text style={[styles.badgeCount, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937", color: colors.muted }]}>
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
                  filterType === typeOpt ? { backgroundColor: colors.ink, borderColor: colors.ink } : { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }
                ]}
              >
                <Text 
                  style={[
                    styles.pillText, 
                    { color: filterType === typeOpt ? (theme === "light" ? "#ffffff" : "#000000") : colors.muted }
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
                filterWalletId === "all" ? { backgroundColor: colors.ink, borderColor: colors.ink } : { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }
              ]}
            >
              <Text 
                style={[
                  styles.pillText, 
                  { color: filterWalletId === "all" ? (theme === "light" ? "#ffffff" : "#000000") : colors.muted }
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
                  filterWalletId === w.id ? { backgroundColor: colors.ink, borderColor: colors.ink } : { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }
                ]}
              >
                <Text 
                  style={[
                    styles.pillText, 
                    { color: filterWalletId === w.id ? (theme === "light" ? "#ffffff" : "#000000") : colors.muted }
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
                  sortOrder === sortOpt ? { backgroundColor: colors.ink, borderColor: colors.ink } : { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }
                ]}
              >
                <Text 
                  style={[
                    styles.pillText, 
                    { color: sortOrder === sortOpt ? (theme === "light" ? "#ffffff" : "#000000") : colors.muted }
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
            <Ionicons name="receipt-outline" size={36} color={colors.muted} />
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
                <View style={styles.transactionInfo}>
                  <Text numberOfLines={1} style={[styles.transactionNote, { color: colors.ink }]}>{transaction.note || transaction.type}</Text>
                  <Text numberOfLines={2} style={[styles.transactionMeta, { color: colors.muted }]}>
                    {shortDate(transaction.happenedAt)}
                    {walletName ? ` • ${walletName}` : ""}
                    {categoryName ? ` • ${categoryName}` : ""}
                  </Text>
                </View>
                
                <View style={styles.rightActionRow}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.76}
                    style={transaction.type === "income" ? [styles.goodAmount, { color: colors.green }] : [styles.badAmount, { color: colors.red }]}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {rupiah(transaction.amount)}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      hitSlop={6}
                      disabled={Boolean(deletingTransactionId)}
                      onPress={() => handleEditTransaction(transaction)}
                      style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#f3f4f6" : "#1f2937" }]}
                    >
                      <Ionicons name="pencil-outline" size={15} color={colors.ink} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      hitSlop={6}
                      disabled={Boolean(deletingTransactionId)}
                      onPress={() => handleDeleteTransaction(transaction.id, transaction.note || transaction.type)}
                      style={[styles.actionBtn, { backgroundColor: theme === "light" ? "#fef2f2" : "#3b1e1e" }]}
                    >
                      {deletingTransactionId === transaction.id ? (
                        <ActivityIndicator size="small" color={colors.red} />
                      ) : (
                        <Ionicons name="trash-outline" size={15} color={colors.red} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: 16 },
  header: { marginBottom: 4 },
  eyebrow: { fontWeight: "700", marginBottom: 4, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.5 },
  cardLabel: { fontWeight: "600", marginBottom: 4, fontSize: 13, letterSpacing: -0.1 },
  balance: { fontSize: 30, fontWeight: "700", marginBottom: 10, letterSpacing: -0.5 },
  row: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  indicatorWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBetween: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  good: { fontWeight: "600", fontSize: 14 },
  bad: { fontWeight: "600", fontSize: 14 },
  goodAmount: { fontWeight: "600", fontSize: 15, letterSpacing: -0.1, textAlign: "right" },
  badAmount: { fontWeight: "600", fontSize: 15, letterSpacing: -0.1, textAlign: "right" },
  walletGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  walletCard: { flex: 1, minWidth: 100, borderRadius: 14, padding: 16, borderStyle: "solid" },
  walletHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  walletDot: { width: 8, height: 8, borderRadius: 4 },
  walletName: { fontWeight: "600", fontSize: 13 },
  walletBalance: { fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 8, letterSpacing: -0.2 },
  transactionInfo: { flex: 1, minWidth: 0, paddingRight: 4 },
  transactionNote: { fontWeight: "600", fontSize: 15, letterSpacing: -0.1 },
  transactionMeta: { marginTop: 3, fontSize: 12, fontWeight: "400", lineHeight: 16 },
  emptyCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontWeight: "500", fontSize: 14, textAlign: "center" },
  filterSection: { gap: 8 },
  customRangeWrap: { borderRadius: 14, padding: 14, borderWidth: 1 },
  customDateFields: { flexDirection: "row", gap: 10 },
  customDateFieldsStacked: { flexDirection: "column" },
  customDateField: { flex: 1, minWidth: 0 },
  customDateFieldStacked: { flex: 0 },
  
  // Filled Area Chart Styling
  chartHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  chartSegmentWrap: { width: 140, maxWidth: "100%" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontWeight: "600", fontSize: 12 },
  chartArea: { height: 160, justifyContent: "flex-end", position: "relative", overflow: "hidden", paddingTop: 10 },
  gridLine: { position: "absolute", left: 0, right: 0, borderBottomWidth: 1, borderStyle: "dashed", opacity: 0.15 },
  segmentsRow: { flexDirection: "row", height: "100%", alignItems: "flex-end", justifyContent: "space-around" },
  chartCol: { alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end" },
  areaClickArea: { height: "100%", width: "100%", justifyContent: "flex-end", alignItems: "stretch", borderRadius: 4, paddingHorizontal: 2 },
  barLabel: { fontSize: 10, fontWeight: "600", marginTop: 6, letterSpacing: -0.1 },
  
  // Interactive Tooltip Styling
  chartTooltip: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  tooltipTitle: { fontWeight: "700", marginBottom: 4, fontSize: 12 },
  goodText: { fontWeight: "600", fontSize: 13 },
  badText: { fontWeight: "600", fontSize: 13 },
  netText: { fontWeight: "700", fontSize: 13, borderTopWidth: 1, paddingTop: 4, marginTop: 4 },
  emptyChart: { alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 10 },
  
  // Categories Progress styling
  categoriesArea: { gap: 12 },
  categoryRow: { gap: 6 },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryTitleWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { flex: 1, minWidth: 0, fontWeight: "600", fontSize: 14, letterSpacing: -0.1 },
  categoryAmount: { flexShrink: 0, maxWidth: "48%", fontWeight: "600", fontSize: 14, letterSpacing: -0.1, textAlign: "right" },
  categoryProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  categoryProgressBar: { height: "100%", borderRadius: 3 },
  
  // Action Buttons
  rightActionRow: { alignItems: "flex-end", gap: 8, maxWidth: "48%" },
  actionButtons: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Advanced Search & Filter UX
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10 },
  badgeCount: { fontWeight: "600", fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  searchFilterWrap: { gap: 8 },
  subFilterLabel: { fontWeight: "600", fontSize: 12, marginTop: 4, letterSpacing: -0.1 },
  chipScroll: { flexDirection: "row", gap: 6 },
  pill: { minHeight: 32, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginRight: 4, justifyContent: "center" },
  pillText: { fontWeight: "600", fontSize: 12, textTransform: "capitalize", letterSpacing: -0.1 },
});
