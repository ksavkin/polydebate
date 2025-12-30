"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const categories = [
  "Trending",
  "Breaking",
  "New",
  "Politics",
  "Sports",
  "Finance",
  "Crypto",
  "Geopolitics",
  "Earnings",
  "Tech",
  "Culture",
  "World",
  "Economy",
  "Elections",
  "Ended",
];

const categorySubtopics: Record<string, string[]> = {
  trending: ["All", "Hot", "Most Volume", "Ending Soon", "New Markets"],
  breaking: ["All", "Just Now", "Last Hour", "Today", "This Week"],
  new: ["All", "Most Volume", "Ending Soon"],
  politics: ["All", "US Elections", "Presidential", "Congress", "State Elections", "International"],
  sports: ["All", "NFL", "NBA", "MLB", "Soccer", "Tennis", "Golf"],
  finance: ["All", "Fed Rates", "Inflation", "Stocks", "Bonds", "Forex", "Commodities"],
  crypto: ["All", "Bitcoin", "Ethereum", "Altcoins", "DeFi", "NFTs", "Regulation"],
  geopolitics: ["All", "US-China", "Russia-Ukraine", "Middle East", "Europe", "Asia"],
  earnings: ["All", "Tech", "Finance", "Retail", "Energy", "Healthcare"],
  tech: ["All", "AI", "Apple", "Google", "Microsoft", "Startups", "Hardware"],
  culture: ["All", "Entertainment", "Movies", "Music", "TV", "Celebrities"],
  world: ["All", "Europe", "Asia", "Americas", "Africa", "Oceania"],
  economy: ["All", "GDP", "Employment", "Housing", "Trade", "Policy"],
  elections: ["All", "US 2024", "US 2028", "International", "State", "Local"],
  ended: ["All", "Today", "This Week", "This Month", "Older"],
};

interface NavigationProps {
  activeCategory: string;
  activeSubtopic: string;
  searchQuery: string;
  onCategoryChange: (category: string) => void;
  onSubtopicChange: (subtopic: string) => void;
  onSearchChange: (query: string) => void;
  showBottomBar?: boolean;
}

export function Navigation({
  activeCategory,
  activeSubtopic,
  searchQuery,
  onCategoryChange,
  onSubtopicChange,
  onSearchChange,
  showBottomBar = true,
}: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout, remainingDebates } = useAuth();

  const isDebatePage = pathname?.includes('/market/') && pathname?.includes('/debate');
  const isHowItWorksPage = pathname === '/how-it-works';
  const isProfilePage = pathname === '/profile';
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const shouldHideBottomBar = isDebatePage || isHowItWorksPage || isProfilePage || isAuthPage;

  const subtopics = categorySubtopics[activeCategory] || categorySubtopics.trending;
  const displayTopics = subtopics;

  const getCategoryRoute = (category: string) => {
    const normalized = category.toLowerCase();
    return normalized === "trending" ? "/" : `/${normalized}`;
  };

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 transition-all duration-150 border-b",
        "border-[hsla(var(--border-subtle))]"
      )}
      style={{
        backgroundColor: "hsla(var(--nav-bg))",
        boxShadow: "var(--shadow-nav)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-3 shrink-0 no-underline group"
          >
            <div className="relative w-8 h-8 transition-transform group-hover:scale-105 shrink-0">
              <img
                src="/favicon_io/apple-touch-icon.png"
                alt="PolyDebate Logo"
                className="w-full h-full rounded-lg shadow-sm object-cover"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="font-bold tracking-tight"
                style={{
                  color: "hsl(var(--text-principal))",
                  fontSize: "1.25rem",
                  lineHeight: "1.1",
                }}
              >
                PolyDebate
              </span>
              <span style={{ fontSize: "1.25rem", lineHeight: "1" }}>🇺🇸</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <Link href="/how-it-works">
                <Button
                  variant="ghost"
                  size="sm"
                  style={{ color: "hsl(var(--text-principal))" }}
                  className="hover:bg-black/5"
                >
                  How it works
                </Button>
              </Link>

              {isAuthenticated ? (
                <>
                  {remainingDebates !== null && (
                    <div className="relative group flex items-center px-2">
                      <span className="cursor-default text-lg">⚡</span>
                      <div
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 text-xs rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50"
                        style={{
                          backgroundColor: "#1a1a1a",
                          color: "#ffffff",
                          boxShadow: "var(--shadow-md)",
                        }}
                      >
                        {remainingDebates}/3 daily reports
                      </div>
                    </div>
                  )}
                  <Link href="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{ color: "hsl(var(--text-principal))" }}
                      className="hover:bg-black/5"
                    >
                      {user?.name || user?.email}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    style={{ color: "hsl(var(--text-principal))" }}
                    className="hover:bg-black/5"
                  >
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      style={{ color: "hsl(var(--text-principal))" }}
                      className="hover:bg-black/5"
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button
                      size="sm"
                      className="text-white bg-[hsl(var(--brand-blue))] hover:opacity-90 transition-all"
                      style={{ boxShadow: "var(--shadow-sm)" }}
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <button
              className="md:hidden p-2 rounded hover:bg-black/5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: "hsl(var(--text-principal))" }}
              aria-label="Menu"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showBottomBar && !shouldHideBottomBar && (
        <div
          className="border-t border-[hsla(var(--border-subtle))]"
          style={{ backgroundColor: "hsl(var(--bg-surface))" }}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
              {categories.map((category) => {
                const categoryLower = category.toLowerCase();
                const route = getCategoryRoute(categoryLower);
                const isActive = activeCategory === categoryLower;
                return (
                  <Link
                    key={category}
                    href={route}
                    className={cn(
                      "px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all border-b-2",
                      isActive ? "border-[hsl(var(--brand-blue))] text-[hsl(var(--brand-blue))]" : "border-transparent text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-principal))]"
                    )}
                  >
                    {category === "Trending" && "🔥 "}{category}
                  </Link>
                );
              })}
            </div>

            {activeCategory !== "breaking" && (
              <div className="flex items-center gap-4 py-3 border-t border-[hsla(var(--border-subtle))] opacity-80">
                <div className="relative flex items-center w-full max-w-[400px]">
                  <div className="absolute left-3 text-[hsl(var(--text-secondary))] opacity-50">
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    type="search"
                    placeholder="Search market topics..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 h-10 bg-black/[0.02] border-none rounded-xl focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand-blue))]/20 placeholder:text-[hsl(var(--text-secondary))]/40"
                  />
                  <div className="absolute right-3 hidden sm:flex items-center gap-1 opacity-30">
                    <kbd className="px-1.5 py-0.5 text-[10px] rounded border bg-white">/</kbd>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                  {displayTopics.map((topic) => {
                    const isActive = activeSubtopic === topic;
                    return (
                      <button
                        key={topic}
                        onClick={() => onSubtopicChange(topic)}
                        className={cn(
                          "h-8 px-4 text-xs font-medium rounded-full transition-all",
                          isActive
                            ? "bg-[hsl(var(--brand-blue))] text-white shadow-sm"
                            : "bg-black/[0.04] text-[hsl(var(--text-secondary))] hover:bg-black/[0.08]"
                        )}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
