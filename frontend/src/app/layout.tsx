import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SharedLayout } from "@/components/SharedLayout";
import { SearchProvider } from "@/contexts/SearchContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";

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
        <AuthProvider>
          <FavoritesProvider>
            <SearchProvider>
              <SharedLayout>
                {children}
              </SharedLayout>
            </SearchProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
