import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { categories, profiles, wallets } from "@/db/schema";
import { db } from "@/lib/db";

const supabaseUrl = process.env.SUPABASE_URL ?? "https://demo.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "demo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthedUser = {
  id: string;
  email: string;
};

export async function requireUser(request: Request): Promise<AuthedUser> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.DATABASE_URL) {
    throw Object.assign(new Error("Supabase and database environment variables are required"), { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw Object.assign(new Error("Missing bearer token"), { status: 401 });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user?.email) {
    throw Object.assign(new Error("Invalid session"), { status: 401 });
  }

  const user = { id: data.user.id, email: data.user.email };

  // Check if profile already exists.
  const [existingProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  // If profile exists, it means the user has already been seeded!
  if (existingProfile) {
    return user;
  }

  // Otherwise, perform the profile insert and seed defaults.
  await db
    .insert(profiles)
    .values({ id: user.id, email: user.email, name: data.user.user_metadata?.name })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { email: user.email, name: data.user.user_metadata?.name }
    });

  const [existingWallet] = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, user.id)).limit(1);
  if (!existingWallet) {
    await db.insert(wallets).values({
      userId: user.id,
      name: "Cash",
      type: "cash",
      balance: "0",
      color: "#0f766e"
    });
  }

  const [existingCategory] = await db.select({ id: categories.id }).from(categories).where(eq(categories.userId, user.id)).limit(1);
  if (!existingCategory) {
    await db.insert(categories).values([
      { userId: user.id, name: "Food", icon: "fast-food", color: "#dc2626", kind: "expense" },
      { userId: user.id, name: "Transport", icon: "car", color: "#d97706", kind: "expense" },
      { userId: user.id, name: "Shopping", icon: "bag", color: "#7c3aed", kind: "expense" },
      { userId: user.id, name: "Salary", icon: "briefcase", color: "#16a34a", kind: "income" }
    ]);
  }

  return user;
}

export function authErrorResponse(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
  return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status });
}
