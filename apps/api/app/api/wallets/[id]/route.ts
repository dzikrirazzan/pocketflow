import { and, eq } from "drizzle-orm";
import { wallets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { walletInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    const input = walletInput.partial().parse(await request.json());
    const [wallet] = await db
      .update(wallets)
      .set({
        ...input,
        balance: input.balance === undefined ? undefined : input.balance.toFixed(2),
        updatedAt: new Date()
      })
      .where(and(eq(wallets.id, params.id), eq(wallets.userId, user.id)))
      .returning();

    return Response.json({ wallet });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(request);
    await db
      .update(wallets)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(wallets.id, params.id), eq(wallets.userId, user.id)));

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
