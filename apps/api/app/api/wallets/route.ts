import { desc, eq, and } from "drizzle-orm";
import { wallets } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { walletInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, user.id), eq(wallets.isArchived, false)))
      .orderBy(desc(wallets.createdAt));

    return Response.json({ wallets: rows });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = walletInput.parse(await request.json());
    const [wallet] = await db
      .insert(wallets)
      .values({
        userId: user.id,
        name: input.name,
        type: input.type,
        currency: input.currency,
        balance: input.balance.toFixed(2),
        color: input.color
      })
      .returning();

    return Response.json({ wallet }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
