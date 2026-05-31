import { and, desc, eq } from "drizzle-orm";
import { budgets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgetInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, user.id), eq(budgets.isActive, true)))
      .orderBy(desc(budgets.createdAt));
    return Response.json({ budgets: rows });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = budgetInput.parse(await request.json());
    const [budget] = await db
      .insert(budgets)
      .values({
        userId: user.id,
        name: input.name,
        amount: input.amount.toFixed(2),
        period: input.period,
        startsOn: input.startsOn,
        categoryId: input.categoryId
      })
      .returning();

    return Response.json({ budget }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
