/**
 * Seed users from a JSON file.
 *
 * Usage:
 *   npm run seed:users -- ./users.json
 *
 * users.json shape:
 * [
 *   { "email": "aniket@passyn.org", "name": "Aniket Arora", "role": "admin", "password": "..." },
 *   { "email": "agent1@passyn.org", "name": "Agent One",    "role": "agent", "password": "..." }
 * ]
 *
 * Existing users (matched by email) are updated, not duplicated.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

const Row = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["agent", "admin"]).default("agent"),
  password: z.string().min(8),
});
const Rows = z.array(Row);

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npm run seed:users -- <path-to-users.json>");
    process.exit(2);
  }
  const path = resolve(process.cwd(), arg);
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const parsed = Rows.parse(raw);

  for (const u of parsed) {
    const email = u.email.toLowerCase();
    const hashed = await hashPassword(u.password);
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      await db
        .update(users)
        .set({
          name: u.name,
          role: u.role,
          password: hashed,
          isActive: true,
          failedAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, existing[0].id));
      console.log(`updated  ${email}`);
    } else {
      await db.insert(users).values({
        email,
        name: u.name,
        role: u.role,
        password: hashed,
        isActive: true,
      });
      console.log(`inserted ${email}`);
    }
  }
  console.log(`Done. ${parsed.length} user(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
