import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Edge-safe shape check only. The actual DB session lookup happens server-side
// inside protected routes via getCurrentUser(); this middleware just gates
// pages so unauthenticated users get bounced to /login fast.

const PROTECTED_PREFIXES = ["/dashboard", "/itinerary"];
const PROTECTED_API_PREFIXES = ["/api/itinerary"];

function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET not set");
  return new TextEncoder().encode(s);
}

async function hasValidCookie(req: NextRequest): Promise<boolean> {
  const c = req.cookies.get("sid");
  if (!c) return false;
  try {
    const { payload } = await jwtVerify(c.value, secretKey());
    return typeof payload.t === "string";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtectedPage = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );
  const isProtectedApi = PROTECTED_API_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );

  if (!isProtectedPage && !isProtectedApi) return NextResponse.next();

  if (await hasValidCookie(req)) return NextResponse.next();

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/itinerary/:path*", "/api/itinerary/:path*"],
};
