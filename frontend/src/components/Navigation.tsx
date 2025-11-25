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
  "Mentions",
  "Ended",
  "More",
];

// Topic chips - these would typically come from the active category
const topicChips = [
  "All",
  "Trump",
  "Epstein",
  "Venezuela",
  "China",
  "Google Search",
  "Bitcoin",
  "Ethereum",
  "US Elections",
  "Fed Rates",
];

const categorySubtopics: Record<string, string[]> = {
  trending: ["All", "Hot", "Most Volume", "Ending Soon", "New Markets"],
  breaking: ["All", "Just Now", "Last Hour", "Today", "This Week"],
  new: ["All", "Today", "This Week", "This Month"],
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
}

export function Navigation({
  activeCategory,
  activeSubtopic,
  searchQuery,
  onCategoryChange,
  onSubtopicChange,
  onSearchChange,
}: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const subtopics = categorySubtopics[activeCategory] || categorySubtopics.trending;
  const displayTopics = subtopics.length > 0 ? subtopics : topicChips;

  // Helper function to get route for category
  const getCategoryRoute = (category: string) => {
    const normalized = category.toLowerCase();
    return normalized === "trending" ? "/" : `/${normalized}`;
  };

  return (
    <nav 
      className={cn(
        "sticky top-0 z-50",
        "transition-all duration-150"
      )}
      style={{
        backgroundColor: "var(--nav-bg)",
        boxShadow: "var(--shadow-nav)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Top Row - Logo, Actions */}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Left Section - Logo + Flag */}
          <Link 
            href="/" 
            className="flex items-center gap-2 shrink-0"
            style={{ minWidth: "fit-content" }}
          >
            {/* Small square icon */}
            <div 
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--color-primary)",
              }}
            >
              <span 
                className="text-white font-bold"
                style={{ fontSize: "0.875rem" }}
              >
                PD
              </span>
            </div>
            {/* Title and Flag - on same line */}
            <div className="flex items-center gap-1.5">
              <span 
                className="font-bold"
                style={{ 
                  color: "var(--nav-text)",
                  fontSize: "var(--text-lg)",
                  lineHeight: "var(--leading-tight)",
                }}
              >
                PolyDebate
              </span>
              {/* Country Flag - bigger, right next to PolyDebate */}
              <span style={{ fontSize: "1.25rem", lineHeight: "1" }}>🇺🇸</span>
            </div>
          </Link>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/how-it-works">
                <Button
                  variant="ghost"
                  size="sm"
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}
                  className="hover:bg-white/10 transition-colors duration-150 cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
                  }}
                >
                  How it works
                </Button>
              </Link>

              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10">
                    <span className="text-sm text-white/90">{user?.name || user?.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    style={{
                      color: "rgba(255, 255, 255, 0.9)",
                      backgroundColor: "transparent",
                    }}
                    className="hover:bg-white/10 transition-colors duration-150"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
                    }}
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
                      style={{
                        color: "rgba(255, 255, 255, 0.9)",
                        backgroundColor: "transparent",
                      }}
                      className="hover:bg-white/10 transition-colors duration-150"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.9)";
                      }}
                    >
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button
                      size="sm"
                      className="text-white transition-all duration-150"
                      style={{
                        backgroundColor: "var(--color-primary)",
                        boxShadow: "var(--shadow-primary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-primary)";
                      }}
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
            {/* Mobile Menu Icon */}
            <button
              className="md:hidden p-2 rounded hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: "var(--nav-text)" }}
              aria-label="Menu"
            >
              <svg
                className="size-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row - Tabs & Topics */}
      <div 
        className="border-t relative"
        style={{ 
          backgroundColor: "var(--nav-bg-extension)",
          borderColor: "rgba(255, 255, 255, 0.1)",
          zIndex: 1,
          overflow: "visible",
        }}
      >
        <div className="container mx-auto px-4">
          {/* Main Tabs Row */}
          <div 
            className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {categories.map((category) => {
              const categoryLower = category.toLowerCase();
              const route = getCategoryRoute(categoryLower);
              const isActive = activeCategory === categoryLower;
              const isTrending = category === "Trending";
              return (
                <Link
                  key={category}
                  href={route}
                  className={cn(
                    "px-4 py-2 text-caption font-medium whitespace-nowrap",
                    "transition-colors duration-150",
                    "border-b-2",
                    "flex items-center gap-1.5"
                  )}
                  style={{
                    color: isActive ? "var(--nav-text)" : "rgba(255, 255, 255, 0.7)",
                    lineHeight: "var(--leading-base)",
                    borderColor: isActive ? "var(--color-primary)" : "transparent",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.95)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                    }
                  }}
                >
                  {isTrending && (
                    <svg
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  )}
                  {category}
                </Link>
              );
            })}
          </div>

          {/* Topic Chips Row - Hide for breaking category */}
          {activeCategory !== "breaking" && (
          <div className="flex items-center gap-3 py-2 overflow-x-auto scrollbar-hide" style={{ position: "relative", zIndex: 2 }}>
            {/* Left Side - Search Bar, Filter, Bookmark */}
            <div className="flex items-center gap-2 shrink-0" style={{ position: "relative", zIndex: 30 }}>
              {/* Big Search Bar */}
              <div 
                className="relative flex items-center shrink-0"
                style={{ width: "400px", minWidth: "300px", zIndex: 30 }}
              >
                {/* Search Icon */}
                <div 
                  className="absolute left-3 pointer-events-none"
                  style={{ color: "rgba(255, 255, 255, 0.5)" }}
                >
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {/* Input */}
                <Input
                  type="search"
                  placeholder="Search polydebate"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 h-9",
                    "bg-white/10 border-white/20 text-white",
                    "placeholder:text-white/50",
                    "focus:bg-white/15 focus:border-white/25",
                    "transition-all duration-150",
                    "focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  )}
                  style={{
                    borderRadius: "0.5rem",
                    position: "relative",
                    zIndex: 31,
                    borderWidth: "1px",
                    boxShadow: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                    e.currentTarget.style.borderWidth = "1px";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.outline = "none";
                    e.currentTarget.style.setProperty("--tw-ring-width", "0px");
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                  }}
                />
                {/* Keyboard Hint */}
                <div 
                  className="absolute right-3 pointer-events-none flex items-center gap-1"
                  style={{ color: "rgba(255, 255, 255, 0.4)" }}
                >
                  <kbd 
                    className="px-1.5 py-0.5 text-xs rounded border"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    /
                  </kbd>
                </div>
              </div>
              {/* Filter Icon */}
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ color: "rgba(255, 255, 255, 0.8)" }}
                aria-label="Filter"
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
              </button>
              {/* Bookmark Icon */}
              <Link href="/favorites">
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={
                    pathname === '/favorites'
                      ? {
                          backgroundColor: "var(--color-primary)",
                          color: "var(--color-white)",
                          boxShadow: "var(--shadow-primary)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "rgba(255, 255, 255, 0.8)",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (pathname === '/favorites') {
                      e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                    } else {
                      e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname === '/favorites') {
                      e.currentTarget.style.backgroundColor = "var(--color-primary)";
                    } else {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                  aria-label="Bookmarks"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </button>
              </Link>
            </div>

            {/* Right Side - Topic Chips */}
            <div 
              className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              {displayTopics.map((topic) => {
                const isFavoritesPage = pathname.includes('/favorites');
                const isActive = !isFavoritesPage && activeSubtopic === topic;
                const handleClick = () => {
                  // If on favorites page, always navigate to home page
                  if (isFavoritesPage) {
                    const params = new URLSearchParams();
                    if (topic !== "All") {
                      params.set("subtopic", topic);
                    }
                    const queryString = params.toString();
                    router.push(`/${queryString ? `?${queryString}` : ""}`);
                    return;
                  }

                  // Update URL with subtopic query param on current page
                  onSubtopicChange(topic);
                  const params = new URLSearchParams(searchParams?.toString() || "");
                  if (topic === "All") {
                    params.delete("subtopic");
                  } else {
                    params.set("subtopic", topic);
                  }
                  const queryString = params.toString();
                  router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
                };
                return (
                  <button
                    key={topic}
                    onClick={handleClick}
                    className={cn(
                      "h-7 px-3 text-xs font-medium whitespace-nowrap rounded-full",
                      "transition-all duration-150"
                    )}
                    style={isActive ? {
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-white)",
                      boxShadow: "var(--shadow-primary)",
                    } : {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.8)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                        e.currentTarget.style.color = "var(--nav-text)";
                      } else {
                        e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                      } else {
                        e.currentTarget.style.backgroundColor = "var(--color-primary)";
                      }
                    }}
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
    </nav>
  );
}
