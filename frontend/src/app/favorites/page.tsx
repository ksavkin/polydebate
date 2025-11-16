'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { apiClient, Market } from '@/lib/api';
import { MarketCard } from '@/components/MarketCard';
import Link from 'next/link';

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated (after loading is complete)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent('/favorites')}`);
    }
  }, [isAuthenticated, authLoading, router]);

  // Load market details for favorited markets
  useEffect(() => {
    const loadMarkets = async () => {
      if (!isAuthenticated || favorites.size === 0) {
        setMarkets([]);
        return;
      }

      setLoadingMarkets(true);
      setError(null);

      try {
        // Fetch market details for each favorited market
        const marketPromises = Array.from(favorites).map(marketId =>
          apiClient.getMarket(marketId).catch(err => {
            console.error(`Failed to load market ${marketId}:`, err);
            return null;
          })
        );

        const results = await Promise.all(marketPromises);
        const validMarkets = results.filter((m): m is Market => m !== null);
        setMarkets(validMarkets);
      } catch (err) {
        console.error('Failed to load favorite markets:', err);
        setError('Failed to load your favorite markets. Please try again.');
      } finally {
        setLoadingMarkets(false);
      }
    };

    loadMarkets();
  }, [favorites, isAuthenticated]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p style={{ color: "var(--foreground-secondary)" }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-h1 font-bold mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Your Favorites
        </h1>
        <p
          className="text-body"
          style={{ color: "var(--foreground-secondary)" }}
        >
          Markets you've bookmarked for quick access
        </p>
      </div>

      {/* Loading state */}
      {(favoritesLoading || loadingMarkets) && favorites.size === 0 && (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p style={{ color: "var(--foreground-secondary)" }}>
              Loading your favorites...
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="p-4 rounded-lg border mb-6"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <p style={{ color: "var(--color-red)" }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!favoritesLoading && !loadingMarkets && favorites.size === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <svg
            className="size-16 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: "var(--foreground-secondary)", opacity: 0.5 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <h2
            className="text-h2 font-bold mb-2"
            style={{ color: "var(--foreground)" }}
          >
            No favorites yet
          </h2>
          <p
            className="text-body mb-6 max-w-md"
            style={{ color: "var(--foreground-secondary)" }}
          >
            Start bookmarking markets to see them here. Click the bookmark icon on any market card to add it to your favorites.
          </p>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-white)",
            }}
          >
            Explore Markets
          </Link>
        </div>
      )}

      {/* Markets grid */}
      {!favoritesLoading && !loadingMarkets && markets.length > 0 && (
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 380px), 1fr))",
          }}
        >
          {markets.map((market) => (
            <MarketCard
              key={market.id}
              id={market.id}
              question={market.question}
              description={market.description}
              category={market.category}
              tag_id={typeof market.tag_id === 'string' ? market.tag_id : market.tag_id?.id}
              market_type={market.market_type}
              outcomes={market.outcomes}
              volume={market.volume}
              volume_24h={market.volume_24h}
              liquidity={market.liquidity}
              end_date={market.end_date}
              created_date={market.created_date}
              image_url={market.image_url}
              resolution_source={market.resolution_source}
            />
          ))}
        </div>
      )}
    </div>
  );
}
