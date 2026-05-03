/**
 * Reset a single user's password.
 *
 * Usage:
 *   npm run reset:password -- <email> <new-password>
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: npm run reset:password -- <email> <new-password>");
    process.exit(2);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(2);
  }

  const hashed = await hashPassword(password);
  const result = await db
    .update(users)
    .set({
      password: hashed,
      failedAttempts: 0,
      lockedUntil: null,
      isActive: true,
    })
    .where(eq(users.email, email.toLowerCase()))
    .returning({ id: users.id });

  if (!result[0]) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  console.log(`Reset password for ${email}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
