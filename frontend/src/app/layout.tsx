import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SharedLayout } from "@/components/SharedLayout";
import { SearchProvider } from "@/contexts/SearchContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PolyDebate - AI Market Predictions",
  description: "LLMs as market debaters - Compare AI predictions on Polymarket events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SearchProvider>
          <SharedLayout>
        {children}
          </SharedLayout>
        </SearchProvider>
      </body>
    </html>
  );
}
