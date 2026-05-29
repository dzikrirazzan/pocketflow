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
    const text = await response.text();
    let message = "Request failed";
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
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
  async transactions(options: string | { period?: string; date?: string; startDate?: string; endDate?: string } = "monthly") {
    if (demoMode) return { transactions: demoTransactions };
    const params = new URLSearchParams();
    if (typeof options === "string") {
      params.append("period", options);
    } else {
      if (options.period) params.append("period", options.period);
      if (options.date) params.append("date", options.date);
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);
    }
    return request<{ transactions: typeof demoTransactions }>(`/api/transactions?${params.toString()}`);
  },
  async summary(options: string | { period?: string; date?: string; startDate?: string; endDate?: string } = "monthly") {
    if (demoMode) return demoSummary;
    const params = new URLSearchParams();
    if (typeof options === "string") {
      params.append("period", options);
    } else {
      if (options.period) params.append("period", options.period);
      if (options.date) params.append("date", options.date);
      if (options.startDate) params.append("startDate", options.startDate);
      if (options.endDate) params.append("endDate", options.endDate);
    }
    return request<typeof demoSummary>(`/api/reports/summary?${params.toString()}`);
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
  },
  async deleteTransaction(id: string) {
    if (demoMode) return { ok: true };
    return request(`/api/transactions/${id}`, { method: "DELETE" });
  },
  async updateTransaction(id: string, input: Record<string, unknown>) {
    if (demoMode) return { transaction: { id, ...input } };
    return request(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  async deleteWallet(id: string) {
    if (demoMode) return { ok: true };
    return request(`/api/wallets/${id}`, { method: "DELETE" });
  },
  async updateWallet(id: string, input: Record<string, unknown>) {
    if (demoMode) return { wallet: { id, ...input } };
    return request(`/api/wallets/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  async deleteBudget(id: string) {
    if (demoMode) return { ok: true };
    return request(`/api/budgets/${id}`, { method: "DELETE" });
  },
  async updateBudget(id: string, input: Record<string, unknown>) {
    if (demoMode) return { budget: { id, ...input } };
    return request(`/api/budgets/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },
  async deleteCategory(id: string) {
    if (demoMode) return { ok: true };
    return request(`/api/categories/${id}`, { method: "DELETE" });
  },
};
