import { supabase, demoMode } from "./supabase";
import { demoBudgets, demoCategories, demoSummary, demoTransactions, demoWallets } from "./demo-data";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers
  };
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: requestHeaders as unknown as HeadersInit
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export const api = {
  async wallets() {
    if (demoMode) return { wallets: demoWallets };
    return request<{ wallets: typeof demoWallets }>("/api/wallets");
  },
  async categories() {
    if (demoMode) return { categories: demoCategories };
    return request<{ categories: typeof demoCategories }>("/api/categories");
  },
  async budgets() {
    if (demoMode) return { budgets: demoBudgets };
    return request<{ budgets: typeof demoBudgets }>("/api/budgets");
  },
  async transactions(period = "monthly") {
    if (demoMode) return { transactions: demoTransactions };
    return request<{ transactions: typeof demoTransactions }>(`/api/transactions?period=${period}`);
  },
  async summary(period = "monthly") {
    if (demoMode) return demoSummary;
    return request<typeof demoSummary>(`/api/reports/summary?period=${period}`);
  },
  async createWallet(input: { name: string; type: string; balance: number; color: string }) {
    if (demoMode) return { wallet: { id: String(Date.now()), currency: "IDR", ...input, balance: String(input.balance) } };
    return request("/api/wallets", { method: "POST", body: JSON.stringify(input) });
  },
  async createBudget(input: { name: string; amount: number; period: string; startsOn: string; categoryId?: string | null }) {
    if (demoMode) return { budget: { id: String(Date.now()), ...input, amount: String(input.amount) } };
    return request("/api/budgets", { method: "POST", body: JSON.stringify(input) });
  },
  async createTransaction(input: Record<string, unknown>) {
    if (demoMode) return { transaction: { id: String(Date.now()), ...input } };
    return request("/api/transactions", { method: "POST", body: JSON.stringify(input) });
  }
};
