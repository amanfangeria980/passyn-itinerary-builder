import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

function build(): NeonHttpDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and add your Postgres URL.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

// Lazy proxy so importing this module never throws — only actually using `db` does.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_t, prop, receiver) {
    if (!_db) _db = build();
    // @ts-expect-error proxied access
    const value = _db[prop];
    return typeof value === "function" ? value.bind(_db) : value;
  },
});

export { schema };
