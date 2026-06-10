"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

type AppConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
};

type Wallet = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: string;
  color: string;
};

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: "income" | "expense";
};

type Budget = {
  id: string;
  name: string;
  amount: string;
  period: "daily" | "weekly" | "monthly";
  categoryId?: string | null;
};

type Transaction = {
  id: string;
  type: "income" | "expense" | "transfer";
  amount: string;
  walletId: string;
  targetWalletId?: string | null;
  categoryId?: string | null;
  budgetId?: string | null;
  note?: string | null;
  happenedAt: string;
};

type Summary = {
  totals: {
    income: number;
    expense: number;
    net: number;
  };
  byCategory: Array<{ categoryId?: string | null; categoryName: string | null; color: string | null; total: string }>;
  byWallet: Array<{ walletId?: string | null; walletName: string | null; color: string | null; total: string }>;
  budgetUsage: Array<{ budgetId: string; name: string; amount: string; period: string; used: string }>;
};

type Period = "daily" | "weekly" | "monthly" | "yearly";
type ViewKey = "overview" | "transactions" | "wallets" | "budgets" | "reports" | "profile";

type TransactionForm = {
  id?: string;
  type: "expense" | "income" | "transfer";
  amount: string;
  walletId: string;
  targetWalletId: string;
  categoryId: string;
  budgetId: string;
  note: string;
  happenedAt: string;
};

const emptySummary: Summary = {
  totals: { income: 0, expense: 0, net: 0 },
  byCategory: [],
  byWallet: [],
  budgetUsage: [],
};

const walletColors = [
  "var(--color-accent)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-violet)",
  "var(--color-error)",
];

const navigationItems: Array<[ViewKey, string]> = [
  ["overview", "Overview"],
  ["transactions", "Transactions"],
  ["wallets", "Wallets"],
  ["budgets", "Budgets"],
  ["reports", "Reports"],
  ["profile", "Profile"],
];

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultTransactionForm(): TransactionForm {
  return {
    type: "expense",
    amount: "",
    walletId: "",
    targetWalletId: "",
    categoryId: "",
    budgetId: "",
    note: "",
    happenedAt: localDateTimeValue(),
  };
}

function rupiah(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numberValue) ? numberValue : 0);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeAmount(input: string) {
  const normalized = input.replace(/[^\d]/g, "");
  return normalized ? Number(normalized) : 0;
}

export function PocketFlowWebApp({ config }: { config: AppConfig }) {
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!config.isConfigured) return null;
    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }, [config]);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [period, setPeriod] = useState<Period>("monthly");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState("");

  const [transactionForm, setTransactionForm] = useState<TransactionForm>(() => defaultTransactionForm());
  const [walletName, setWalletName] = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  const apiRequest = useCallback(
    async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
      const token = session?.access_token;
      if (!token) throw new Error("Session belum aktif. Login ulang dulu.");

      const response = await fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let message = text || "Request failed";
        try {
          const json = JSON.parse(text) as { error?: string; message?: string };
          message = json.error || json.message || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      return response.json() as Promise<T>;
    },
    [session]
  );

  const loadData = useCallback(
    async function loadData(nextPeriod: Period, quiet = false) {
      if (!session) return;
      if (quiet) setRefreshing(true);
      else setLoadingData(true);
      setError("");

      try {
        const [walletData, categoryData, budgetData, transactionData, summaryData] = await Promise.all([
          apiRequest<{ wallets: Wallet[] }>("/api/wallets"),
          apiRequest<{ categories: Category[] }>("/api/categories"),
          apiRequest<{ budgets: Budget[] }>("/api/budgets"),
          apiRequest<{ transactions: Transaction[] }>(`/api/transactions?period=${nextPeriod}`),
          apiRequest<Summary>(`/api/reports/summary?period=${nextPeriod}`),
        ]);

        setWallets(walletData.wallets);
        setCategories(categoryData.categories);
        setBudgets(budgetData.budgets);
        setTransactions(transactionData.transactions);
        setSummary(summaryData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data.");
      } finally {
        setLoadingData(false);
        setRefreshing(false);
      }
    },
    [apiRequest, session]
  );

  useEffect(() => {
    if (session) void loadData(period, false);
  }, [loadData, period, session]);

  useEffect(() => {
    setTransactionForm((current) => {
      const next = { ...current };
      if (!next.walletId && wallets[0]) next.walletId = wallets[0].id;
      if (!next.targetWalletId && wallets[1]) next.targetWalletId = wallets[1].id;

      if (!next.categoryId) {
        const firstCategory = categories.find((category) => category.kind === next.type);
        if (firstCategory) next.categoryId = firstCategory.id;
      }

      return next;
    });
  }, [wallets, categories]);

  useEffect(() => {
    setTransactionForm((current) => {
      if (current.type === "transfer") {
        return {
          ...current,
          categoryId: "",
          budgetId: "",
          targetWalletId:
            current.targetWalletId && current.targetWalletId !== current.walletId
              ? current.targetWalletId
              : wallets.find((wallet) => wallet.id !== current.walletId)?.id ?? "",
        };
      }

      const category = categories.find((item) => item.kind === current.type);
      return {
        ...current,
        targetWalletId: "",
        categoryId: categories.some((item) => item.id === current.categoryId && item.kind === current.type)
          ? current.categoryId
          : category?.id ?? "",
        budgetId: current.type === "expense" ? current.budgetId : "",
      };
    });
  }, [transactionForm.type, categories, wallets]);

  const walletById = useMemo(() => new Map(wallets.map((wallet) => [wallet.id, wallet])), [wallets]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const totalBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  const maxCategory = Math.max(1, ...summary.byCategory.map((item) => Number(item.total)));
  const budgetUsageById = useMemo(() => new Map(summary.budgetUsage.map((item) => [item.budgetId, item])), [summary]);
  const currentViewTitle = viewTitle(activeView);

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || actionBusy) return;
    setAuthMessage("");
    setActionBusy("auth");

    try {
      if (authMode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        setAuthMessage("Akun dibuat. Kalau Supabase meminta email confirmation, cek inbox dulu sebelum login.");
      }
    } catch (authError) {
      setAuthMessage(authError instanceof Error ? authError.message : "Autentikasi gagal.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setWallets([]);
    setCategories([]);
    setBudgets([]);
    setTransactions([]);
    setSummary(emptySummary);
  }

  async function handleTransactionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionBusy) return;

    const amount = normalizeAmount(transactionForm.amount);
    if (!amount || !transactionForm.walletId) {
      setError("Nominal dan wallet wajib diisi.");
      return;
    }

    if (transactionForm.type === "transfer" && (!transactionForm.targetWalletId || transactionForm.targetWalletId === transactionForm.walletId)) {
      setError("Transfer butuh wallet tujuan yang berbeda.");
      return;
    }

    if (transactionForm.type !== "transfer" && !transactionForm.categoryId) {
      setError("Kategori wajib dipilih.");
      return;
    }

    setActionBusy("transaction");
    setError("");

    const payload = {
      type: transactionForm.type,
      amount,
      walletId: transactionForm.walletId,
      targetWalletId: transactionForm.type === "transfer" ? transactionForm.targetWalletId : null,
      categoryId: transactionForm.type === "transfer" ? null : transactionForm.categoryId || null,
      budgetId: transactionForm.type === "expense" ? transactionForm.budgetId || null : null,
      note: transactionForm.note,
      happenedAt: new Date(transactionForm.happenedAt).toISOString(),
    };

    try {
      if (transactionForm.id) {
        await apiRequest(`/api/transactions/${transactionForm.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/transactions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setTransactionForm(defaultTransactionForm());
      await loadData(period, true);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Gagal menyimpan transaksi.");
    } finally {
      setActionBusy("");
    }
  }

  function startEditTransaction(transaction: Transaction) {
    setActiveView("transactions");
    setTransactionForm({
      id: transaction.id,
      type: transaction.type,
      amount: String(Math.round(Number(transaction.amount))),
      walletId: transaction.walletId,
      targetWalletId: transaction.targetWalletId ?? "",
      categoryId: transaction.categoryId ?? "",
      budgetId: transaction.budgetId ?? "",
      note: transaction.note ?? "",
      happenedAt: localDateTimeValue(new Date(transaction.happenedAt)),
    });
  }

  async function deleteTransaction(id: string) {
    if (actionBusy) return;
    setActionBusy(`delete-tx-${id}`);
    setError("");

    try {
      await apiRequest(`/api/transactions/${id}`, { method: "DELETE" });
      await loadData(period, true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus transaksi.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleWalletSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionBusy || !walletName.trim()) return;
    setActionBusy("wallet");
    setError("");

    try {
      await apiRequest("/api/wallets", {
        method: "POST",
        body: JSON.stringify({
          name: walletName.trim(),
          type: "cash",
          balance: normalizeAmount(walletBalance),
          currency: "IDR",
          color: walletColors[wallets.length % walletColors.length],
        }),
      });
      setWalletName("");
      setWalletBalance("");
      await loadData(period, true);
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : "Gagal menyimpan wallet.");
    } finally {
      setActionBusy("");
    }
  }

  async function deleteWallet(id: string) {
    if (actionBusy) return;
    setActionBusy(`delete-wallet-${id}`);
    setError("");

    try {
      await apiRequest(`/api/wallets/${id}`, { method: "DELETE" });
      await loadData(period, true);
    } catch (walletError) {
      setError(walletError instanceof Error ? walletError.message : "Gagal menghapus wallet.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleBudgetSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (actionBusy || !budgetName.trim()) return;
    setActionBusy("budget");
    setError("");

    try {
      await apiRequest("/api/budgets", {
        method: "POST",
        body: JSON.stringify({
          name: budgetName.trim(),
          amount: normalizeAmount(budgetAmount),
          period: budgetPeriod,
          startsOn: new Date().toISOString().slice(0, 10),
          categoryId: null,
        }),
      });
      setBudgetName("");
      setBudgetAmount("");
      setBudgetPeriod("monthly");
      await loadData(period, true);
    } catch (budgetError) {
      setError(budgetError instanceof Error ? budgetError.message : "Gagal menyimpan budget.");
    } finally {
      setActionBusy("");
    }
  }

  async function deleteBudget(id: string) {
    if (actionBusy) return;
    setActionBusy(`delete-budget-${id}`);
    setError("");

    try {
      await apiRequest(`/api/budgets/${id}`, { method: "DELETE" });
      await loadData(period, true);
    } catch (budgetError) {
      setError(budgetError instanceof Error ? budgetError.message : "Gagal menghapus budget.");
    } finally {
      setActionBusy("");
    }
  }

  if (!config.isConfigured) {
    return (
      <main className="site-shell">
        <ProductNav mode="marketing" />
        <section className="auth-state-section">
          <div className="auth-card system-card">
            <div className="brand-lockup">
              <span className="brand-mark">PF</span>
              <div>
                <h1>PocketFlow Web</h1>
                <p>Supabase environment untuk web belum lengkap.</p>
              </div>
            </div>
            <div className="notice error">
              Tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` di environment `apps/api`. Setelah itu akun yang sama bisa dipakai dari mobile dan website.
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="site-shell">
        <ProductNav mode="marketing" />
        <section className="auth-state-section">
          <div className="auth-card compact-card system-card">
            <div className="skeleton-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="muted">Memuat session PocketFlow...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="site-shell">
        <ProductNav mode="marketing" />
        <section className="landing-hero" id="top">
          <div className="hero-copy animate-in">
            <h1>
              Command your <span>daily cashflow</span>.
            </h1>
            <p>Track wallets, budgets, and spend from web or iPhone with one synced Supabase account.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#auth-panel">
                Start tracking
              </a>
              <a className="ghost-button" href="#features">
                See system
              </a>
            </div>
          </div>

          <section className="auth-card hero-auth system-card animate-in" id="auth-panel" aria-label="PocketFlow authentication">
            <div className="brand-lockup">
              <span className="brand-mark">PF</span>
              <div>
                <h2>PocketFlow</h2>
                <p>Login sekali, data mobile dan web tetap sinkron.</p>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="email@contoh.com" required />
              </label>
              <label>
                Password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                />
              </label>
              {authMessage ? <div className={authMessage.includes("dibuat") ? "notice" : "notice error"}>{authMessage}</div> : null}
              <button className="primary-button wide" disabled={actionBusy === "auth"} type="submit">
                {actionBusy === "auth" ? "Memproses..." : authMode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <button className="ghost-button wide" type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>
              {authMode === "signin" ? "Buat akun baru" : "Sudah punya akun"}
            </button>
          </section>
        </section>

        <section className="logo-strip" aria-label="PocketFlow platform support">
          {["Supabase", "Vercel", "Expo", "React Native", "Next.js"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </section>

        <section className="feature-section" id="features">
          <div className="section-heading">
            <h2>Built for daily money decisions.</h2>
            <p>Every surface is designed for fast entry, clear accountability, and quiet financial review.</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-index">01</span>
              <h3>Multi-wallet tracking</h3>
              <p>Cash, bank, and e-wallet balances stay separated so every transaction lands in the right place.</p>
            </article>
            <article className="feature-card accent-card">
              <span className="feature-index">02</span>
              <h3>Budget pressure</h3>
              <p>Daily, weekly, and monthly limits make overspending visible before the month feels gone.</p>
            </article>
            <article className="feature-card visual-card">
              <span className="feature-index">03</span>
              <h3>One account sync</h3>
              <p>Mobile and web share the same Supabase identity, so the dashboard follows your real usage.</p>
            </article>
          </div>
        </section>

        <section className="detail-section">
          <div>
            <h2>Designed around the transaction moment.</h2>
            <p>Open, choose wallet, attach category or budget, save. Reports update without switching tools or reconciling spreadsheets.</p>
          </div>
          <div className="detail-visual" aria-hidden="true">
            <div className="visual-row">
              <span>Expense</span>
              <strong>{rupiah(128000)}</strong>
            </div>
            <div className="visual-row">
              <span>Wallet</span>
              <strong>GoPay</strong>
            </div>
            <div className="visual-row">
              <span>Budget</span>
              <strong>Food monthly</strong>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div>
            <strong>6</strong>
            <span>Core screens</span>
          </div>
          <div>
            <strong>4</strong>
            <span>Report periods</span>
          </div>
          <div>
            <strong>1</strong>
            <span>Synced account</span>
          </div>
        </section>

        <section className="cta-banner">
          <h2>Start from your next transaction.</h2>
          <a className="primary-button" href="#auth-panel">
            Open PocketFlow
          </a>
        </section>

        <ProductFooter />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <ProductNav
        activeView={activeView}
        email={session.user.email ?? ""}
        mode="app"
        onNavigate={setActiveView}
        onSignOut={handleSignOut}
      />

      <section className="workspace">
        <header className="dashboard-hero">
          <div>
            <span className="section-kicker">Personal finance command center</span>
            <h1>{activeView === "overview" ? "Command your daily cashflow" : currentViewTitle}</h1>
            <p>
              {activeView === "overview"
                ? "Review balances, budgets, wallet pressure, and recent movement in one focused surface."
                : "Keep this workspace synced with the same Supabase account you use on mobile."}
            </p>
          </div>
          <div className="topbar-actions">
            <div className="period-control" aria-label="Report period">
              {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((item) => (
                <button key={item} className={period === item ? "segmented active" : "segmented"} type="button" onClick={() => setPeriod(item)}>
                  {item}
                </button>
              ))}
            </div>
            <button className="secondary-button" type="button" onClick={() => loadData(period, true)} disabled={refreshing || loadingData}>
              {refreshing ? "Syncing..." : "Sync"}
            </button>
          </div>
        </header>

        {(loadingData || refreshing || actionBusy) && <div className="top-progress" />}
        {error ? (
          <div className="notice error row-notice">
            <span>{error}</span>
            <button type="button" onClick={() => loadData(period, true)}>
              Retry
            </button>
          </div>
        ) : null}

        {loadingData ? (
          <section className="loading-panel">
            <div className="spinner" />
            <p>Memuat data terbaru...</p>
          </section>
        ) : (
          <>
            {activeView === "overview" && (
              <div className="view-stack">
                <section className="metric-grid">
                  <MetricCard label="Total Balance" value={rupiah(totalBalance)} tone="neutral" />
                  <MetricCard label="Income" value={rupiah(summary.totals.income)} tone="good" />
                  <MetricCard label="Expense" value={rupiah(summary.totals.expense)} tone="bad" />
                  <MetricCard label="Net Cashflow" value={rupiah(summary.totals.net)} tone={summary.totals.net >= 0 ? "good" : "bad"} />
                </section>

                <section className="dashboard-grid">
                  <Panel title="Expense by Category" action={`${summary.byCategory.length} kategori`}>
                    {summary.byCategory.length ? (
                      <div className="chart-list">
                        {summary.byCategory.map((item) => {
                          const total = Number(item.total);
                          return (
                            <div className="chart-row" key={`${item.categoryName}-${item.categoryId}`}>
                              <div className="chart-row-top">
                                <span>{item.categoryName ?? "Uncategorized"}</span>
                                <strong>{rupiah(total)}</strong>
                              </div>
                              <div className="progress-track">
                                <span style={{ width: `${Math.max(4, (total / maxCategory) * 100)}%`, backgroundColor: item.color ?? "var(--color-accent)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState title="Belum ada pengeluaran" description="Transaksi expense akan muncul di grafik ini." />
                    )}
                  </Panel>

                  <Panel title="Wallets" action={`${wallets.length} dompet`}>
                    {wallets.length ? (
                      <div className="wallet-list">
                        {wallets.slice(0, 5).map((wallet) => (
                          <div className="wallet-row" key={wallet.id}>
                            <span className="wallet-dot" style={{ backgroundColor: wallet.color }} />
                            <div>
                              <strong>{wallet.name}</strong>
                              <span>{wallet.type}</span>
                            </div>
                            <b>{rupiah(wallet.balance)}</b>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="Belum ada wallet" description="Buat wallet pertama untuk mulai tracking." />
                    )}
                  </Panel>
                </section>

                <Panel title="Recent Transactions" action={`${transactions.length} item`}>
                  <TransactionTable
                    transactions={transactions.slice(0, 8)}
                    walletById={walletById}
                    categoryById={categoryById}
                    actionBusy={actionBusy}
                    onEdit={startEditTransaction}
                    onDelete={deleteTransaction}
                  />
                </Panel>
              </div>
            )}

            {activeView === "transactions" && (
              <div className="view-stack two-column">
                <Panel title={transactionForm.id ? "Edit Transaction" : "Add Transaction"} action={transactionForm.type}>
                  <form className="data-form" onSubmit={handleTransactionSubmit}>
                    <div className="segmented-row">
                      {(["expense", "income", "transfer"] as TransactionForm["type"][]).map((item) => (
                        <button
                          key={item}
                          className={transactionForm.type === item ? "segmented active" : "segmented"}
                          type="button"
                          onClick={() => setTransactionForm((current) => ({ ...current, type: item }))}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <label>
                      Amount
                      <input value={transactionForm.amount} inputMode="numeric" onChange={(event) => setTransactionForm((current) => ({ ...current, amount: event.target.value }))} placeholder="150000" required />
                    </label>
                    <label>
                      Wallet
                      <select value={transactionForm.walletId} onChange={(event) => setTransactionForm((current) => ({ ...current, walletId: event.target.value }))} required>
                        <option value="">Pilih wallet</option>
                        {wallets.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {transactionForm.type === "transfer" ? (
                      <label>
                        Target Wallet
                        <select
                          value={transactionForm.targetWalletId}
                          onChange={(event) => setTransactionForm((current) => ({ ...current, targetWalletId: event.target.value }))}
                          required
                        >
                          <option value="">Pilih tujuan</option>
                          {wallets
                            .filter((wallet) => wallet.id !== transactionForm.walletId)
                            .map((wallet) => (
                              <option key={wallet.id} value={wallet.id}>
                                {wallet.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : (
                      <label>
                        Category
                        <select
                          value={transactionForm.categoryId}
                          onChange={(event) => setTransactionForm((current) => ({ ...current, categoryId: event.target.value }))}
                          required
                        >
                          <option value="">Pilih kategori</option>
                          {categories
                            .filter((category) => category.kind === transactionForm.type)
                            .map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    {transactionForm.type === "expense" ? (
                      <label>
                        Budget
                        <select value={transactionForm.budgetId} onChange={(event) => setTransactionForm((current) => ({ ...current, budgetId: event.target.value }))}>
                          <option value="">No budget</option>
                          {budgets.map((budget) => (
                            <option key={budget.id} value={budget.id}>
                              {budget.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label>
                      Date
                      <input
                        value={transactionForm.happenedAt}
                        type="datetime-local"
                        onChange={(event) => setTransactionForm((current) => ({ ...current, happenedAt: event.target.value }))}
                        required
                      />
                    </label>
                    <label>
                      Note
                      <input value={transactionForm.note} onChange={(event) => setTransactionForm((current) => ({ ...current, note: event.target.value }))} placeholder="Makan siang" />
                    </label>
                    <div className="form-actions">
                      {transactionForm.id ? (
                        <button className="ghost-button" type="button" onClick={() => setTransactionForm(defaultTransactionForm())}>
                          Cancel
                        </button>
                      ) : null}
                      <button className="primary-button" disabled={actionBusy === "transaction"} type="submit">
                        {actionBusy === "transaction" ? "Saving..." : transactionForm.id ? "Save Changes" : "Save Transaction"}
                      </button>
                    </div>
                  </form>
                </Panel>

                <Panel title="Transactions" action={`${transactions.length} item`}>
                  <TransactionTable transactions={transactions} walletById={walletById} categoryById={categoryById} actionBusy={actionBusy} onEdit={startEditTransaction} onDelete={deleteTransaction} />
                </Panel>
              </div>
            )}

            {activeView === "wallets" && (
              <div className="view-stack two-column">
                <Panel title="Add Wallet" action="IDR">
                  <form className="data-form" onSubmit={handleWalletSubmit}>
                    <label>
                      Wallet name
                      <input value={walletName} onChange={(event) => setWalletName(event.target.value)} placeholder="BCA, Cash, GoPay" required />
                    </label>
                    <label>
                      Starting balance
                      <input value={walletBalance} onChange={(event) => setWalletBalance(event.target.value)} inputMode="numeric" placeholder="500000" />
                    </label>
                    <button className="primary-button" disabled={actionBusy === "wallet"} type="submit">
                      {actionBusy === "wallet" ? "Saving..." : "Add Wallet"}
                    </button>
                  </form>
                </Panel>

                <Panel title="Wallet List" action={`${wallets.length} dompet`}>
                  <div className="card-list">
                    {wallets.map((wallet) => (
                      <article className="entity-card" key={wallet.id}>
                        <span className="wallet-dot large" style={{ backgroundColor: wallet.color }} />
                        <div>
                          <strong>{wallet.name}</strong>
                          <span>{wallet.type}</span>
                        </div>
                        <b>{rupiah(wallet.balance)}</b>
                        <button className="danger-button" disabled={actionBusy === `delete-wallet-${wallet.id}`} type="button" onClick={() => deleteWallet(wallet.id)}>
                          {actionBusy === `delete-wallet-${wallet.id}` ? "..." : "Delete"}
                        </button>
                      </article>
                    ))}
                    {!wallets.length ? <EmptyState title="Belum ada wallet" description="Tambahkan wallet agar transaksi bisa dicatat." /> : null}
                  </div>
                </Panel>
              </div>
            )}

            {activeView === "budgets" && (
              <div className="view-stack two-column">
                <Panel title="Add Budget" action={budgetPeriod}>
                  <form className="data-form" onSubmit={handleBudgetSubmit}>
                    <label>
                      Budget name
                      <input value={budgetName} onChange={(event) => setBudgetName(event.target.value)} placeholder="Makan bulanan" required />
                    </label>
                    <label>
                      Limit
                      <input value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} inputMode="numeric" placeholder="1500000" required />
                    </label>
                    <label>
                      Period
                      <select value={budgetPeriod} onChange={(event) => setBudgetPeriod(event.target.value as "daily" | "weekly" | "monthly")}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                    <button className="primary-button" disabled={actionBusy === "budget"} type="submit">
                      {actionBusy === "budget" ? "Saving..." : "Add Budget"}
                    </button>
                  </form>
                </Panel>

                <Panel title="Budget List" action={`${budgets.length} budget`}>
                  <div className="card-list">
                    {budgets.map((budget) => {
                      const usage = budgetUsageById.get(budget.id);
                      const used = Number(usage?.used ?? 0);
                      const limit = Number(budget.amount);
                      const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                      return (
                        <article className="budget-card" key={budget.id}>
                          <div className="budget-heading">
                            <div>
                              <strong>{budget.name}</strong>
                              <span>{budget.period}</span>
                            </div>
                            <b>{pct}%</b>
                          </div>
                          <div className="progress-track">
                            <span className={pct > 100 ? "bad-fill" : pct > 80 ? "warn-fill" : ""} style={{ width: `${Math.max(3, pct)}%` }} />
                          </div>
                          <div className="budget-footer">
                            <span>
                              {rupiah(used)} / {rupiah(limit)}
                            </span>
                            <button className="danger-button" disabled={actionBusy === `delete-budget-${budget.id}`} type="button" onClick={() => deleteBudget(budget.id)}>
                              {actionBusy === `delete-budget-${budget.id}` ? "..." : "Delete"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {!budgets.length ? <EmptyState title="Belum ada budget" description="Buat budget untuk menjaga pengeluaran." /> : null}
                  </div>
                </Panel>
              </div>
            )}

            {activeView === "reports" && (
              <div className="view-stack dashboard-grid">
                <Panel title="By Category" action={period}>
                  {summary.byCategory.length ? (
                    <div className="chart-list">
                      {summary.byCategory.map((item) => (
                        <div className="chart-row" key={`${item.categoryName}-${item.categoryId}`}>
                          <div className="chart-row-top">
                            <span>{item.categoryName ?? "Uncategorized"}</span>
                            <strong>{rupiah(item.total)}</strong>
                          </div>
                          <div className="progress-track">
                            <span style={{ width: `${Math.max(4, (Number(item.total) / maxCategory) * 100)}%`, backgroundColor: item.color ?? "var(--color-accent)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Belum ada kategori" description="Expense per kategori akan muncul di sini." />
                  )}
                </Panel>

                <Panel title="By Wallet" action={period}>
                  {summary.byWallet.length ? (
                    <div className="wallet-list">
                      {summary.byWallet.map((item, index) => (
                        <div className="wallet-row" key={`${item.walletName}-${index}`}>
                          <span className="wallet-dot" style={{ backgroundColor: item.color ?? "var(--color-text-muted)" }} />
                          <div>
                            <strong>{item.walletName ?? "Unknown"}</strong>
                            <span>Expense</span>
                          </div>
                          <b>{rupiah(item.total)}</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Belum ada wallet report" description="Expense per wallet akan muncul setelah ada transaksi." />
                  )}
                </Panel>
              </div>
            )}

            {activeView === "profile" && (
              <Panel title="Profile" action="Supabase Auth">
                <div className="profile-panel">
                  <div className="avatar">{session.user.email?.charAt(0).toUpperCase() ?? "U"}</div>
                  <div>
                    <strong>{session.user.email}</strong>
                    <span>Session web ini memakai Supabase user yang sama dengan mobile.</span>
                  </div>
                  <button className="danger-button" type="button" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </div>
              </Panel>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function ProductNav({
  activeView,
  email,
  mode,
  onNavigate,
  onSignOut,
}: {
  activeView?: ViewKey;
  email?: string;
  mode: "marketing" | "app";
  onNavigate?: (view: ViewKey) => void;
  onSignOut?: () => void;
}) {
  return (
    <header className={`product-nav ${mode === "app" ? "app-nav" : "marketing-nav"}`}>
      {mode === "marketing" ? (
        <a className="nav-brand" href="#top">
          <span className="brand-mark">PF</span>
          <span>PocketFlow</span>
        </a>
      ) : (
        <div className="nav-brand" aria-label="PocketFlow">
          <span className="brand-mark">PF</span>
          <span>PocketFlow</span>
        </div>
      )}

      {mode === "marketing" ? (
        <nav className="nav-links" aria-label="PocketFlow website navigation">
          <a href="#features">Features</a>
          <a href="#auth-panel">Login</a>
          <a href="#footer">Docs</a>
        </nav>
      ) : (
        <nav className="nav-links app-tabs" aria-label="PocketFlow app navigation">
          {navigationItems.map(([key, label]) => (
            <button key={key} className={activeView === key ? "nav-tab active" : "nav-tab"} type="button" onClick={() => onNavigate?.(key)}>
              {label}
            </button>
          ))}
        </nav>
      )}

      <div className="nav-actions">
        {mode === "app" ? <span className="nav-email">{email}</span> : null}
        {mode === "app" ? (
          <button className="ghost-button" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        ) : (
          <a className="primary-button nav-cta" href="#auth-panel">
            Open app
          </a>
        )}
      </div>
    </header>
  );
}

function ProductFooter() {
  return (
    <footer className="product-footer" id="footer">
      <div>
        <a className="nav-brand" href="#top">
          <span className="brand-mark">PF</span>
          <span>PocketFlow</span>
        </a>
        <p>Finance tracking for the moments you actually spend money.</p>
      </div>
      <div>
        <strong>Product</strong>
        <a href="#features">Features</a>
        <a href="#auth-panel">Login</a>
      </div>
      <div>
        <strong>Stack</strong>
        <span>Next.js</span>
        <span>Supabase</span>
      </div>
      <div>
        <strong>Mobile</strong>
        <span>Expo Go</span>
        <span>React Native</span>
      </div>
    </footer>
  );
}

function viewTitle(view: ViewKey) {
  const map: Record<ViewKey, string> = {
    overview: "Overview",
    transactions: "Transactions",
    wallets: "Wallets",
    budgets: "Budgets",
    reports: "Reports",
    profile: "Profile",
  };
  return map[view];
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "neutral" | "good" | "bad" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {action ? <span>{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function TransactionTable({
  transactions,
  walletById,
  categoryById,
  actionBusy,
  onEdit,
  onDelete,
}: {
  transactions: Transaction[];
  walletById: Map<string, Wallet>;
  categoryById: Map<string, Category>;
  actionBusy: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  if (!transactions.length) {
    return <EmptyState title="Belum ada transaksi" description="Tambah transaksi pertama dari form web atau mobile." />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Wallet</th>
            <th>Category</th>
            <th>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "income";
            const wallet = walletById.get(transaction.walletId);
            const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : null;
            return (
              <tr key={transaction.id}>
                <td>
                  <div className="table-primary">
                    <strong>{transaction.note || transaction.type}</strong>
                    <span>{shortDate(transaction.happenedAt)}</span>
                  </div>
                </td>
                <td>{wallet?.name ?? "-"}</td>
                <td>{transaction.type === "transfer" ? "Transfer" : category?.name ?? "-"}</td>
                <td>
                  <b className={isIncome ? "amount good-text" : "amount bad-text"}>
                    {isIncome ? "+" : "-"}
                    {rupiah(transaction.amount)}
                  </b>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" type="button" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
                      Edit
                    </button>
                    <button className="icon-button danger" disabled={actionBusy === `delete-tx-${transaction.id}`} type="button" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction">
                      {actionBusy === `delete-tx-${transaction.id}` ? "..." : "Del"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
