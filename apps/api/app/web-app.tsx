"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

const CashFlowChart = dynamic(() => import("./cash-flow-chart"), {
  ssr: false,
  loading: () => <div className="chart-card-body chart-loading" aria-hidden="true" />,
});

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

const marketingFeatures: Array<{ icon: "wallet" | "target" | "sync"; title: string; description: string }> = [
  {
    icon: "wallet",
    title: "Every wallet in one place",
    description: "Cash, bank, and e-wallet balances stay separated, so every spend lands in the right account.",
  },
  {
    icon: "target",
    title: "Budgets that hold the line",
    description: "Daily, weekly, and monthly limits show what is still safe to spend at a glance.",
  },
  {
    icon: "sync",
    title: "Synced web and mobile",
    description: "One account powers the dashboard and the iPhone app, so your ledger is always current.",
  },
];

const heroHighlights = ["Bank, cash & e-wallets", "Daily, weekly & monthly budgets", "Web + iOS, always in sync"];

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

type CashFlowPoint = { label: string; income: number; expense: number; net: number };

const cashFlowPreviewSeries: CashFlowPoint[] = [
  { label: "Jan", income: 7200000, expense: 4100000, net: 3100000 },
  { label: "Feb", income: 6800000, expense: 4600000, net: 2200000 },
  { label: "Mar", income: 9100000, expense: 5200000, net: 3900000 },
  { label: "Apr", income: 8200000, expense: 3800000, net: 4400000 },
  { label: "May", income: 9600000, expense: 5400000, net: 4200000 },
  { label: "Jun", income: 8800000, expense: 4300000, net: 4500000 },
];

// Derives a monthly income/expense/net series from the already-loaded transactions.
// No extra fetch and no backend change — swap the source here if a dedicated
// time-series endpoint is added later.
function buildCashFlowSeries(transactionList: Transaction[]): CashFlowPoint[] {
  const buckets = new Map<string, { date: Date; income: number; expense: number }>();

  for (const transaction of transactionList) {
    if (transaction.type === "transfer") continue;
    const when = new Date(transaction.happenedAt);
    if (Number.isNaN(when.getTime())) continue;
    const key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { date: new Date(when.getFullYear(), when.getMonth(), 1), income: 0, expense: 0 };
      buckets.set(key, bucket);
    }
    const amount = Number(transaction.amount) || 0;
    if (transaction.type === "income") bucket.income += amount;
    else bucket.expense += amount;
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((bucket) => ({
      label: bucket.date.toLocaleDateString("en-US", { month: "short" }),
      income: Math.round(bucket.income),
      expense: Math.round(bucket.expense),
      net: Math.round(bucket.income - bucket.expense),
    }));
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const storedTheme = window.localStorage.getItem("pocketflow-theme");
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;

  // Default to the calm dark editorial theme on first visit; the toggle still persists a choice.
  return "dark";
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
  const cashFlowSeries = useMemo(() => buildCashFlowSeries(transactions), [transactions]);
  const cashFlowIsPreview = cashFlowSeries.length === 0;
  const currentViewTitle = viewTitle(activeView);
  const currentPeriodPhrase = periodPhrase(period);

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
        <div className="hero-glow" aria-hidden="true" />
        <section className="landing-hero" id="top">
          <div className="hero-copy animate-in">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              Personal finance, but calmer
            </span>
            <h1>
              Welcome to <span className="accent-italic">calmer</span> money.
            </h1>
            <p>
              PocketFlow keeps your wallets, budgets, and spending in one quiet place — beautifully organized and synced across web and
              iPhone.
            </p>
            <div className="hero-actions">
              <a className="primary-button lg" href="#auth-panel">
                Start for free
              </a>
              <a className="ghost-button lg" href="#preview">
                See the dashboard
              </a>
            </div>
            <ul className="hero-highlights">
              {heroHighlights.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <section className="auth-card hero-auth animate-in" id="auth-panel" aria-label="PocketFlow authentication">
            <div className="auth-card-head">
              <div className="brand-lockup">
                <span className="brand-mark">PF</span>
                <div>
                  <h2>{authMode === "signin" ? "Welcome back" : "Create your account"}</h2>
                  <p>One login keeps web and mobile in sync.</p>
                </div>
              </div>
              <div className="auth-switch" role="tablist" aria-label="Authentication mode">
                <button type="button" role="tab" aria-selected={authMode === "signin"} className={authMode === "signin" ? "active" : ""} onClick={() => setAuthMode("signin")}>
                  Sign in
                </button>
                <button type="button" role="tab" aria-selected={authMode === "signup"} className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>
                  Sign up
                </button>
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
                {actionBusy === "auth" ? "Processing…" : authMode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </section>
        </section>

        <section className="product-preview-section" id="preview" aria-label="PocketFlow dashboard preview">
          <div className="section-heading center">
            <span className="eyebrow">
              <span className="eyebrow-dot" aria-hidden="true" />
              The dashboard
            </span>
            <h2>Clarity the moment you open it.</h2>
            <p>Balances, cash flow, and recent activity — organized so you always know where you stand.</p>
          </div>
          <LandingPreview />
        </section>

        <section className="feature-section" id="features">
          <div className="feature-grid">
            {marketingFeatures.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <FeatureIcon icon={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-banner"><div className="cta-glow" aria-hidden="true" />
          <div>
            <h2>Start from your next transaction.</h2>
            <p>Free to use. Your web and mobile stay perfectly in sync.</p>
          </div>
          <a className="primary-button lg" href="#auth-panel">
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
            <span className="workspace-label">{activeView === "overview" ? "Welcome back" : "Workspace"}</span>
            <h1>{activeView === "overview" ? "Dashboard" : currentViewTitle}</h1>
            <p>
              {activeView === "overview"
                ? "Track your income, expenses, and balance."
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
            {activeView === "overview" || activeView === "transactions" ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setTransactionForm(defaultTransactionForm());
                  setActiveView("transactions");
                }}
              >
                + Add transaction
              </button>
            ) : null}
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
              <div className="view-stack animate-enter">
                <section className="stat-grid">
                  <StatCard
                    label="Total Balance"
                    value={rupiah(totalBalance)}
                    helper={wallets.length ? `${wallets.length} active ${wallets.length === 1 ? "wallet" : "wallets"}` : "No wallets yet"}
                    tone="brand"
                  />
                  <StatCard label="Income" value={rupiah(summary.totals.income)} helper={currentPeriodPhrase} tone="income" />
                  <StatCard label="Expenses" value={rupiah(summary.totals.expense)} helper={currentPeriodPhrase} tone="expense" />
                  <StatCard
                    label="Net Savings"
                    value={rupiah(summary.totals.net)}
                    helper="Income − expenses"
                    tone={summary.totals.net >= 0 ? "income" : "expense"}
                  />
                </section>

                <ChartCard title="Cash Flow Overview" subtitle="Income, expenses, and balance trend over time.">
                  <div className="chart-preview-stack">
                    <CashFlowChart data={cashFlowIsPreview ? cashFlowPreviewSeries : cashFlowSeries} theme={theme} />
                    {cashFlowIsPreview ? (
                      <div className="chart-preview-note">
                        <strong>Preview data</strong>
                        <span>Add income and expense transactions to replace this with your cash flow.</span>
                      </div>
                    ) : null}
                  </div>
                </ChartCard>

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
              <div className="view-stack two-column animate-enter">
                <Panel title={transactionForm.id ? "Edit transaction" : "Add transaction"} action={transactionForm.type}>
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
                        {actionBusy === "transaction" ? "Saving..." : transactionForm.id ? "Save changes" : "Save transaction"}
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
                <Panel title="Add wallet" action="IDR">
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
                      {actionBusy === "wallet" ? "Saving..." : "Add wallet"}
                    </button>
                  </form>
                </Panel>

                <Panel title="Wallet list" action={`${wallets.length} wallets`}>
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
                <Panel title="Add budget" action={budgetPeriod}>
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
                      {actionBusy === "budget" ? "Saving..." : "Add budget"}
                    </button>
                  </form>
                </Panel>

                <Panel title="Budget list" action={`${budgets.length} budgets`}>
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
              <div className="view-stack dashboard-grid animate-enter">
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
                    Sign out
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
            Sign out
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
        <p>Finance tracking for the moments you actually spend money.</p><small className="footer-copy">© {new Date().getFullYear()} PocketFlow</small>
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
  const previewStats = [
    { label: "Total Balance", value: rupiah(18450000), tone: "brand" },
    { label: "Income", value: rupiah(8200000), tone: "income" },
    { label: "Expenses", value: rupiah(3180000), tone: "expense" },
    { label: "Net Savings", value: rupiah(5020000), tone: "income" },
  ] as const;

  const previewBars = [
    { income: 62, expense: 38 },
    { income: 74, expense: 45 },
    { income: 58, expense: 52 },
    { income: 86, expense: 40 },
    { income: 70, expense: 48 },
    { income: 92, expense: 44 },
  ];

  const previewTransactions = [
    { note: "Client invoice", meta: "BCA", badge: "Income", amount: "+Rp4.800.000", positive: true },
    { note: "Groceries", meta: "GoPay", badge: "Food", amount: "-Rp412.000", positive: false },
    { note: "Coffee", meta: "Cash", badge: "Daily", amount: "-Rp32.000", positive: false },
  ];

  const linePoints = previewBars
    .map((bar, index) => {
      const x = 8 + (index * (100 - 16)) / (previewBars.length - 1);
      const y = 70 - (bar.income - bar.expense) * 0.55;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="preview-frame">
      <div className="preview-chrome" aria-hidden="true">
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-url">app.pocketflow.id/dashboard</span>
      </div>
      <div className="preview-shell">
        <div className="preview-topbar">
          <div>
            <span className="preview-eyebrow">Welcome back</span>
            <strong>Dashboard</strong>
          </div>
          <div className="preview-period" aria-hidden="true">
            <span>Day</span>
            <span>Week</span>
            <span className="active">Month</span>
            <span>Year</span>
          </div>
        </div>

        <div className="preview-stats">
          {previewStats.map((stat) => (
            <div className={`preview-stat preview-${stat.tone}`} key={stat.label}>
              <span className="preview-stat-head">
                <i className="preview-stat-dot" aria-hidden="true" />
                {stat.label}
              </span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="preview-chart-card">
          <div className="preview-chart-head">
            <strong>Cash Flow Overview</strong>
            <div className="preview-legend" aria-hidden="true">
              <span><i className="dot-income" />Income</span>
              <span><i className="dot-expense" />Expenses</span>
              <span><i className="dot-net" />Net</span>
            </div>
          </div>
          <div className="preview-chart" aria-hidden="true">
            <div className="preview-bars">
              {previewBars.map((bar, index) => (
                <div className="preview-bar-group" key={index}>
                  <span className="preview-bar income" style={{ height: `${bar.income}%` }} />
                  <span className="preview-bar expense" style={{ height: `${bar.expense}%` }} />
                </div>
              ))}
            </div>
            <svg className="preview-line" viewBox="0 0 100 80" preserveAspectRatio="none">
              <polyline points={linePoints} fill="none" stroke="#f76f53" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="preview-list" aria-hidden="true">
          {previewTransactions.map((item) => (
            <div className="preview-row" key={item.note}>
              <span className="preview-avatar">{item.note.charAt(0)}</span>
              <div className="preview-row-main">
                <strong>{item.note}</strong>
                <span>{item.meta}</span>
              </div>
              <span className="preview-badge">{item.badge}</span>
              <strong className={item.positive ? "good-text" : "bad-text"}>{item.amount}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function FeatureIcon({ icon }: { icon: "wallet" | "target" | "sync" }) {
  const paths: Record<typeof icon, ReactNode> = {
    wallet: (
      <>
        <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M16 12h.01" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </>
    ),
    sync: (
      <>
        <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" />
        <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" />
        <path d="M21 3v5h-5" />
        <path d="M3 21v-5h5" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[icon]}
    </svg>
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

function periodPhrase(period: Period) {
  const map: Record<Period, string> = {
    daily: "Today",
    weekly: "This week",
    monthly: "This month",
    yearly: "This year",
  };
  return map[period];
}

function StatCard({ label, value, helper, tone }: { label: string; value: string; helper?: string; tone: "brand" | "income" | "expense" }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-card-accent" aria-hidden="true" />
      <div className="stat-card-head">
        <span className="stat-dot" aria-hidden="true" />
        <span className="stat-label">{label}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      {helper ? <span className="stat-helper">{helper}</span> : null}
    </article>
  );
}

const cashFlowSeriesKeys = [
  { key: "income", label: "Income", color: "#54a45a" },
  { key: "expense", label: "Expenses", color: "#d65a4a" },
  { key: "net", label: "Net", color: "#f76f53" },
] as const;

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="panel chart-card">
      <div className="chart-card-header">
        <div className="chart-card-heading">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="chart-legend">
          {cashFlowSeriesKeys.map((entry) => (
            <span className="chart-legend-item" key={entry.key}>
              <span className="chart-legend-dot" style={{ background: entry.color }} />
              {entry.label}
            </span>
          ))}
        </div>
      </div>
      {children}
    </section>
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
      <svg className="empty-state-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="10" width="36" height="28" rx="4" />
        <path d="M6 18h36" />
        <circle cx="24" cy="30" r="4" />
      </svg>
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
      <table aria-label="Transaction list">
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
            const isExpense = transaction.type === "expense";
            const wallet = walletById.get(transaction.walletId);
            const category = transaction.categoryId ? categoryById.get(transaction.categoryId) : null;
            const amountPrefix = isIncome ? "+" : isExpense ? "-" : "";
            const amountClass = isIncome ? "good-text" : isExpense ? "bad-text" : "neutral-text";
            return (
              <tr key={transaction.id}>
                <td>
                  <div className="table-primary">
                    <strong>{transaction.note || transaction.type}</strong>
                    <span>{shortDate(transaction.happenedAt)}</span>
                  </div>
                </td>
                <td>{wallet?.name ?? "-"}</td>
                <td>
                  {transaction.type === "transfer" ? (
                    <span className="badge badge-neutral">Transfer</span>
                  ) : category ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${category.color} 14%, var(--color-bg-surface))`,
                        color: category.color,
                      }}
                    >
                      {category.name}
                    </span>
                  ) : (
                    <span className="badge badge-neutral">Uncategorized</span>
                  )}
                </td>
                <td>
                  <b className={`amount ${amountClass}`}>{`${amountPrefix}${rupiah(transaction.amount)}`}</b>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" type="button" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
                      Edit
                    </button>
                    <button className="icon-button danger" disabled={actionBusy === `delete-tx-${transaction.id}`} type="button" onClick={() => onDelete(transaction.id)} aria-label="Delete transaction">
                      {actionBusy === `delete-tx-${transaction.id}` ? "..." : "Delete"}
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
