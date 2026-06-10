import { and, eq } from "drizzle-orm";
import { wallets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { walletInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const input = walletInput.partial().parse(await request.json());
    const [wallet] = await db
      .update(wallets)
      .set({
        ...input,
        balance: input.balance === undefined ? undefined : input.balance.toFixed(2),
        updatedAt: new Date()
      })
      .where(and(eq(wallets.id, id), eq(wallets.userId, user.id)))
      .returning();

    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { status: 404 });
    }

    return Response.json({ wallet });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const [wallet] = await db
      .update(wallets)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(and(eq(wallets.id, id), eq(wallets.userId, user.id)))
      .returning({ id: wallets.id });

    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
