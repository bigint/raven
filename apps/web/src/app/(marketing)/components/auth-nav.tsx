import Link from "next/link";

export const AuthNav = () => {
  return (
    <div className="flex items-center gap-2">
      <Link
        className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
        href="/sign-in"
      >
        Sign in
      </Link>
      <Link
        className="hidden rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 sm:inline-flex"
        href="/sign-up"
      >
        Get Started
      </Link>
      <div className="flex items-center gap-2 sm:hidden">
        <Link
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href="/sign-in"
        >
          Sign in
        </Link>
        <Link
          className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          href="/sign-up"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};
