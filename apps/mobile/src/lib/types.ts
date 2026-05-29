export type Wallet = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: string;
  color: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: "income" | "expense";
};

export type Budget = {
  id: string;
  name: string;
  amount: string;
  period: "daily" | "weekly" | "monthly";
  categoryId?: string | null;
};

export type Transaction = {
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

export type Summary = {
  totals: {
    income: number;
    expense: number;
    net: number;
  };
  byCategory: Array<{ categoryId?: string | null; categoryName: string | null; color: string | null; total: string }>;
  byWallet: Array<{ walletName: string | null; color: string | null; total: string }>;
  budgetUsage: Array<{ budgetId: string; name: string; amount: string; period: string; used: string }>;
};
