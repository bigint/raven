import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  description: "Unified AI gateway for teams",
  metadataBase: new URL("https://ravenai.dev"),
  openGraph: {
    description:
      "Route, monitor, and manage AI API calls across OpenAI, Anthropic, Google, and more.",
    siteName: "Raven",
    title: "Raven - AI Gateway",
    type: "website",
    url: "https://ravenai.dev"
  },
  robots: {
    follow: true,
    index: true
  },
  title: {
    default: "Raven - AI Gateway",
    template: "%s | Raven"
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Route, monitor, and manage AI API calls across OpenAI, Anthropic, Google, and more.",
    title: "Raven - AI Gateway"
  }
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=JSON.parse(localStorage.getItem("theme")||"{}");if(d.state&&d.state.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`
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
};

export default RootLayout;
