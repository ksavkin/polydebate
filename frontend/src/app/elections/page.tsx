"use client";

import { MarketsGrid } from "@/components/MarketsGrid";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSearchParams } from "next/navigation";
import { useMarkets } from "@/hooks/useMarkets";
import { useSearch } from "@/contexts/SearchContext";

const CARDS_PER_PAGE = 16;

export default function ElectionsPage() {
  const searchParams = useSearchParams();
  const activeSubtopic = searchParams.get("subtopic") || "All";
  const { searchQuery } = useSearch();

  const {
    markets,
    isLoading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    newCardIds,
  } = useMarkets({
    category: "elections",
    activeSubtopic,
    searchQuery,
    cardsPerPage: CARDS_PER_PAGE,
  });

  return (
    <>
      {error && (
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
      )}

      {isInitialLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <LoadingSpinner size="lg" />
          <div 
            className="text-body" 
            style={{ 
              color: "var(--foreground-secondary)",
              lineHeight: "var(--leading-base)",
            }}
          >
            Loading elections markets...
          </div>
        </div>
      )}

      {!isInitialLoading && !error && (
        <MarketsGrid
          markets={markets}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          newCardIds={newCardIds}
        />
      )}
    </>
  );
}

