"use client";

import { Navigation } from "@/components/Navigation";
import { MarketCard } from "@/components/MarketCard";
import { Footer } from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { apiClient, type Market } from "@/lib/api";

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
  };
};

// Legacy mock data - kept for reference but not used
const mockMarkets = [
  {
    id: "bitcoin-100k-2025",
    question: "Will Bitcoin reach $100k in 2025?",
    category: "Crypto",
    outcomes: [
      { name: "Yes", price: 0.45 },
      { name: "No", price: 0.55 },
    ],
    volume: "1.2M",
    period: "daily" as const,
  },
  {
    id: "fed-decision-december",
    question: "Fed decision in December?",
    category: "Finance",
    outcomes: [
      { name: "50+ bps decrease", price: 0.02 },
      { name: "25 bps decrease", price: 0.46 },
      { name: "No change", price: 0.52 },
    ],
    volume: "98M",
    period: "monthly" as const,
  },
  {
    id: "super-bowl-2026",
    question: "Super Bowl Champion 2026",
    category: "Sports",
    outcomes: [
      { name: "Kansas City", price: 0.13 },
      { name: "Philadelphia", price: 0.11 },
      { name: "Buffalo", price: 0.09 },
    ],
    volume: "533M",
    period: "monthly" as const,
  },
  {
    id: "chile-election",
    question: "Chile Presidential Election",
    category: "Politics",
    outcomes: [
      { name: "José Antonio Kast", price: 0.72 },
      { name: "Jeannette Jara", price: 0.16 },
      { name: "Other", price: 0.12 },
    ],
    volume: "65M",
    period: "daily" as const,
  },
  {
    id: "gemini-3-release",
    question: "Gemini 3.0 released by...?",
    category: "Tech",
    outcomes: [
      { name: "Nov 15", price: 0.01 },
      { name: "Nov 22", price: 0.88 },
      { name: "Later", price: 0.11 },
    ],
    volume: "13M",
    period: "daily" as const,
  },
  {
    id: "ai-person-of-year",
    question: "TIME 2025 Person of the Year",
    category: "Culture",
    outcomes: [
      { name: "Artificial Intelligence", price: 0.39 },
      { name: "Pope Leo XIV", price: 0.15 },
      { name: "Other", price: 0.46 },
    ],
    volume: "5.2M",
    period: "monthly" as const,
  },
  {
    id: "lakers-bucks",
    question: "Lakers vs Bucks",
    category: "Sports",
    outcomes: [
      { name: "Lakers", price: 0.48 },
      { name: "Bucks", price: 0.53 },
    ],
    volume: "1M",
    isLive: true,
    period: "daily" as const,
  },
  {
    id: "epstein-disclosure",
    question: "House passes Epstein disclosure bill/resolution...",
    category: "Politics",
    outcomes: [
      { name: "Yes", price: 0.93 },
      { name: "No", price: 0.07 },
    ],
    volume: "409K",
    period: "daily" as const,
  },
  {
    id: "us-election-2028",
    question: "Democratic Presidential Nominee 2028",
    category: "Politics",
    outcomes: [
      { name: "Gavin Newsom", price: 0.38 },
      { name: "Alexandria Ocasio-Cortez", price: 0.12 },
      { name: "Other", price: 0.50 },
    ],
    volume: "303M",
    period: "monthly" as const,
  },
  {
    id: "nfl-super-bowl",
    question: "NFL Super Bowl Winner 2026",
    category: "Sports",
    outcomes: [
      { name: "Kansas City Chiefs", price: 0.15 },
      { name: "Buffalo Bills", price: 0.12 },
      { name: "San Francisco 49ers", price: 0.10 },
    ],
    volume: "45M",
    period: "monthly" as const,
  },
  {
    id: "eth-price-2025",
    question: "Will Ethereum reach $5000 in 2025?",
    category: "Crypto",
    outcomes: [
      { name: "Yes", price: 0.62 },
      { name: "No", price: 0.38 },
    ],
    volume: "2.5M",
    period: "daily" as const,
  },
  {
    id: "inflation-target",
    question: "Will US inflation (CPI) be below 3% by end of 2024?",
    category: "Finance",
    outcomes: [
      { name: "Yes", price: 0.40 },
      { name: "No", price: 0.60 },
    ],
    volume: "1.1M",
    period: "daily" as const,
  },
  {
    id: "ai-breakthrough",
    question: "Will AGI be achieved by 2026?",
    category: "Tech",
    outcomes: [
      { name: "Yes", price: 0.25 },
      { name: "No", price: 0.75 },
    ],
    volume: "8.5M",
    period: "monthly" as const,
  },
];

// Generate more markets for infinite scroll (deterministic to avoid hydration errors)
const generateMoreMarkets = (baseMarkets: typeof mockMarkets, count: number, startIndex: number = 0) => {
  const categories = ["Politics", "Sports", "Finance", "Crypto", "Tech", "Culture", "Geopolitics", "Economy"];
  const templates = [
    { question: "Will {topic} happen in {year}?", outcomes: ["Yes", "No"] },
    { question: "{topic} market prediction", outcomes: ["Bullish", "Bearish", "Neutral"] },
    { question: "Which {category} event will occur first?", outcomes: ["Option A", "Option B", "Option C"] },
  ];
  
  // Deterministic volume values (alternating pattern)
  const volumeValues = ["1.2M", "850K", "2.5M", "450K", "5.8M", "1.1M", "3.2M", "680K", "4.1M", "920K"];

  const newMarkets = [];
  for (let i = 0; i < count; i++) {
    const globalIndex = startIndex + i;
    const category = categories[globalIndex % categories.length];
    const template = templates[globalIndex % templates.length];
    const question = template.question
      .replace("{topic}", `Event ${globalIndex + 1}`)
      .replace("{category}", category.toLowerCase())
      .replace("{year}", (2025 + Math.floor(globalIndex / 10)).toString());
    
    // Deterministic price generation based on index
    const basePrice = 1 / template.outcomes.length;
    const variation = ((globalIndex * 0.1) % 0.2) - 0.1; // Deterministic variation
    const outcomes = template.outcomes.map((name, idx) => ({
      name,
      price: basePrice + (variation * (idx === 0 ? 1 : -0.5)),
    }));

    // Normalize prices to sum to 1
    const sum = outcomes.reduce((acc, o) => acc + o.price, 0);
    outcomes.forEach(o => o.price = o.price / sum);

    newMarkets.push({
      id: `market-${baseMarkets.length + globalIndex}`,
      question,
      category,
      outcomes,
      volume: volumeValues[globalIndex % volumeValues.length],
      period: globalIndex % 2 === 0 ? ("daily" as const) : ("monthly" as const),
      isLive: false,
    });
  }
  return newMarkets;
};

const CARDS_PER_PAGE = 16; // 4 rows × 4 columns

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("trending");
  const [activeSubtopic, setActiveSubtopic] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [allMarkets, setAllMarkets] = useState<Market[]>([]); // All loaded markets
  const [displayCount, setDisplayCount] = useState(CARDS_PER_PAGE);
  const [showFooter, setShowFooter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch markets from API
  useEffect(() => {
    const fetchMarkets = async () => {
      setIsInitialLoading(true);
      setError(null);
      setOffset(0);
      setAllMarkets([]);

             try {
               // All categories are now passed to API (breaking/trending/new use path endpoints)
               const response = await apiClient.getMarkets({
                 limit: 100, // Fetch more initially
                 offset: 0,
                 category: activeCategory,
                 closed: false,
               });

        setAllMarkets(response.markets);
        setHasMore(response.has_more);
        setOffset(response.markets.length);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load markets';
        setError(errorMessage);
        console.error('Error fetching markets:', err);
        
        // Log helpful debugging info
        if (errorMessage.includes('Cannot connect to backend')) {
          console.error('Backend connection issue. Please ensure:');
          console.error('1. Backend server is running: cd backend && python app.py');
          console.error('2. Backend is accessible at:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
        }
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchMarkets();
  }, [activeCategory]); // Refetch when category changes

         // Filter markets based on subtopic and search (category filtering is done server-side)
         const filteredMarkets = useMemo(() => {
           let filtered = allMarkets.map(transformMarket);

           // Category filtering is now done server-side via API, so we only filter by subtopic and search

    // Filter by subtopic (if not "All")
    if (activeSubtopic !== "All") {
      filtered = filtered.filter((market) => {
        const question = market.question.toLowerCase();
        const subtopicLower = activeSubtopic.toLowerCase();
        return question.includes(subtopicLower) || market.category.toLowerCase().includes(subtopicLower);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((market) =>
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allMarkets, activeCategory, activeSubtopic, searchQuery]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(CARDS_PER_PAGE);
    setNewCardIds(new Set()); // Clear new card animations when filters change
  }, [activeCategory, activeSubtopic, searchQuery]);

  // Calculate displayed markets
  const displayedMarkets = filteredMarkets.slice(0, displayCount);
  const hasMoreMarkets = displayCount < filteredMarkets.length || (hasMore && !isInitialLoading);

         // Load more markets when scrolling
         const loadMoreMarkets = useCallback(async () => {
           if (isLoading || !hasMore) return;

           setIsLoading(true);
           try {
             // All categories are now passed to API (breaking/trending/new use path endpoints)
             const response = await apiClient.getMarkets({
               limit: CARDS_PER_PAGE,
               offset: offset,
               category: activeCategory,
               closed: false,
             });

      if (response.markets.length > 0) {
        setAllMarkets((prev) => [...prev, ...response.markets]);
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

        setDisplayCount((prev) => prev + CARDS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more markets:', err);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, offset, activeCategory]);

  // Infinite scroll observer
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore && !isInitialLoading) {
          loadMoreMarkets();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(currentTarget);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, hasMore, isInitialLoading, offset, loadMoreMarkets]);

  // Scroll detection for footer
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      setShowFooter(scrollPosition > 200); // Show footer after scrolling 200px
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <Navigation 
        activeCategory={activeCategory}
        activeSubtopic={activeSubtopic}
        searchQuery={searchQuery}
        onCategoryChange={(category) => {
          setActiveCategory(category);
          setActiveSubtopic("All"); // Reset subtopic when category changes
        }}
        onSubtopicChange={(subtopic) => setActiveSubtopic(subtopic)}
        onSearchChange={(query) => setSearchQuery(query)}
      />

      <main className="container mx-auto px-4 py-6 pb-24">

        {/* Error State */}
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

        {/* Initial Loading State */}
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
              Loading markets...
            </div>
          </div>
        )}

        {/* Markets Grid */}
        {!isInitialLoading && !error && displayedMarkets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {displayedMarkets.map((market) => (
                <MarketCard 
                  key={market.id} 
                  {...market}
                  isLive={market.isLive}
                  isNew={newCardIds.has(market.id)}
                />
              ))}
            </div>
            
            {/* Infinite scroll trigger - Always render if there are more markets */}
            {hasMoreMarkets && (
              <div 
                ref={observerTarget} 
                className="h-32 flex flex-col items-center justify-center gap-3 mt-8"
              >
                {isLoading && (
                  <div className="flex flex-col items-center gap-3 animate-in">
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
                )}
              </div>
            )}
          </>
        ) : (
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
        )}
      </main>

      {/* Footer - appears/disappears based on scroll */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300",
          showFooter ? "translate-y-0" : "translate-y-full"
        )}
      >
        <Footer />
      </div>
    </div>
  );
}
