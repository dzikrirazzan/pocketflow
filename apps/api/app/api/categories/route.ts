import { desc, eq } from "drizzle-orm";
import { categories } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoryInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await db.select().from(categories).where(eq(categories.userId, user.id)).orderBy(desc(categories.createdAt));
    return Response.json({ categories: rows });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = categoryInput.parse(await request.json());
    const [category] = await db.insert(categories).values({ ...input, userId: user.id }).returning();
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
