"use client";

import { BreakingNews } from "@/components/BreakingNews";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSearchParams, useRouter } from "next/navigation";
import { useBreakingMarkets } from "@/hooks/useBreakingMarkets";
import { useMemo, useState } from "react";
import { useSearch } from "@/contexts/SearchContext";

export default function BreakingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeSubtopic = searchParams.get("subtopic") || "All";
  const { searchQuery } = useSearch();

  // Get category from URL, default to "all"
  const urlCategory = searchParams.get("category") || "all";
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);

  const {
    markets: allFilteredMarkets,
    isLoading,
    isInitialLoading,
    error,
  } = useBreakingMarkets({
    tag: selectedCategory === "all" ? undefined : selectedCategory,
    searchQuery,
  });

  // Handle category change - update URL and state
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams.toString());
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    const queryString = params.toString();
    router.push(`/breaking${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  // Transform markets for Breaking News component
  // Sort by absolute price change (highest first) to rank by biggest movers
  const breakingMarkets = useMemo(() => {
    // Sort by absolute price change (biggest movers first)
    const sorted = [...allFilteredMarkets].sort((a, b) => {
      const changeA = Math.abs(a.price_change_24h || 0);
      const changeB = Math.abs(b.price_change_24h || 0);
      return changeB - changeA; // Descending order (biggest change first)
    });

    return sorted.slice(0, 15).map((market, index) => {
      // Calculate percentage (use first outcome price or average)
      const percentage = market.outcomes.length > 0
        ? Math.round(market.outcomes[0].price * 100)
        : 50;
      
      // Use real price change from API
      const change = market.price_change_24h !== undefined && market.price_change_24h !== null
        ? market.price_change_24h
        : 0;
      
      return {
        id: market.id,
        question: market.question,
        image_url: market.image_url,
        rank: index + 1,
        percentage,
        change: Math.round(change * 10) / 10,
        volume: market.volume,
        category: market.category,
        sparkline: market.sparkline, // Pass sparkline data
      };
    });
  }, [allFilteredMarkets]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p 
          className="text-body"
          style={{ 
            color: "var(--color-red)",
            lineHeight: "var(--leading-base)",
            marginBottom: "calc(var(--leading-base) * 1em)",
          }}
        >
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <LoadingSpinner size="lg" />
        <div 
          className="text-body" 
          style={{ 
            color: "var(--foreground-secondary)",
            lineHeight: "var(--leading-base)",
          }}
        >
          Loading breaking news...
        </div>
      </div>
    );
  }

  if (breakingMarkets.length === 0) {
    return (
      <div className="text-center py-12">
        <p 
          className="text-body"
          style={{ 
            color: "var(--foreground-secondary)",
            lineHeight: "var(--leading-base)",
          }}
        >
          No breaking markets found.
        </p>
      </div>
    );
  }

  return (
    <BreakingNews
      markets={breakingMarkets}
      activeCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
    />
  );
}

