import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 chars");
  }
  return new TextEncoder().encode(s);
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function signCookieValue(rawToken: string): Promise<string> {
  return await new SignJWT({ t: rawToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

async function verifyCookieValue(value: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(value, secretKey());
    if (typeof payload.t !== "string") return null;
    return payload.t;
  } catch {
    return null;
  }
}

export async function createSession(args: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ cookieValue: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId: args.userId,
    tokenHash,
    expiresAt,
    userAgent: args.userAgent ?? null,
    ip: args.ip ?? null,
  });

  const cookieValue = await signCookieValue(raw);
  return { cookieValue, expiresAt };
}

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE);
  if (!c) return null;
  const raw = await verifyCookieValue(c.value);
  if (!raw) return null;
  const tokenHash = hashToken(raw);

  try {
    const rows = await db
      .select({
        uid: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row || !row.isActive) return null;
    return { id: row.uid, email: row.email, name: row.name, role: row.role };
  } catch {
    // DB unreachable / not configured — treat as unauthenticated so /login still renders.
    return null;
  }
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const c = jar.get(SESSION_COOKIE);
  if (!c) return;
  const raw = await verifyCookieValue(c.value);
  if (raw) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(raw)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function setSessionCookie(value: string, expiresAt: Date) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Used by Edge middleware (no DB access there) to verify cookie shape only.
// The actual DB session check happens inside the protected route via getCurrentUser.
export async function verifyCookieShape(value: string): Promise<boolean> {
  return (await verifyCookieValue(value)) !== null;
}
