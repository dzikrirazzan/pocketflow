import { and, eq } from "drizzle-orm";
import { transactions } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
