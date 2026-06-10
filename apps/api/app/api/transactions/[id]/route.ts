import { and, eq, sql } from "drizzle-orm";
import { transactions, wallets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertTransactionReferencesBelongToUser } from "@/lib/ownership";
import { transactionInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const body = await request.json();

    const [existing] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

    if (!existing) {
      throw Object.assign(new Error("Transaction not found"), { status: 404 });
    }

    const merged = {
      type: body.type !== undefined ? body.type : existing.type,
      amount: body.amount !== undefined ? Number(body.amount) : Number(existing.amount),
      walletId: body.walletId !== undefined ? body.walletId : existing.walletId,
      targetWalletId: body.targetWalletId !== undefined ? body.targetWalletId : existing.targetWalletId,
      categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
      budgetId: body.budgetId !== undefined ? body.budgetId : existing.budgetId,
      note: body.note !== undefined ? body.note : existing.note,
      happenedAt: body.happenedAt !== undefined ? body.happenedAt : existing.happenedAt.toISOString()
    };

    const parsed = transactionInput.parse(merged);
    const newAmount = parsed.amount.toFixed(2);
    await assertTransactionReferencesBelongToUser(user.id, parsed);

    const result = await db.transaction(async (tx) => {
      // 2. Reverse existing balance effect
      if (existing.walletId) {
        const amount = existing.amount;
        if (existing.type === "income") {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.walletId), eq(wallets.userId, user.id)));
        } else if (existing.type === "expense") {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.walletId), eq(wallets.userId, user.id)));
        } else if (existing.type === "transfer" && existing.targetWalletId) {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.walletId), eq(wallets.userId, user.id)));
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.targetWalletId), eq(wallets.userId, user.id)));
        }
      }

      // 4. Apply new balance effect
      if (parsed.type === "income") {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, parsed.walletId), eq(wallets.userId, user.id)));
      } else if (parsed.type === "expense") {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, parsed.walletId), eq(wallets.userId, user.id)));
      } else if (parsed.type === "transfer" && parsed.targetWalletId) {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, parsed.walletId), eq(wallets.userId, user.id)));
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${newAmount}`, updatedAt: new Date() })
          .where(and(eq(wallets.id, parsed.targetWalletId), eq(wallets.userId, user.id)));
      }

      // 5. Update the transaction in DB
      const [updated] = await tx
        .update(transactions)
        .set({
          walletId: parsed.walletId,
          targetWalletId: parsed.type === "transfer" ? parsed.targetWalletId : null,
          categoryId: parsed.type === "transfer" ? null : parsed.categoryId || null,
          budgetId: parsed.type === "expense" ? parsed.budgetId || null : null,
          type: parsed.type,
          amount: newAmount,
          note: parsed.note,
          happenedAt: parsed.happenedAt ? new Date(parsed.happenedAt) : new Date()
        })
        .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
        .returning();

      return updated;
    });

    return Response.json({ transaction: result });
  } catch (error: any) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);

    await db.transaction(async (tx) => {
      // 1. Fetch transaction to reverse balance
      const [existing] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

      if (!existing) {
        throw Object.assign(new Error("Transaction not found"), { status: 404 });
      }

      // 2. Reverse wallet balance
      if (existing.walletId) {
        const amount = existing.amount;
        if (existing.type === "income") {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.walletId), eq(wallets.userId, user.id)));
        } else if (existing.type === "expense") {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.walletId), eq(wallets.userId, user.id)));
        } else if (existing.type === "transfer" && existing.targetWalletId) {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.walletId), eq(wallets.userId, user.id)));
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
            .where(and(eq(wallets.id, existing.targetWalletId), eq(wallets.userId, user.id)));
        }
      }

      // 3. Perform the actual deletion
      await tx.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
    });

    return Response.json({ ok: true });
  } catch (error: any) {
    return authErrorResponse(error);
  }
}
