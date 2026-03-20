import type { ReactNode } from "react";

const MarketingLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default MarketingLayout;
