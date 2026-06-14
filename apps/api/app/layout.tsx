import type { ReactNode } from "react";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

export const metadata = {
  title: "PocketFlow — calmer money",
  description: "A calmer way to track your wallets, budgets, and spending — synced across web and iPhone.",
};

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const junicode = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../public/fonts/JunicodeVF-Roman.woff2", style: "normal", weight: "300 700" },
    { path: "../public/fonts/JunicodeVF-Italic.woff2", style: "italic", weight: "300 700" },
  ],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${junicode.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
