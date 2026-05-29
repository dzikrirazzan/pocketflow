import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { transactions, wallets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { periodRange } from "@/lib/dates";
import { db } from "@/lib/db";
import { transactionInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const { start, end } = periodRange(
      url.searchParams.get("period"),
      url.searchParams.get("date"),
      url.searchParams.get("startDate"),
      url.searchParams.get("endDate")
    );
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, user.id), gte(transactions.happenedAt, start), lte(transactions.happenedAt, end)))
      .orderBy(desc(transactions.happenedAt));

    return Response.json({ transactions: rows, range: { start, end } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = transactionInput.parse(await request.json());
    const amount = input.amount.toFixed(2);

    const result = await db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(transactions)
        .values({
          userId: user.id,
          walletId: input.walletId,
          targetWalletId: input.targetWalletId,
          categoryId: input.categoryId,
          budgetId: input.budgetId,
          type: input.type,
          amount,
          note: input.note,
          happenedAt: input.happenedAt ? new Date(input.happenedAt) : new Date()
        })
        .returning();

      if (input.type === "income") {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, input.walletId), eq(wallets.userId, user.id)));
      }

      if (input.type === "expense") {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, input.walletId), eq(wallets.userId, user.id)));
      }

      if (input.type === "transfer" && input.targetWalletId) {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, input.walletId), eq(wallets.userId, user.id)));
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, input.targetWalletId), eq(wallets.userId, user.id)));
      }

      return transaction;
    });

    return Response.json({ transaction: result }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
