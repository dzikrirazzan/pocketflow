import { and, eq } from "drizzle-orm";
import { budgets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgetInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const input = budgetInput.partial().parse(await request.json());
    const [budget] = await db
      .update(budgets)
      .set({
        ...input,
        amount: input.amount === undefined ? undefined : input.amount.toFixed(2)
      })
      .where(and(eq(budgets.id, params.id), eq(budgets.userId, user.id)))
      .returning();

    return Response.json({ budget });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    await db.update(budgets).set({ isActive: false }).where(and(eq(budgets.id, params.id), eq(budgets.userId, user.id)));
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
