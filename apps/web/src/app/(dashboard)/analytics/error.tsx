"use client";

const AnalyticsError = ({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  );
};

export default AnalyticsError;
