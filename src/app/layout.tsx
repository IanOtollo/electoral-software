import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "./ConvexClientProvider";
import { SessionProvider } from "../context/SessionContext";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-dm-mono",
});

import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "Electoral Software — Bulk SMS & Parallel Tally",
  description:
    "Professional campaign management for Kenyan political teams. Bulk SMS outreach and unofficial parallel vote tally tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <ConvexClientProvider>
            <SessionProvider>{children}</SessionProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
