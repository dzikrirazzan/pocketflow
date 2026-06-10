import { and, eq } from "drizzle-orm";
import { budgets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCategoryBelongsToUser } from "@/lib/ownership";
import { budgetInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const input = budgetInput.partial().parse(await request.json());
    await assertCategoryBelongsToUser(user.id, input.categoryId);

    const [budget] = await db
      .update(budgets)
      .set({
        ...input,
        amount: input.amount === undefined ? undefined : input.amount.toFixed(2)
      })
      .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
      .returning();

    if (!budget) {
      throw Object.assign(new Error("Budget not found"), { status: 404 });
    }

    return Response.json({ budget });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const [budget] = await db
      .update(budgets)
      .set({ isActive: false })
      .where(and(eq(budgets.id, id), eq(budgets.userId, user.id)))
      .returning({ id: budgets.id });

    if (!budget) {
      throw Object.assign(new Error("Budget not found"), { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
