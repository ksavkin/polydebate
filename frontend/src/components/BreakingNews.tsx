"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";

interface BreakingMarket {
  id: string;
  question: string;
  image_url?: string;
  rank: number;
  percentage: number;
  change: number; // positive or negative percentage change
  volume: string;
  category: string;
  sparkline?: number[]; // Historical price data for sparkline (24 data points, 0-1 range)
}

interface BreakingNewsProps {
  markets: BreakingMarket[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const breakingCategories = [
  "All",
  "Politics",
  "World",
  "Sports",
  "Crypto",
  "Finance",
  "Tech",
  "Culture",
];

export function BreakingNews({ markets, activeCategory, onCategoryChange }: BreakingNewsProps) {
  const [email, setEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("breaking");

  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  // Filter markets by selected category
  const filteredMarkets = selectedCategory === "breaking" 
    ? markets 
    : markets.filter(m => m.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div>
      {/* Hero Header */}
      <div 
        className="rounded-lg p-8 mb-6 relative overflow-hidden"
        style={{
          backgroundColor: "var(--color-primary)",
          background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div 
              className="text-sm mb-2"
              style={{ color: "rgba(255, 255, 255, 0.8)" }}
            >
              {currentDate}
            </div>
            <h1 
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--color-white)" }}
            >
              Breaking News
            </h1>
            <p 
              className="text-base"
              style={{ color: "rgba(255, 255, 255, 0.9)" }}
            >
              See the markets that moved the most in the last 24 hours
            </p>
          </div>
          {/* Icons on the right */}
          <div className="flex items-center gap-4 shrink-0">
            <svg
              className="size-16 opacity-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: "var(--color-white)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <svg
              className="size-16 opacity-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: "var(--color-white)" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {breakingCategories.map((category) => {
          const categoryKey = category === "All" ? "breaking" : category.toLowerCase();
          const isActive = selectedCategory === categoryKey;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(categoryKey)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full transition-colors duration-150",
              )}
              style={isActive ? {
                backgroundColor: "var(--color-primary)",
                color: "var(--color-white)",
              } : {
                backgroundColor: "var(--color-soft-gray)",
                color: "var(--foreground-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--color-medium-gray)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--color-soft-gray)";
                }
              }}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Breaking Markets List */}
        <div className="lg:col-span-2">
          <div className="space-y-0 border rounded-lg overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map((market, index) => {
                const isPositive = market.change >= 0;
                const rowBg = index % 2 === 0 ? "var(--card-bg)" : "var(--background)";
                return (
                  <Link
                    key={market.id}
                    href={`/market/${market.id}`}
                    className={cn(
                      "flex items-center gap-4 p-4 border-b transition-colors duration-150",
                      "hover:bg-gray-50"
                    )}
                    style={{
                      borderColor: "var(--card-border)",
                      backgroundColor: rowBg,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--card-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = rowBg;
                    }}
                  >
                    {/* Rank */}
                    <div 
                      className="text-sm shrink-0"
                      style={{ 
                        color: "var(--foreground-secondary)",
                        width: "24px",
                        textAlign: "center",
                      }}
                    >
                      {index + 1}
                    </div>

                  {/* Image */}
                  {market.image_url ? (
                    <div 
                      className="w-12 h-12 rounded overflow-hidden shrink-0"
                      style={{
                        backgroundColor: "var(--color-soft-gray)",
                      }}
                    >
                      <img
                        src={market.image_url}
                        alt={market.question}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-12 h-12 rounded shrink-0"
                      style={{
                        backgroundColor: "var(--color-soft-gray)",
                      }}
                    />
                  )}

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold text-base line-clamp-2"
                      style={{ color: "var(--foreground)" }}
                    >
                      {market.question}
                    </h3>
                    <div 
                      className="text-xs mt-1"
                      style={{ color: "var(--foreground-secondary)" }}
                    >
                      {market.category}
                    </div>
                  </div>

                  {/* Percentage & Change */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div 
                        className="text-xl font-bold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {market.percentage}%
                      </div>
                      <div 
                        className="text-sm font-medium flex items-center gap-1"
                        style={{ 
                          color: isPositive ? "var(--color-green)" : "var(--color-red)",
                        }}
                      >
                        {isPositive ? "↑" : "↓"} {Math.abs(market.change)}%
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div 
                      className="w-16 h-8 flex items-end justify-center gap-px"
                    >
                      {market.sparkline && market.sparkline.length > 0 ? (
                        // Use real sparkline data from API
                        market.sparkline.slice(-12).map((price, i) => {
                          // Convert price (0-1 range) to height percentage (10-100%)
                          const height = Math.max(10, Math.min(100, price * 100));
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-t"
                              style={{
                                height: `${height}%`,
                                backgroundColor: isPositive ? "var(--color-green)" : "var(--color-red)",
                                minHeight: "2px",
                              }}
                            />
                          );
                        })
                      ) : (
                        // Fallback: generate sparkline if no data
                        Array.from({ length: 12 }).map((_, i) => {
                          const baseHeight = 30 + (i * 3);
                          const variation = Math.sin(i * 0.5) * 20;
                          const height = Math.max(10, Math.min(100, baseHeight + variation + (isPositive ? 10 : -10)));
                          return (
                            <div
                              key={i}
                              className="flex-1 rounded-t"
                              style={{
                                height: `${height}%`,
                                backgroundColor: isPositive ? "var(--color-green)" : "var(--color-red)",
                                minHeight: "2px",
                              }}
                            />
                          );
                        })
                      )}
                    </div>

                    {/* Arrow */}
                    <svg
                      className="size-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: "var(--foreground-secondary)" }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
                  );
                })
            ) : (
              <div className="p-8 text-center" style={{ color: "var(--foreground-secondary)" }}>
                No breaking markets found for this category.
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Email Signup */}
          <div 
            className="border rounded-lg p-6"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <h3 
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Get daily updates
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: "var(--foreground-secondary)" }}
            >
              Stay informed about the most volatile markets
            </p>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--card-border)",
                  color: "var(--foreground)",
                }}
              />
              <button
                className="w-full px-4 py-2 rounded text-white font-medium transition-colors duration-150"
                style={{
                  backgroundColor: "var(--color-primary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-primary)";
                }}
              >
                Get updates
              </button>
            </div>
          </div>

          {/* Live Feed */}
          <div 
            className="border rounded-lg p-6"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--foreground)" }}
            >
              Live from @polymarket
            </h3>
            <div className="space-y-4">
              {[
                { label: "Breaking news", title: "Epstein Files disclosure act enacted this year?", time: "Nov 15, 8:10 AM" },
                { label: "New polymarket", title: "Bitcoin reaches new all-time high", time: "Nov 15, 7:45 AM" },
                { label: "Market update", title: "Presidential election odds shift dramatically", time: "Nov 15, 7:20 AM" },
                { label: "Breaking news", title: "Fed announces interest rate decision", time: "Nov 15, 6:55 AM" },
              ].map((item, index) => (
                <div key={index} className="pb-4 border-b last:border-b-0 last:pb-0" style={{ borderColor: "var(--card-border)" }}>
                  <div 
                    className="text-xs font-medium mb-1"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {item.label}
                  </div>
                  <div 
                    className="text-sm font-medium mb-1"
                    style={{ color: "var(--foreground)" }}
                  >
                    {item.title}
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: "var(--foreground-secondary)" }}
                  >
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

