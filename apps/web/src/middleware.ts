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

const checkSetupNeeded = async (): Promise<boolean | null> => {
  try {
    const response = await fetch(`${API_URL}/v1/setup/status`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.data?.needsSetup === true;
  } catch {
    return null;
  }
};

export const middleware = async (
  request: NextRequest
): Promise<NextResponse> => {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (hasSession) {
    if (pathname === "/setup" || pathname.startsWith("/setup/")) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    if (pathname === "/") {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    const isAuthRoute = AUTH_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    if (isAuthRoute) {
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    return NextResponse.next();
  }

  const needsSetup = await checkSetupNeeded();

  if (pathname === "/setup" || pathname.startsWith("/setup/")) {
    if (needsSetup !== false) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (needsSetup !== false) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

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
