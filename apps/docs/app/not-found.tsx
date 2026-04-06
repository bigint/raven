import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 text-6xl font-bold text-fd-foreground">404</p>
      <p className="mb-6 text-fd-muted-foreground">
        This page could not be found.
      </p>
      <Link
        className="inline-flex h-10 items-center rounded-lg bg-fd-primary px-5 text-sm font-medium text-fd-primary-foreground transition-all hover:opacity-90"
        href="/docs"
      >
        Back to docs
      </Link>
    </div>
  );
}
