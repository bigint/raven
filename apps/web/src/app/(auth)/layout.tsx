import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false
  }
};

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export default AuthLayout;
