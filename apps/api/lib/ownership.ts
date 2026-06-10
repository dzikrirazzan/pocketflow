import { and, eq } from "drizzle-orm";
import { budgets, categories, wallets } from "@/db/schema";
import { db } from "@/lib/db";

type TransactionReferences = {
  type: "income" | "expense" | "transfer";
  walletId: string;
  targetWalletId?: string | null;
  categoryId?: string | null;
  budgetId?: string | null;
};

function notFound(message: string): never {
  throw Object.assign(new Error(message), { status: 404 });
}

export async function assertWalletBelongsToUser(userId: string, walletId: string | null | undefined, label = "Wallet") {
  if (!walletId) {
    return;
  }

  const [wallet] = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId), eq(wallets.isArchived, false)))
    .limit(1);

  if (!wallet) {
    notFound(`${label} not found`);
  }
}

export async function assertCategoryBelongsToUser(userId: string, categoryId: string | null | undefined) {
  if (!categoryId) {
    return;
  }

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);

  if (!category) {
    notFound("Category not found");
  }
}

export async function assertBudgetBelongsToUser(userId: string, budgetId: string | null | undefined) {
  if (!budgetId) {
    return;
  }

  const [budget] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId), eq(budgets.isActive, true)))
    .limit(1);

  if (!budget) {
    notFound("Budget not found");
  }
}

export async function assertTransactionReferencesBelongToUser(userId: string, input: TransactionReferences) {
  await assertWalletBelongsToUser(userId, input.walletId);

  if (input.type === "transfer") {
    await assertWalletBelongsToUser(userId, input.targetWalletId, "Target wallet");
    return;
  }

  await assertCategoryBelongsToUser(userId, input.categoryId);

  if (input.type === "expense") {
    await assertBudgetBelongsToUser(userId, input.budgetId);
  }
}
