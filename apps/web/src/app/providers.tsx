"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ThemeProvider } from "@/lib/theme";

const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

export { Providers };
