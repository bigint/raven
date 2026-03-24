import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
  "/providers",
  "/requests",
  "/routing",
  "/settings",
  "/webhooks"
];

const checkSetupNeeded = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/v1/setup/status`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.data?.needsSetup === true;
  } catch {
    return false;
  }
};

export const middleware = async (
  request: NextRequest
): Promise<NextResponse> => {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  // Session cookie present → setup is definitely done, skip check
  if (hasSession) {
    // Redirect away from /setup if already set up
    if (pathname === "/setup" || pathname.startsWith("/setup/")) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    // Root: redirect to dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    // Redirect authenticated users away from auth routes
    const isAuthRoute = AUTH_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    return NextResponse.next();
  }

  // No session cookie — check if setup is needed
  const needsSetup = await checkSetupNeeded();

  // Handle /setup route: allow through only if setup is actually needed
  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    if (needsSetup) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (needsSetup) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // Setup is done but no session — normal auth routing
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isAuthRoute) {
    return NextResponse.next();
  }

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtectedRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
