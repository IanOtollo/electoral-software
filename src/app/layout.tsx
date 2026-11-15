import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CountdownBanner } from "@/components/public/countdown-banner";

const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Campaign Management System", template: "%s · Campaign Management System" },
  description: "Follow election results and verification by county, constituency and ward.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jost.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>
          <CountdownBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
