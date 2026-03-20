import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

const AUTH_ROUTES = ["/sign-in", "/sign-up"];

const PROTECTED_PREFIXES = [
  "/analytics",
  "/audit-logs",
  "/budgets",
  "/chat",
  "/guardrails",
  "/integrations",
  "/keys",
  "/models",
  "/overview",
  "/profile",
  "/prompts",
  "/providers",
  "/requests",
  "/routing",
  "/settings",
  "/webhooks"
];

export const middleware = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isAuthRoute) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }
    return NextResponse.next();
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
