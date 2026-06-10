import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;
const isNextProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!connectionString && process.env.NODE_ENV === "production" && !isNextProductionBuild) {
  throw new Error("DATABASE_URL is required in production");
}

const client = postgres(connectionString ?? "postgresql://postgres:postgres@localhost:5432/postgres", {
  max: 1,
  prepare: false
});

export const db = drizzle(client, { schema });
