import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  description: "Unified AI gateway for teams",
  title: "Raven - AI Gateway"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`
          }}
        />
      </head>
      <body
        className={`${outfit.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
