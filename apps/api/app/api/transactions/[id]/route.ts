import { and, eq } from "drizzle-orm";
import { transactions } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    await db.delete(transactions).where(and(eq(transactions.id, params.id), eq(transactions.userId, user.id)));
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
