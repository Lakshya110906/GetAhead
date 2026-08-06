import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit } from "@/lib/rateLimit";

// Edge rate limiting, keyed by IP and (when signed in) by user — the
// privacy policy claims "Rate limiting on all authentication endpoints",
// and this is the code that's supposed to make that true. It only actually
// does, though, when KV_REST_API_URL/KV_REST_API_TOKEN are configured —
// rateLimit() fails OPEN (allows every request) without them, and as of
// this audit neither is set in any Vercel environment. Until a real KV
// store is provisioned, this file exists but the claim doesn't hold.
// (Renamed from middleware.ts: this Next.js version deprecated that file
// convention in favor of proxy.ts — see node_modules/next/dist/docs.)

const AUTH_LIMIT = { limit: 10, windowSeconds: 60 };
const EVALUATION_ENQUEUE_LIMIT = { limit: 20, windowSeconds: 60 };

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function tooManyRequests(resetAt: number) {
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)).toString() } }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthEndpoint =
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/callback/credentials");

  const isEvaluationEnqueue = pathname === "/api/evaluations" && request.method === "POST";

  if (!isAuthEndpoint && !isEvaluationEnqueue) {
    return NextResponse.next();
  }

  const { limit, windowSeconds } = isAuthEndpoint ? AUTH_LIMIT : EVALUATION_ENQUEUE_LIMIT;
  const ip = clientIp(request);
  const routeTag = isAuthEndpoint ? "auth" : "eval-enqueue";

  const ipResult = await rateLimit(`${routeTag}:ip:${ip}`, limit, windowSeconds);
  if (!ipResult.allowed) {
    return tooManyRequests(ipResult.resetAt);
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);
  if (token?.id) {
    const userResult = await rateLimit(`${routeTag}:user:${token.id}`, limit, windowSeconds);
    if (!userResult.allowed) {
      return tooManyRequests(userResult.resetAt);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*", "/api/evaluations"],
};
