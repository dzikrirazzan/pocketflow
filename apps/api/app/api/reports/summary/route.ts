import { and, eq, gte, lte, sql } from "drizzle-orm";
import { budgets, categories, transactions, wallets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { periodRange } from "@/lib/dates";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const { start, end } = periodRange(url.searchParams.get("period"), url.searchParams.get("date"));

    const totals = await db
      .select({
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`
      })
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), gte(transactions.happenedAt, start), lte(transactions.happenedAt, end)));

    const byCategory = await db
      .select({
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        color: categories.color,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), gte(transactions.happenedAt, start), lte(transactions.happenedAt, end)))
      .groupBy(transactions.categoryId, categories.name, categories.color)
      .orderBy(sql`sum(${transactions.amount}) desc`);

    const byWallet = await db
      .select({
        walletId: transactions.walletId,
        walletName: wallets.name,
        color: wallets.color,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`
      })
      .from(transactions)
      .leftJoin(wallets, eq(wallets.id, transactions.walletId))
      .where(and(eq(transactions.userId, user.id), eq(transactions.type, "expense"), gte(transactions.happenedAt, start), lte(transactions.happenedAt, end)))
      .groupBy(transactions.walletId, wallets.name, wallets.color)
      .orderBy(sql`sum(${transactions.amount}) desc`);

    const budgetUsage = await db
      .select({
        budgetId: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        period: budgets.period,
        used: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`
      })
      .from(budgets)
      .leftJoin(
        transactions,
        and(
          eq(transactions.budgetId, budgets.id),
          gte(transactions.happenedAt, start),
          lte(transactions.happenedAt, end)
        )
      )
      .where(and(eq(budgets.userId, user.id), eq(budgets.isActive, true)))
      .groupBy(budgets.id, budgets.name, budgets.amount, budgets.period);

    const income = Number(totals[0]?.income ?? 0);
    const expense = Number(totals[0]?.expense ?? 0);

    return Response.json({
      range: { start, end },
      totals: {
        income,
        expense,
        net: income - expense
      },
      byCategory,
      byWallet,
      budgetUsage
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
