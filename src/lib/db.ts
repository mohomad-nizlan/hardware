import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@/lib/schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
export const client = createClient({ url, authToken });
export const db = drizzle(client, { schema });
export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();
export const rows = <T = Record<string, unknown>>(result: { rows: readonly unknown[] }): T[] => Array.from(result.rows) as T[];
