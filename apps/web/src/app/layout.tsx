import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  description: "Unified AI gateway for managing AI API calls",
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

export const viewport: Viewport = {
  themeColor: "#0a0a0a"
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <link href="https://models.dev" rel="preconnect" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=JSON.parse(localStorage.getItem("theme")||"{}");if(d.state&&d.state.theme==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:rounded-md focus:ring-2 focus:ring-ring"
          href="#main-content"
        >
          Skip to main content
        </a>
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
