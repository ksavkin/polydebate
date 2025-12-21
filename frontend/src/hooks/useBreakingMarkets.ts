"use client";

import { useState, useEffect, useMemo } from "react";
import { apiClient, type Market } from "@/lib/api";

interface UseBreakingMarketsOptions {
  tag?: string;
  searchQuery?: string;
  limit?: number;
}

interface BreakingMarket {
  id: string;
  question: string;
  description?: string;
  category: string;
  outcomes: Array<{
    name: string;
    price: number;
  }>;
  volume: string;
  price_change_24h?: number;
  sparkline?: number[];
  image_url?: string;
}

export function useBreakingMarkets({
  tag,
  searchQuery = "",
  limit = 15,
}: UseBreakingMarketsOptions) {
  const [markets, setMarkets] = useState<BreakingMarket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch breaking markets from API
  useEffect(() => {
    const fetchBreakingMarkets = async () => {
      setIsInitialLoading(true);
      setError(null);

      try {
        const response = await apiClient.getBreakingMarkets({
          tag: tag,
          limit: limit,
        });

        if (response.markets && response.markets.length > 0) {
          setMarkets(response.markets);
        } else {
          setMarkets([]);
        }
      } catch (err) {
        console.error('Error fetching breaking markets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load breaking markets');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchBreakingMarkets();
  }, [tag, limit]);

  // Filter by search query client-side
  const filteredMarkets = useMemo(() => {
    if (!searchQuery.trim()) {
      return markets;
    }

    const query = searchQuery.toLowerCase().trim();
    return markets.filter((market) => {
      const question = (market.question || "").toLowerCase();
      const category = (market.category || "").toLowerCase();
      return question.includes(query) || category.includes(query);
    });
  }, [markets, searchQuery]);

  return {
    markets: filteredMarkets,
    isLoading,
    isInitialLoading,
    error,
  };
}
