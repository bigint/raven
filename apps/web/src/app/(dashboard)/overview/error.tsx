"use client";

import { Button } from "@raven/ui";

const OverviewError = ({
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
      <Button onClick={reset}>Try again</Button>
    </div>
  );
};

export default OverviewError;
