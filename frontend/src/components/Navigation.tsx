"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  const subtopics = categorySubtopics[activeCategory] || categorySubtopics.trending;

  return (
    <nav 
      className={cn(
        "sticky top-0 z-50",
        "transition-all duration-150"
      )}
      style={{
        backgroundColor: "var(--nav-bg)",
        boxShadow: "var(--shadow-nav)"
      }}
    >
      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span 
              className="text-h2"
              style={{ 
                color: "var(--nav-text)",
                lineHeight: "var(--leading-tight)",
              }}
            >
              PolyDebate
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              style={{ color: "var(--nav-text)", border: "none" }}
              className="hover:bg-white/10"
            >
              How it works
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              style={{ color: "var(--nav-text)" }}
              className="hover:bg-white/10"
            >
              Log In
            </Button>
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
          </div>
        </div>
      </div>

      {/* Navbar Extension - Categories, Search, and Subtopics */}
      <div 
        className="border-t"
        style={{ 
          backgroundColor: "var(--nav-bg-extension)",
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="container mx-auto px-4 py-3 space-y-3">
          {/* Search and Categories Row */}
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Search polydebate"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className={cn(
                    "flex-1 bg-white border-black/10",
                    "text-black",
                    "transition-all duration-150"
                  )}
                  style={{
                    "--tw-placeholder-opacity": "1",
                    color: "var(--foreground)",
                  } as React.CSSProperties & { "--tw-placeholder-opacity": string }}
                />
                <Button
                  size="sm"
                  className={cn(
                    "h-9 px-4 text-white",
                    "transition-all duration-150"
                  )}
                  style={{
                    backgroundColor: "var(--color-primary)",
                    boxShadow: "var(--shadow-primary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                    e.currentTarget.style.boxShadow = "var(--shadow-primary-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-primary)";
                    e.currentTarget.style.boxShadow = "var(--shadow-primary)";
                  }}
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
                </Button>
              </div>
            </div>

            {/* Category Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto flex-1">
              {categories.map((category) => {
                const isActive = activeCategory === category.toLowerCase();
                return (
                  <button
                    key={category}
                    onClick={() => onCategoryChange(category.toLowerCase())}
                    className={cn(
                      "px-4 py-2 text-caption font-medium whitespace-nowrap",
                      "transition-colors duration-150",
                      "border-b-2",
                      isActive
                        ? "border-[var(--color-cyan)]"
                        : "border-transparent hover:text-white"
                    )}
                    style={{
                      color: isActive ? "var(--nav-text)" : "rgba(255, 255, 255, 0.7)",
                      lineHeight: "var(--leading-base)",
                    }}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtopics Filter Tags */}
          {subtopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {subtopics.map((subtopic) => {
                const isActive = activeSubtopic === subtopic;
                return (
                  <Button
                    key={subtopic}
                    variant="outline"
                    size="sm"
                    onClick={() => onSubtopicChange(subtopic)}
                    className="h-7 px-3 text-caption font-medium transition-all duration-150 border"
                    style={isActive ? {
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-white)",
                      borderColor: "var(--color-primary)",
                      boxShadow: "var(--shadow-primary)",
                      lineHeight: "var(--leading-base)",
                    } : {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.8)",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      lineHeight: "var(--leading-base)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
                        e.currentTarget.style.color = "var(--nav-text)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                      } else {
                        e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                      } else {
                        e.currentTarget.style.backgroundColor = "var(--color-primary)";
                      }
                    }}
                  >
                    {subtopic}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

