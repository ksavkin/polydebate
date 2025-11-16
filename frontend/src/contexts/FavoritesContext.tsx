'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient, Favorite } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';

interface FavoritesContextType {
  favorites: Set<string>; // Set of market_ids
  loading: boolean;
  isFavorited: (marketId: string) => boolean;
  toggleFavorite: (marketId: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Load favorites when user authenticates
  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites(new Set());
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.getFavorites();
      const marketIds = new Set(response.data.favorites.map(fav => fav.market_id));
      setFavorites(marketIds);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      // Don't show error to user, just silently fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Load favorites on mount and when auth status changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorited = useCallback((marketId: string): boolean => {
    return favorites.has(marketId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (marketId: string) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Redirect to login page
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    const wasFavorited = favorites.has(marketId);

    // Optimistically update UI
    setFavorites(prev => {
      const next = new Set(prev);
      if (wasFavorited) {
        next.delete(marketId);
      } else {
        next.add(marketId);
      }
      return next;
    });

    try {
      if (wasFavorited) {
        await apiClient.removeFavorite(marketId);
      } else {
        await apiClient.addFavorite(marketId);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);

      // Revert optimistic update on error
      setFavorites(prev => {
        const next = new Set(prev);
        if (wasFavorited) {
          next.add(marketId);
        } else {
          next.delete(marketId);
        }
        return next;
      });

      // Show error message
      alert('Failed to update favorite. Please try again.');
    }
  }, [favorites, isAuthenticated, router]);

  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  const value: FavoritesContextType = {
    favorites,
    loading,
    isFavorited,
    toggleFavorite,
    refreshFavorites,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
