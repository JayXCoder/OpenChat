import "@/app/globals.css";

import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { ReactNode } from "react";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-memo",
  display: "swap"
});

export const metadata: Metadata = {
  title: "OpenChat // SYS.MEMO",
  description: "Production-grade AI chat system"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.variable} font-memo antialiased`}>{children}</body>
    </html>
  );
}
