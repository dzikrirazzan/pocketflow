import { Budget, Category, Summary, Transaction, Wallet } from "./types";

export const demoWallets: Wallet[] = [
  { id: "cash", name: "Cash", type: "cash", currency: "IDR", balance: "850000", color: "#0f766e" },
  { id: "bca", name: "BCA", type: "bank", currency: "IDR", balance: "4200000", color: "#2563eb" },
  { id: "gopay", name: "GoPay", type: "ewallet", currency: "IDR", balance: "320000", color: "#16a34a" }
];

export const demoCategories: Category[] = [
  { id: "food", name: "Food", icon: "fast-food", color: "#dc2626", kind: "expense" },
  { id: "transport", name: "Transport", icon: "car", color: "#d97706", kind: "expense" },
  { id: "salary", name: "Salary", icon: "briefcase", color: "#16a34a", kind: "income" }
];

export const demoBudgets: Budget[] = [
  { id: "monthly-food", name: "Makan Bulanan", amount: "1500000", period: "monthly", categoryId: "food" },
  { id: "weekly-fun", name: "Jajan Mingguan", amount: "350000", period: "weekly" }
];

export const demoTransactions: Transaction[] = [
  {
    id: "t1",
    type: "expense",
    amount: "45000",
    walletId: "gopay",
    categoryId: "food",
    budgetId: "monthly-food",
    note: "Kopi dan makan siang",
    happenedAt: new Date().toISOString()
  },
  {
    id: "t2",
    type: "income",
    amount: "5000000",
    walletId: "bca",
    categoryId: "salary",
    note: "Gaji",
    happenedAt: new Date().toISOString()
  }
];

export const demoSummary: Summary = {
  totals: { income: 5000000, expense: 820000, net: 4180000 },
  byCategory: [
    { categoryName: "Food", color: "#dc2626", total: "520000" },
    { categoryName: "Transport", color: "#d97706", total: "210000" },
    { categoryName: "Other", color: "#64748b", total: "90000" }
  ],
  byWallet: [
    { walletName: "GoPay", color: "#16a34a", total: "360000" },
    { walletName: "Cash", color: "#0f766e", total: "280000" },
    { walletName: "BCA", color: "#2563eb", total: "180000" }
  ],
  budgetUsage: [
    { budgetId: "monthly-food", name: "Makan Bulanan", amount: "1500000", period: "monthly", used: "520000" },
    { budgetId: "weekly-fun", name: "Jajan Mingguan", amount: "350000", period: "weekly", used: "190000" }
  ]
};
