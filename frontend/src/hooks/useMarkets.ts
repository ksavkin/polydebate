"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { apiClient, type Market } from "@/lib/api";

// Expanded search terms for category subtopics
const subtopicExpandedTerms: Record<string, string[]> = {
  // Geopolitics subtopics
  "us-china": ["us", "china", "chinese", "american", "united states", "u.s.", "beijing", "tariff", "trade war", "xi jinping"],
  "russia-ukraine": ["russia", "ukraine", "russian", "ukrainian", "putin", "zelensky", "moscow", "kyiv", "kiev", "kremlin", "crimea"],
  "middle east": ["israel", "gaza", "iran", "saudi", "arab", "palestine", "palestinian", "hamas", "hezbollah", "syria", "iraq", "yemen", "lebanon", "netanyahu"],
  "europe": ["eu", "european", "germany", "german", "france", "french", "uk", "britain", "british", "nato", "brussels", "italy", "spain", "poland"],
  "asia": ["japan", "japanese", "korea", "korean", "taiwan", "taiwanese", "india", "indian", "southeast asia", "indonesia", "philippines", "vietnam", "thailand"],
  // Finance subtopics
  "fed rates": ["fed", "federal reserve", "interest rate", "rate cut", "rate hike", "fomc", "powell", "monetary policy", "basis point"],
  "inflation": ["inflation", "cpi", "consumer price", "price index", "deflation", "stagflation"],
  "stocks": ["stock", "stocks", "s&p", "nasdaq", "dow", "equity", "equities", "shares", "market cap", "ipo"],
  "bonds": ["bond", "bonds", "treasury", "treasuries", "yield", "yields", "debt", "fixed income"],
  "forex": ["forex", "currency", "dollar", "euro", "yen", "pound", "exchange rate", "fx", "usd", "eur", "gbp"],
  "commodities": ["commodity", "commodities", "oil", "gold", "silver", "copper", "wheat", "corn", "natural gas", "crude"],
  // Sports subtopics
  "nfl": ["nfl", "football", "super bowl", "touchdown", "quarterback", "patriots", "chiefs", "cowboys", "eagles", "49ers"],
  "nba": ["nba", "basketball", "lakers", "celtics", "warriors", "bucks", "heat", "playoffs", "finals"],
  "mlb": ["mlb", "baseball", "world series", "yankees", "dodgers", "red sox", "cubs", "home run"],
  "soccer": ["soccer", "football", "fifa", "world cup", "premier league", "la liga", "champions league", "messi", "ronaldo", "manchester", "barcelona", "real madrid"],
  "tennis": ["tennis", "wimbledon", "us open", "french open", "australian open", "grand slam", "djokovic", "nadal", "federer", "atp", "wta"],
  "golf": ["golf", "pga", "masters", "us open golf", "british open", "ryder cup", "tiger woods", "mcilroy"],
  // Politics subtopics
  "us elections": ["election", "vote", "ballot", "primary", "caucus", "electoral", "swing state", "polling", "midterm", "general election", "runoff", "voter", "democrat", "republican"],
  "presidential": ["president", "presidential", "white house", "oval office", "biden", "trump", "harris", "vance", "desantis", "newsom", "pence", "2024", "2028", "inauguration", "executive order"],
  "congress": ["congress", "senate", "house", "representative", "senator", "speaker", "majority", "minority", "mcconnell", "schumer", "pelosi", "johnson", "filibuster", "legislation", "bill"],
  "state elections": ["governor", "state legislature", "gubernatorial", "state senate", "state house", "secretary of state", "attorney general", "state race", "local election"],
  "international": ["canada", "mexico", "uk election", "france election", "germany election", "brazil", "argentina", "parliamentary", "prime minister", "macron", "trudeau", "starmer"],
  // Crypto subtopics
  "bitcoin": ["bitcoin", "btc", "satoshi", "halving", "lightning network"],
  "ethereum": ["ethereum", "eth", "vitalik", "solidity", "gas fee", "layer 2"],
  "altcoins": ["altcoin", "solana", "cardano", "polkadot", "avalanche", "polygon", "matic", "xrp", "ripple"],
  "defi": ["defi", "decentralized finance", "yield", "liquidity", "swap", "lending", "staking", "aave", "uniswap"],
  "nfts": ["nft", "nfts", "opensea", "digital art", "collectible", "token"],
  "regulation": ["regulation", "sec", "cftc", "crypto ban", "crypto law", "legal", "compliance"],
  // Tech subtopics
  "ai": ["ai", "artificial intelligence", "chatgpt", "openai", "anthropic", "claude", "llm", "machine learning", "neural"],
  "apple": ["apple", "iphone", "ipad", "mac", "ios", "tim cook", "cupertino"],
  "google": ["google", "alphabet", "android", "chrome", "youtube", "sundar pichai", "search"],
  "microsoft": ["microsoft", "windows", "azure", "xbox", "satya nadella", "bing", "office"],
  "startups": ["startup", "venture", "vc", "unicorn", "seed round", "series a", "founder", "y combinator"],
  "hardware": ["hardware", "chip", "semiconductor", "nvidia", "amd", "intel", "processor", "gpu"],
  // Culture subtopics
  "entertainment": ["entertainment", "show", "award", "emmy", "grammy", "oscar", "golden globe"],
  "movies": ["movie", "film", "box office", "cinema", "hollywood", "streaming", "netflix", "disney"],
  "music": ["music", "album", "song", "artist", "concert", "tour", "spotify", "grammy"],
  "tv": ["tv", "television", "series", "streaming", "netflix", "hbo", "show", "episode"],
  "celebrities": ["celebrity", "star", "famous", "kardashian", "swift", "beyonce", "drake"],
  // Economy subtopics
  "gdp": ["gdp", "gross domestic product", "economic growth", "recession", "expansion"],
  "employment": ["employment", "jobs", "unemployment", "labor", "workforce", "hiring", "layoff"],
  "housing": ["housing", "real estate", "mortgage", "home price", "rent", "property"],
  "trade": ["trade", "tariff", "import", "export", "deficit", "surplus", "wto"],
  "policy": ["policy", "fiscal", "stimulus", "budget", "spending", "debt ceiling"],
  // Elections subtopics
  "us 2024": ["2024", "midterm", "november 2024"],
  "us 2028": ["2028"],
  "state": ["governor", "gubernatorial", "state legislature", "state senate", "state house", "secretary of state", "attorney general", "state election", "state race"],
  "local": ["local election", "mayor", "city council", "county", "municipal", "school board", "local race"],
  // Earnings subtopics (sector-specific company earnings)
  // Match company names, tickers, or sector keywords in earnings questions
  "tech": ["apple", "aapl", "google", "googl", "alphabet", "microsoft", "msft", "meta", "amazon", "amzn", "nvidia", "nvda", "tesla", "tsla", "intel", "intc", "amd", "qualcomm", "qcom", "broadcom", "avgo", "salesforce", "crm", "adobe", "adbe", "netflix", "nflx", "reddit", "rddt"],
  "finance": ["jpmorgan", "jpm", "goldman", "gs", "morgan stanley", "ms", "bank of america", "bac", "wells fargo", "wfc", "citibank", "c", "state street", "stt", "jefferies", "jef", "blackrock", "blk", "charles schwab", "schw"],
  "retail": ["walmart", "wmt", "target", "tgt", "costco", "cost", "gap", "gps", "home depot", "hd", "lowes", "low", "dollar", "dltr", "ross", "rost", "tjx", "carmax", "kmx"],
  "energy": ["exxon", "xom", "chevron", "cvx", "shell", "shel", "bp", "conocophillips", "cop", "schlumberger", "slb", "halliburton", "hal", "occidental", "oxy", "rivian", "rivn"],
  "healthcare": ["pfizer", "pfe", "johnson", "jnj", "unitedhealth", "unh", "merck", "mrk", "abbvie", "abbv", "eli lilly", "lly", "amgen", "amgn", "gilead", "gild", "bristol", "bmy", "moderna", "mrna", "regeneron", "regn", "cvs", "cigna", "ci", "humana", "hum"],
  // World subtopics (geographic regions)
  "americas": ["america", "americas", "u.s.", "usa", "united states", "canada", "canadian", "mexico", "mexican", "brazil", "brazilian", "argentina", "latin america", "south america", "north america", "caribbean", "venezuela", "colombia", "chile", "peru", "cuba"],
  "africa": ["africa", "african", "nigeria", "south africa", "egypt", "kenya", "morocco", "ethiopia", "ghana", "congo", "sudan", "algeria", "tunisia", "libya"],
  "oceania": ["australia", "australian", "new zealand", "pacific island", "oceania", "fiji", "papua", "samoa"],
};

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

  // Filter outcomes globally - apply same filter everywhere
  const filteredOutcomes = market.outcomes.filter((outcome) => {
    // Filter out placeholder outcomes
    const name = outcome.name?.toLowerCase() || '';
    if (name.includes('placeholder')) {
      return false;
    }
    // Filter out "Other" only if it looks like a placeholder (price 0.5 and no shares)
    if (name === 'other' && outcome.price === 0.5 && (!outcome.shares || outcome.shares === '0')) {
      return false;
    }
    // Filter out outcomes with price_change_24h: 0.0 and shares: "0"
    if (outcome.price_change_24h !== undefined && outcome.price_change_24h === 0.0 && (!outcome.shares || outcome.shares === '0')) {
      return false;
    }
    // Filter out outcomes where shares is 0 or empty
    const shares = outcome.shares;
    if (!shares || shares === '0' || parseFloat(String(shares)) === 0) {
      return false;
    }
    return true;
  });

  return {
    id: market.id,
    question: market.question,
    description: market.description,
    category: market.category,
    tag_id: typeof market.tag_id === 'object' && market.tag_id !== null ? market.tag_id.id : market.tag_id,
    market_type: market.market_type,
    outcomes: filteredOutcomes.map(outcome => ({
      name: outcome.name,
      slug: outcome.slug,
      price: outcome.price,
      shares: outcome.shares,
      price_change_24h: outcome.price_change_24h,
      image_url: outcome.image_url,
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
            category: category === "ended" ? undefined : category,
            closed: category === "ended", // Fetch closed markets for "ended" category
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
    
    // Filter by ended status based on category
    if (category === "ended") {
      // Show only ended markets
      const now = new Date();
      filtered = filtered.filter((market) => {
        if (!market.end_date) return false;
        const endDate = new Date(market.end_date);
        return endDate.getTime() < now.getTime();
      });
    } else {
      // Filter out ended markets from regular categories
      const now = new Date();
      filtered = filtered.filter((market) => {
        if (!market.end_date) return true; // Keep markets without end_date
        const endDate = new Date(market.end_date);
        return endDate.getTime() >= now.getTime(); // Keep only active markets
      });
    }

    if (activeSubtopic !== "All") {
      const now = new Date();
      const subtopicLower = activeSubtopic.toLowerCase();

      filtered = filtered.filter((market) => {
        // Ended category filters - check FIRST before generic time filters
        if (category === "ended") {
          if (!market.end_date) return false;
          const endDate = new Date(market.end_date);
          const daysSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);

          if (subtopicLower === "today") {
            return daysSinceEnd >= 0 && daysSinceEnd < 1;
          }

          if (subtopicLower === "this week") {
            return daysSinceEnd >= 0 && daysSinceEnd < 7;
          }

          if (subtopicLower === "this month") {
            return daysSinceEnd >= 0 && daysSinceEnd < 30;
          }

          if (subtopicLower === "older") {
            return daysSinceEnd >= 30;
          }

          // For "All" and other subtopics, show all ended markets
          return true;
        }

        // Time-based filters for NON-ended categories
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

        // Check if this subtopic has expanded search terms
        const expandedTerms = subtopicExpandedTerms[subtopicLower];
        if (expandedTerms) {
          // Match if any of the expanded terms are found in the question
          return expandedTerms.some((term: string) => question.includes(term));
        }

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
      
      // Sort ended markets by end date (most recently ended first)
      if (category === "ended") {
        filtered.sort((a, b) => {
          if (!a.end_date) return 1;
          if (!b.end_date) return -1;
          return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
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
    
    // Default sort for ended category (when "All" is selected) - most recently ended first
    if (category === "ended" && activeSubtopic === "All") {
      filtered.sort((a, b) => {
        if (!a.end_date) return 1;
        if (!b.end_date) return -1;
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
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
        category: category === "ended" ? undefined : category,
        closed: category === "ended", // Fetch closed markets for "ended" category
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

