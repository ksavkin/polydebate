"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { apiClient, type Market } from "@/lib/api";

// Helper function to parse volume strings (e.g., "1.2M", "850K", "$10.5M")
const parseVolume = (volumeStr: string): number => {
  if (!volumeStr) return 0;
  const cleaned = volumeStr.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned) || 0;
  
  if (volumeStr.toUpperCase().includes('M')) {
    return num * 1000000;
  } else if (volumeStr.toUpperCase().includes('K')) {
    return num * 1000;
  } else if (volumeStr.toUpperCase().includes('B')) {
    return num * 1000000000;
  }
  return num;
};

// Transform API market to component format
const transformMarket = (market: Market) => {
  // Determine period based on end_date (if available)
  let period: "daily" | "monthly" = "daily";
  if (market.end_date) {
    const endDate = new Date(market.end_date);
    const now = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    period = daysUntilEnd > 30 ? "monthly" : "daily";
  }

  // Determine if market is live (ending soon or high volume)
  const isLive = market.end_date 
    ? new Date(market.end_date).getTime() - Date.now() < 24 * 60 * 60 * 1000 // Less than 24 hours
    : false;

  return {
    id: market.id,
    question: market.question,
    description: market.description,
    category: market.category,
    tag_id: typeof market.tag_id === 'object' && market.tag_id !== null ? market.tag_id.id : market.tag_id,
    market_type: market.market_type,
    outcomes: market.outcomes.map(outcome => ({
      name: outcome.name,
      slug: outcome.slug,
      price: outcome.price,
      shares: outcome.shares,
    })),
    volume: market.volume,
    volume_24h: market.volume_24h,
    liquidity: market.liquidity,
    end_date: market.end_date,
    created_date: market.created_date,
    image_url: market.image_url,
    resolution_source: market.resolution_source,
    period,
    isLive,
    price_change_24h: market.price_change_24h,
    sparkline: market.sparkline,
  };
};

interface UseMarketsOptions {
  category: string;
  activeSubtopic?: string;
  searchQuery?: string;
  cardsPerPage?: number;
}

export function useMarkets({
  category,
  activeSubtopic = "All",
  searchQuery = "",
  cardsPerPage = 16,
}: UseMarketsOptions) {
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [displayCount, setDisplayCount] = useState(cardsPerPage);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());

  // Fetch markets from API - refetch when category or search changes
  useEffect(() => {
    const fetchMarkets = async () => {
      setIsInitialLoading(true);
      setError(null);
      setOffset(0);
      setAllMarkets([]);

      try {
        const isSearching = searchQuery.trim().length > 0;
        let allFetchedMarkets: Market[] = [];
        let currentOffset = 0;
        const batchSize = 100;
        const maxBatches = isSearching ? 5 : 1; // Fetch up to 5 batches (500 markets) when searching
        
        // Fetch multiple batches when searching to find more results
        let lastResponse: any = null;
        for (let batch = 0; batch < maxBatches; batch++) {
          const response = await apiClient.getMarkets({
            limit: batchSize,
            offset: currentOffset,
            category: category,
            closed: false,
          });

          lastResponse = response;

          if (response.markets && response.markets.length > 0) {
            // Deduplicate by ID
            const newMarkets = response.markets.filter(
              (market) => !allFetchedMarkets.some((m) => m.id === market.id)
            );
            allFetchedMarkets = [...allFetchedMarkets, ...newMarkets];
            currentOffset += response.markets.length;

            // If not searching or we've fetched enough, stop
            if (!isSearching || !response.has_more || allFetchedMarkets.length >= 500) {
              break;
            }
          } else {
            break;
          }
        }

        if (allFetchedMarkets.length > 0) {
          setAllMarkets(allFetchedMarkets);
          setOffset(currentOffset);
          // Set hasMore based on whether there are more markets available from API
          setHasMore(lastResponse?.has_more || false);

          // Mark new cards for animation
          const newIds = new Set<string>();
          allFetchedMarkets.forEach((market) => {
            newIds.add(market.id);
          });
          setNewCardIds(newIds);
          setTimeout(() => {
            setNewCardIds(new Set());
          }, 500);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Error fetching markets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load markets');
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMarkets();
  }, [category, searchQuery, cardsPerPage]);

  // Filter and sort markets based on subtopic and search
  const filteredMarkets = useMemo(() => {
    let filtered = allMarkets.map(transformMarket);

    if (activeSubtopic !== "All") {
      const now = new Date();
      const subtopicLower = activeSubtopic.toLowerCase();
      
      filtered = filtered.filter((market) => {
        // Time-based filters
        if (subtopicLower === "just now" || subtopicLower === "last hour") {
          if (!market.created_date) return false;
          const createdDate = new Date(market.created_date);
          const hoursAgo = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
          return hoursAgo <= 1;
        }
        
        if (subtopicLower === "today") {
          if (!market.created_date) return false;
          const createdDate = new Date(market.created_date);
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          return createdDate >= today;
        }
        
        if (subtopicLower === "this week") {
          if (!market.created_date) return false;
          const createdDate = new Date(market.created_date);
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return createdDate >= weekAgo;
        }
        
        if (subtopicLower === "this month") {
          if (!market.created_date) return false;
          const createdDate = new Date(market.created_date);
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return createdDate >= monthAgo;
        }
        
        // Ending soon filter
        if (subtopicLower === "ending soon") {
          if (!market.end_date) return false;
          const endDate = new Date(market.end_date);
          const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntilEnd > 0 && daysUntilEnd <= 7;
        }
        
        // New markets filter
        if (subtopicLower === "new markets") {
          if (!market.created_date) return false;
          const createdDate = new Date(market.created_date);
          const daysAgo = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 3;
        }
        
        // Hot markets
        if (subtopicLower === "hot") {
          const volumeNum = parseVolume(market.volume);
          const isHighVolume = volumeNum >= 100000;
          if (market.end_date) {
            const endDate = new Date(market.end_date);
            const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            const isEndingSoon = daysUntilEnd > 0 && daysUntilEnd <= 3;
            return isHighVolume || isEndingSoon;
          }
          return isHighVolume;
        }
        
        // Most volume - will be sorted separately
        if (subtopicLower === "most volume") {
          return true; // Don't filter, just sort by volume
        }
        
        // Category-specific subtopics
        const question = market.question.toLowerCase();
        const marketCategory = market.category.toLowerCase();
        return question.includes(subtopicLower) || marketCategory.includes(subtopicLower);
      });
      
      // Sort by volume if "Most Volume" is selected
      if (subtopicLower === "most volume") {
        filtered.sort((a, b) => {
          const volumeA = parseVolume(a.volume);
          const volumeB = parseVolume(b.volume);
          return volumeB - volumeA; // Descending order
        });
      }
      
      // Sort by end date if "Ending Soon" is selected
      if (subtopicLower === "ending soon") {
        filtered.sort((a, b) => {
          if (!a.end_date) return 1;
          if (!b.end_date) return -1;
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        });
      }
      
      // Sort by created date if "New Markets" is selected
      if (subtopicLower === "new markets" || category === "breaking") {
        filtered.sort((a, b) => {
          if (!a.created_date) return 1;
          if (!b.created_date) return -1;
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        });
      }
    }
    
    // Default sort for breaking category (when "All" is selected) - newest first
    if (category === "breaking" && activeSubtopic === "All") {
      filtered.sort((a, b) => {
        if (!a.created_date) return 1;
        if (!b.created_date) return -1;
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((market) => {
        const question = (market.question || "").toLowerCase();
        const category = (market.category || "").toLowerCase();
        const description = (market.description || "").toLowerCase();
        
        // Check if query matches any part of question, category, or description
        // This will match "trump" in "Donald Trump", "Trump", etc.
        return question.includes(query) || 
               category.includes(query) || 
               description.includes(query);
      });
    }

    return filtered;
  }, [allMarkets, category, activeSubtopic, searchQuery]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(cardsPerPage);
    setNewCardIds(new Set());
  }, [category, activeSubtopic, searchQuery, cardsPerPage]);

  // Calculate displayed markets
  const displayedMarkets = filteredMarkets.slice(0, displayCount);
  const hasMoreMarkets = displayCount < filteredMarkets.length || (hasMore && !isInitialLoading);

  // Load more markets when scrolling
  const loadMoreMarkets = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      // When searching, fetch more markets per page to have more results
      const limit = searchQuery.trim() ? 50 : cardsPerPage;
      
      const response = await apiClient.getMarkets({
        limit: limit,
        offset: offset,
        category: category,
        closed: false,
      });

      if (response.markets.length > 0) {
        // Deduplicate markets by ID to avoid duplicate keys
        setAllMarkets((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMarkets = response.markets.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMarkets];
        });
        setOffset((prev) => prev + response.markets.length);
        setHasMore(response.has_more);

        // Mark new cards for animation
        const newIds = new Set<string>();
        response.markets.forEach((market) => {
          newIds.add(market.id);
        });
        setNewCardIds(newIds);
        setTimeout(() => {
          setNewCardIds(new Set());
        }, 500);

        setDisplayCount((prev) => prev + cardsPerPage);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more markets:', err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, offset, category, cardsPerPage, searchQuery]);

  return {
    markets: displayedMarkets,
    allFilteredMarkets: filteredMarkets,
    isLoading,
    isInitialLoading,
    error,
    hasMore: hasMoreMarkets,
    loadMore: loadMoreMarkets,
    newCardIds,
  };
}

