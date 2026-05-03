import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
} from "@/lib/auth/session";
import { takeEmailAttempt, takeIpAttempt } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

const FAIL_LOCK_THRESHOLD = 5;
const LOCK_MS = 15 * 60 * 1000;

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipCheck = takeIpAttempt(ip);
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  takeEmailAttempt(body.email);

  const email = body.email.toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .catch((e: Error) => {
      console.warn("[login] DB unavailable:", e.message);
      return null;
    });
  if (rows === null) {
    return NextResponse.json(
      { error: "Service not configured. Check DATABASE_URL and AUTH_SECRET." },
      { status: 503 },
    );
  }
  const user = rows[0];

  // Generic message on bad email — do not leak which is wrong.
  const generic = NextResponse.json(
    { error: "Invalid email or password" },
    { status: 401 },
  );

  if (!user || !user.isActive) return generic;

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Account temporarily locked. Try again later." },
      { status: 423 },
    );
  }

  const ok = await verifyPassword(body.password, user.password);
  if (!ok) {
    const attempts = (user.failedAttempts ?? 0) + 1;
    const shouldLock = attempts >= FAIL_LOCK_THRESHOLD;
    await db
      .update(users)
      .set({
        failedAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MS) : null,
      })
      .where(eq(users.id, user.id));
    return generic;
  }

  // Success — reset counters.
  if (user.failedAttempts !== 0 || user.lockedUntil) {
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
  }

  const ua = req.headers.get("user-agent") ?? null;
  const { cookieValue, expiresAt } = await createSession({
    userId: user.id,
    userAgent: ua,
    ip,
  });
  await setSessionCookie(cookieValue, expiresAt);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
