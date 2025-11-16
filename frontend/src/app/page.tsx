"use client";

import { Navigation } from "@/components/Navigation";
import { MarketCard } from "@/components/MarketCard";
import { Footer } from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BreakingNews } from "@/components/BreakingNews";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
          const isToday = createdDate.toDateString() === now.toDateString();
          return isToday;
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
          return daysUntilEnd > 0 && daysUntilEnd <= 7; // Ending within 7 days
        }
        
        // New markets filter
        if (subtopicLower === "new markets") {
          if (!market.created_date) return false;
          const createdDate = new Date(market.created_date);
          const daysAgo = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 3; // Created within last 3 days
        }
        
        // Hot markets - high volume or high activity
        if (subtopicLower === "hot") {
          // Consider markets with high volume or ending soon as "hot"
          const volumeNum = parseVolume(market.volume);
          const isHighVolume = volumeNum >= 100000; // $100k+ volume
          
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
        
        // Category-specific subtopics (e.g., "US Elections", "Presidential", etc.)
        // Check if subtopic matches question or category
        const question = market.question.toLowerCase();
        const category = market.category.toLowerCase();
        return question.includes(subtopicLower) || category.includes(subtopicLower);
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
      if (subtopicLower === "new markets") {
        filtered.sort((a, b) => {
          if (!a.created_date) return 1;
          if (!b.created_date) return -1;
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        });
      }
      
      // Sort breaking category subtopics by most recent (newest first)
      if (activeCategory === "breaking" && (
        subtopicLower === "just now" || 
        subtopicLower === "last hour" || 
        subtopicLower === "today" || 
        subtopicLower === "this week"
      )) {
        filtered.sort((a, b) => {
          if (!a.created_date) return 1;
          if (!b.created_date) return -1;
          return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
        });
      }
    }
    
    // Default sort for breaking category (when "All" is selected) - newest first
    if (activeCategory === "breaking" && activeSubtopic === "All") {
      filtered.sort((a, b) => {
        if (!a.created_date) return 1;
        if (!b.created_date) return -1;
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((market) =>
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query) ||
        (market.description && market.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allMarkets, activeCategory, activeSubtopic, searchQuery]);

  // Transform markets for Breaking News component
  const breakingMarkets = useMemo(() => {
    // Only show breaking layout when activeCategory is "breaking"
    if (activeCategory !== "breaking") return [];
    
    return filteredMarkets.slice(0, 15).map((market, index) => {
      // Calculate percentage (use first outcome price or average)
      const percentage = market.outcomes.length > 0
        ? Math.round(market.outcomes[0].price * 100)
        : 50;
      
      // Use real price change from API if available, otherwise calculate or use 0
      let change = 0;
      if (market.price_change_24h !== undefined && market.price_change_24h !== null) {
        // Use real price change from API
        change = market.price_change_24h;
      } else {
        // Fallback: simulate change if API doesn't provide it
        // In production, you might want to calculate from historical data
        change = (Math.random() * 60 - 30);
      }
      
      return {
        id: market.id,
        question: market.question,
        image_url: market.image_url,
        rank: index + 1,
        percentage,
        change: Math.round(change * 10) / 10,
        volume: market.volume,
        category: market.category,
      };
    });
  }, [filteredMarkets, activeCategory]);

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

        {/* Breaking News Layout */}
        {!isInitialLoading && !error && activeCategory === "breaking" && breakingMarkets.length > 0 ? (
          <BreakingNews
            markets={breakingMarkets}
            activeCategory={activeCategory}
            onCategoryChange={(category) => {
              setActiveCategory(category);
              setActiveSubtopic("All");
            }}
          />
        ) : !isInitialLoading && !error && displayedMarkets.length > 0 ? (
          <>
            {/* Markets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch" style={{ overflow: "visible" }}>
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
