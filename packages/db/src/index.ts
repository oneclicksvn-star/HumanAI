import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const dbDir = resolve(import.meta.dir, "../../db/data");
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

const dbPath = process.env.DATABASE_URL ?? resolve(dbDir, "humancore.db");

const sqlite = new Database(dbPath);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
export type DB = typeof db;
