"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
type ThemeMode = "light" | "dark";

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

const marketingFeatures = [
  {
    title: "Wallet clarity",
    description: "Cash, bank, and e-wallet balances stay separated so every spend lands in the right place.",
  },
  {
    title: "Budget pressure",
    description: "Daily, weekly, and monthly limits show what is still safe to spend.",
  },
  {
    title: "Shared account",
    description: "Web and mobile use the same Supabase identity, so the ledger follows your real usage.",
  },
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

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const storedTheme = window.localStorage.getItem("pocketflow-theme");
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [themeReady, setThemeReady] = useState(false);

  const [transactionForm, setTransactionForm] = useState<TransactionForm>(() => defaultTransactionForm());
  const [walletName, setWalletName] = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  const [budgetName, setBudgetName] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetPeriod, setBudgetPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    setThemeReady(true);
    document.documentElement.dataset.theme = initialTheme;
    document.documentElement.style.colorScheme = initialTheme;
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("pocketflow-theme", theme);
  }, [theme, themeReady]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

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
      if (!token) throw new Error("Session expired. Please sign in again.");

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
        setError(loadError instanceof Error ? loadError.message : "Failed to load data.");
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
        setAuthMessage("Account created. If email confirmation is required, check your inbox before signing in.");
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
      setError("Amount and wallet are required.");
      return;
    }

    if (transactionForm.type === "transfer" && (!transactionForm.targetWalletId || transactionForm.targetWalletId === transactionForm.walletId)) {
      setError("Transfers need a different destination wallet.");
      return;
    }

    if (transactionForm.type !== "transfer" && !transactionForm.categoryId) {
      setError("Please choose a category.");
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
      setError(mutationError instanceof Error ? mutationError.message : "Failed to save transaction.");
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
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete transaction.");
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
      setError(walletError instanceof Error ? walletError.message : "Failed to save wallet.");
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
      setError(walletError instanceof Error ? walletError.message : "Failed to delete wallet.");
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
      setError(budgetError instanceof Error ? budgetError.message : "Failed to save budget.");
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
      setError(budgetError instanceof Error ? budgetError.message : "Failed to delete budget.");
    } finally {
      setActionBusy("");
    }
  }

  if (!config.isConfigured) {
    return (
      <main className="site-shell">
        <ProductNav mode="marketing" theme={theme} onToggleTheme={toggleTheme} />
        <section className="auth-state-section">
          <div className="auth-card system-card">
            <div className="brand-lockup">
              <span className="brand-mark">PF</span>
              <div>
                <h1>PocketFlow Web</h1>
                <p>Supabase environment is incomplete.</p>
              </div>
            </div>
            <div className="notice error">
              Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the `apps/api` environment. Once set, the same account works across mobile and web.
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="site-shell">
        <ProductNav mode="marketing" theme={theme} onToggleTheme={toggleTheme} />
        <section className="auth-state-section">
          <div className="auth-card compact-card system-card">
            <div className="skeleton-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="muted">Loading your PocketFlow session…</p>
          </div>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="site-shell">
        <ProductNav mode="marketing" theme={theme} onToggleTheme={toggleTheme} />
        <section className="landing-hero" id="top">
          <div className="hero-copy animate-in">
            <h1>Daily cashflow, kept in order.</h1>
            <p>Track wallets, budgets, and transactions from web or iPhone with one synced Supabase account.</p>
            <div className="hero-actions">
              <a className="primary-button" href="#auth-panel">
                Start tracking
              </a>
              <a className="ghost-button" href="#features">
                See features
              </a>
            </div>
          </div>

          <section className="auth-card hero-auth system-card animate-in" id="auth-panel" aria-label="PocketFlow authentication">
            <div className="brand-lockup">
              <span className="brand-mark">PF</span>
              <div>
                <h2>PocketFlow</h2>
                <p>One login keeps web and mobile in sync.</p>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" required />
              </label>
              <label>
                Password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </label>
              {authMessage ? <div className={authMessage.includes("created") ? "notice" : "notice error"}>{authMessage}</div> : null}
              <button className="primary-button wide" disabled={actionBusy === "auth"} type="submit">
                {actionBusy === "auth" ? "Memproses..." : authMode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <button className="ghost-button wide" type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>
              {authMode === "signin" ? "Create an account" : "I already have an account"}
            </button>
          </section>
        </section>

        <section className="product-preview-section" aria-label="PocketFlow dashboard preview">
          <LandingPreview />
        </section>

        <section className="feature-section" id="features">
          <div className="section-heading">
            <h2>Made for the moment money moves.</h2>
            <p>Open the app, choose the wallet, attach a category or budget, and keep the review surface calm.</p>
          </div>
          <div className="feature-grid">
            {marketingFeatures.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <div>
            <h2>A shared ledger for web and mobile.</h2>
            <p>Supabase Auth keeps the same user attached to every API request, so the dashboard and Expo app stay aligned.</p>
          </div>
          <div className="detail-visual" aria-label="PocketFlow transaction anatomy">
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
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <section className="workspace">
        <header className="command-header">
          <div>
            <span className="workspace-label">{activeView === "overview" ? "Dashboard" : "Workspace"}</span>
            <h1>{activeView === "overview" ? "Overview" : currentViewTitle}</h1>
            <p>
              {activeView === "overview"
                ? "Balances, spending, and recent activity in one clean workspace."
                : "Synced with the same account you use on mobile."}
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
            <div className="skeleton-stack dashboard-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <p className="muted">Loading the latest data…</p>
          </section>
        ) : (
          <>
            {activeView === "overview" && (
              <div className="view-stack">
                <section className="overview-band">
                  <article className="balance-panel">
                    <span>Total Balance</span>
                    <strong>{rupiah(totalBalance)}</strong>
                    <p>
                      {wallets.length ? `${wallets.length} active ${wallets.length === 1 ? "wallet" : "wallets"} tracked for the ${period} period.` : "Create your first wallet to start tracking balances."}
                    </p>
                  </article>
                  <div className="metric-grid">
                    <MetricCard label="Income" value={rupiah(summary.totals.income)} tone="good" />
                    <MetricCard label="Expense" value={rupiah(summary.totals.expense)} tone="bad" />
                    <MetricCard label="Net Cashflow" value={rupiah(summary.totals.net)} tone={summary.totals.net >= 0 ? "good" : "bad"} />
                  </div>
                </section>

                <section className="dashboard-grid">
                  <Panel title="Expense by Category" action={`${summary.byCategory.length} categories`}>
                    <CategoryChart items={summary.byCategory} maxCategory={maxCategory} />
                  </Panel>

                  <Panel title="Wallets" action={`${wallets.length} wallets`}>
                    <WalletList wallets={wallets.slice(0, 5)} />
                  </Panel>
                </section>

                <Panel title="Recent Transactions" action={`${transactions.length} items`} className="table-panel">
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
                        <option value="">Select wallet</option>
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
                          <option value="">Select destination</option>
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
                          <option value="">Select category</option>
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
                      <input value={transactionForm.note} onChange={(event) => setTransactionForm((current) => ({ ...current, note: event.target.value }))} placeholder="Lunch" />
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

                <Panel title="Transactions" action={`${transactions.length} items`} className="table-panel">
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

                <Panel title="Wallet List" action={`${wallets.length} wallets`}>
                  <div className="card-list">
                    {wallets.map((wallet) => (
                      <article className="entity-row" key={wallet.id}>
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
                    {!wallets.length ? <EmptyState title="No wallets yet" description="Add a wallet so transactions can be recorded." /> : null}
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
                      <input value={budgetName} onChange={(event) => setBudgetName(event.target.value)} placeholder="Monthly food" required />
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

                <Panel title="Budget List" action={`${budgets.length} budgets`}>
                  <div className="card-list">
                    {budgets.map((budget) => {
                      const usage = budgetUsageById.get(budget.id);
                      const used = Number(usage?.used ?? 0);
                      const limit = Number(budget.amount);
                      const rawPct = limit ? Math.round((used / limit) * 100) : 0;
                      const barPct = Math.min(100, rawPct);
                      return (
                        <article className="budget-card" key={budget.id}>
                          <div className="budget-heading">
                            <div>
                              <strong>{budget.name}</strong>
                              <span>{budget.period}</span>
                            </div>
                            <b>{rawPct}%</b>
                          </div>
                          <div className="progress-track">
                            <span className={rawPct > 100 ? "bad-fill" : rawPct > 80 ? "warn-fill" : ""} style={{ width: `${Math.max(3, barPct)}%` }} />
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
                    {!budgets.length ? <EmptyState title="No budgets yet" description="Create a budget to keep spending in check." /> : null}
                  </div>
                </Panel>
              </div>
            )}

            {activeView === "reports" && (
              <div className="view-stack dashboard-grid">
                <Panel title="By Category" action={period}>
                  <CategoryChart items={summary.byCategory} maxCategory={maxCategory} />
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
                    <EmptyState title="No wallet data yet" description="Spending per wallet appears once you add transactions." />
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
                    <span>This web session uses the same account as your mobile app.</span>
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
  theme,
  onToggleTheme,
}: {
  activeView?: ViewKey;
  email?: string;
  mode: "marketing" | "app";
  onNavigate?: (view: ViewKey) => void;
  onSignOut?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
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
              <span aria-hidden="true">
                <NavIcon view={key} />
              </span>
              <b>{label}</b>
            </button>
          ))}
        </nav>
      )}

      <div className="nav-actions">
        {mode === "app" ? <span className="nav-email">{email}</span> : null}
        <button className="theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          <span className="theme-toggle-dot" aria-hidden="true" />
          <span>{theme === "light" ? "Light" : "Dark"}</span>
        </button>
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

function LandingPreview() {
  const previewTransactions = [
    ["Lunch", "GoPay", "Food", "-Rp128.000"],
    ["Client invoice", "BCA", "Income", "+Rp4.800.000"],
    ["Coffee", "Cash", "Daily", "-Rp32.000"],
  ];

  return (
    <div className="preview-shell">
      <div className="preview-header">
        <div>
          <span>PocketFlow preview</span>
          <strong>Monthly overview</strong>
        </div>
        <button className="secondary-button" type="button">
          Sync
        </button>
      </div>
      <div className="preview-metrics">
        <div>
          <span>Total Balance</span>
          <strong>{rupiah(18450000)}</strong>
        </div>
        <div>
          <span>Net</span>
          <strong>{rupiah(1620000)}</strong>
        </div>
        <div>
          <span>Expense</span>
          <strong>{rupiah(3180000)}</strong>
        </div>
      </div>
      <div className="preview-grid">
        <div className="preview-chart" aria-hidden="true">
          {[72, 48, 62, 35].map((height, index) => (
            <span key={height} style={{ height: `${height + index * 2}%` }} />
          ))}
        </div>
        <div className="preview-table">
          {previewTransactions.map(([note, wallet, category, amount]) => (
            <div key={note}>
              <span>{note}</span>
              <small>{wallet} / {category}</small>
              <strong className={amount.startsWith("+") ? "good-text" : "bad-text"}>{amount}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NavIcon({ view }: { view: ViewKey }) {
  const paths: Record<ViewKey, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    transactions: (
      <>
        <path d="M7 7h13" />
        <path d="m17 4 3 3-3 3" />
        <path d="M17 17H4" />
        <path d="m7 20-3-3 3-3" />
      </>
    ),
    wallets: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M16 12h.01" />
      </>
    ),
    budgets: (
      <>
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="6" rx="1" />
        <rect x="13" y="7" width="3" height="10" rx="1" />
      </>
    ),
    reports: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9v9z" />
        <path d="M21 9a9 9 0 0 0-6-6v6z" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[view]}
    </svg>
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

function Panel({ title, action, children, className = "" }: { title: string; action?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        {action ? <span>{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

function CategoryChart({ items, maxCategory }: { items: Summary["byCategory"]; maxCategory: number }) {
  if (!items.length) {
    return <EmptyState title="No spending yet" description="Expense transactions will appear in this chart." />;
  }

  return (
    <div className="chart-list">
      {items.map((item) => {
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
  );
}

function WalletList({ wallets }: { wallets: Wallet[] }) {
  if (!wallets.length) {
    return <EmptyState title="No wallets yet" description="Create your first wallet to start tracking." />;
  }

  return (
    <div className="wallet-list">
      {wallets.map((wallet) => (
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
    return <EmptyState title="No transactions yet" description="Add your first transaction from web or mobile." />;
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
