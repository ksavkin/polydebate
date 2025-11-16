"use client";

import { Navigation } from "@/components/Navigation";
import { MarketCard } from "@/components/MarketCard";
import { Footer } from "@/components/Footer";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";

// Mock data - will be replaced with API calls
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
  const [displayCount, setDisplayCount] = useState(CARDS_PER_PAGE);
  const [showFooter, setShowFooter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filter markets based on category, subtopic, and search
  const filteredMarkets = useMemo(() => {
    let filtered = mockMarkets;

    // Filter by category
    if (activeCategory !== "trending" && activeCategory !== "breaking" && activeCategory !== "new") {
      filtered = filtered.filter((market) => 
        market.category.toLowerCase() === activeCategory
      );
    }

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

    // Always generate enough markets for infinite scroll (at least 3 pages worth)
    const minMarketsNeeded = CARDS_PER_PAGE * 3;
    if (filtered.length < minMarketsNeeded) {
      const moreMarkets = generateMoreMarkets(mockMarkets, minMarketsNeeded - filtered.length, filtered.length);
      filtered = [...filtered, ...moreMarkets] as typeof mockMarkets;
    }

    return filtered;
  }, [activeCategory, activeSubtopic, searchQuery]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(CARDS_PER_PAGE);
    setNewCardIds(new Set()); // Clear new card animations when filters change
  }, [activeCategory, activeSubtopic, searchQuery]);

  // Calculate displayed markets
  const displayedMarkets = filteredMarkets.slice(0, displayCount);
  const hasMoreMarkets = displayCount < filteredMarkets.length;

  // Infinite scroll observer
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget || !hasMoreMarkets) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMoreMarkets) {
          setIsLoading(true);
          // Simulate loading delay
          setTimeout(() => {
            const previousCount = displayCount;
            setDisplayCount((prev) => {
              const newCount = prev + CARDS_PER_PAGE;
              // Mark new cards for animation
              const newIds = new Set<string>();
              const newMarkets = filteredMarkets.slice(previousCount, newCount);
              newMarkets.forEach((market) => {
                newIds.add(market.id);
              });
              setNewCardIds(newIds);
              // Clear animation class after animation completes
              setTimeout(() => {
                setNewCardIds(new Set());
              }, 500);
              return newCount;
            });
            setIsLoading(false);
          }, 800);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(currentTarget);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, hasMoreMarkets, displayCount, filteredMarkets]);

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

        {/* Markets Grid */}
        {displayedMarkets.length > 0 ? (
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
                      style={{ color: "var(--foreground-secondary)" }}
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
              style={{ color: "var(--foreground-secondary)" }}
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
