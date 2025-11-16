"use client";

import { MarketCard } from "@/components/MarketCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useRef, useEffect, useCallback } from "react";

interface TransformedMarket {
  id: string;
  question: string;
  description?: string;
  category: string;
  tag_id?: string;
  market_type?: 'binary' | 'categorical';
  outcomes: Array<{
    name: string;
    slug?: string;
    price: number;
    shares?: string;
  }>;
  volume: string;
  volume_24h?: string;
  liquidity?: string;
  end_date?: string;
  created_date?: string;
  image_url?: string;
  resolution_source?: string;
  period: "daily" | "monthly";
  isLive: boolean;
  price_change_24h?: number;
  sparkline?: number[];
}

interface MarketsGridProps {
  markets: TransformedMarket[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  newCardIds?: Set<string>;
}

export function MarketsGrid({ 
  markets, 
  isLoading = false, 
  hasMore = false,
  onLoadMore,
  newCardIds = new Set(),
}: MarketsGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(currentTarget);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, hasMore, onLoadMore]);

  if (markets.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p 
          className="text-body"
          style={{ 
            color: "var(--foreground-secondary)",
            lineHeight: "var(--leading-base)",
          }}
        >
          No markets found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" style={{ overflow: "visible" }}>
        {markets.map((market, index) => (
          <MarketCard 
            key={`${market.id}-${index}`} 
            {...market}
            isLive={market.isLive}
            isNew={newCardIds.has(market.id)}
          />
        ))}
      </div>
      
      {/* Infinite scroll trigger */}
      {hasMore && onLoadMore && (
        <div 
          ref={observerTarget} 
          className="h-32 flex flex-col items-center justify-center gap-3 mt-8"
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="md" />
              <div 
                className="text-caption" 
                style={{ 
                  color: "var(--foreground-secondary)",
                  lineHeight: "var(--leading-base)",
                }}
              >
                Loading more markets...
              </div>
            </div>
          ) : (
            <div style={{ height: "1px" }} aria-hidden="true" />
          )}
        </div>
      )}
    </>
  );
}

