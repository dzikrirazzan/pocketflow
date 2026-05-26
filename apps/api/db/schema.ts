import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const transactionType = pgEnum("transaction_type", ["income", "expense", "transfer"]);
export const budgetPeriod = pgEnum("budget_period", ["daily", "weekly", "monthly"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("cash"),
    currency: text("currency").notNull().default("IDR"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    color: text("color").notNull().default("#2563eb"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("wallets_user_idx").on(table.userId)
  })
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("tag"),
    color: text("color").notNull().default("#64748b"),
    kind: text("kind").notNull().default("expense"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("categories_user_idx").on(table.userId)
  })
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    period: budgetPeriod("period").notNull().default("monthly"),
    startsOn: date("starts_on").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("budgets_user_idx").on(table.userId)
  })
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
    targetWalletId: uuid("target_wallet_id").references(() => wallets.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "set null" }),
    type: transactionType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note"),
    happenedAt: timestamp("happened_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userDateIdx: index("transactions_user_date_idx").on(table.userId, table.happenedAt),
    walletIdx: index("transactions_wallet_idx").on(table.walletId),
    budgetIdx: index("transactions_budget_idx").on(table.budgetId)
  })
);

export const recurringTransactions = pgTable(
  "recurring_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id").references(() => wallets.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    budgetId: uuid("budget_id").references(() => budgets.id, { onDelete: "set null" }),
    type: transactionType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note"),
    cadence: budgetPeriod("cadence").notNull(),
    nextRunOn: date("next_run_on").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("recurring_transactions_user_idx").on(table.userId)
  })
);

export type Wallet = typeof wallets.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
