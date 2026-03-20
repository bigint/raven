import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const HomePageContent = () => {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-foreground">
        <span className="text-2xl font-bold text-background">R</span>
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Raven</h1>
      <p className="mt-2 text-center text-muted-foreground">
        AI model gateway
      </p>
      <Link
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        href="/sign-in"
      >
        Sign in
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
};
