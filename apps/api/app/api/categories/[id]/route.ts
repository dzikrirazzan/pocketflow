import { and, eq } from "drizzle-orm";
import { categories } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoryInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const input = categoryInput.partial().parse(await request.json());
    const [category] = await db
      .update(categories)
      .set(input)
      .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
      .returning();

    return Response.json({ category });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
