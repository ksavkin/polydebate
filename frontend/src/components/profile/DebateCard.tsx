'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserDebate } from "@/lib/api";

interface DebateCardProps {
  debate: UserDebate;
  onDelete: (id: string) => void | Promise<void>;
  onView: (id: string) => void;
  onToggleFavorite?: (marketId: string, debateId: string, isFavorite: boolean) => void | Promise<void>;
  showActions?: boolean;
}

export function DebateCard({ debate, onDelete, onView, onToggleFavorite, showActions = true }: DebateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const router = useRouter();

  // Check if this is a saved market (not a debate)
  const isSavedMarket = debate.status === 'saved' || debate.debate_id.startsWith('saved-');

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
    return `${Math.floor(seconds / 2592000)}mo ago`;
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this debate?')) {
      setIsDeleting(true);
      try {
        await onDelete(debate.debate_id);
      } catch (error) {
        console.error('Failed to delete debate:', error);
        setIsDeleting(false);
      }
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFavorite || isFavoriteLoading) return;

    setIsFavoriteLoading(true);
    try {
      // For saved markets, use market_id for removal
      const resourceId = isSavedMarket ? debate.market_id : debate.debate_id;
      await onToggleFavorite(debate.market_id, resourceId, debate.is_favorite);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleViewOrStart = () => {
    if (isSavedMarket) {
      // Navigate to market page to start a debate
      router.push(`/market/${debate.market_id}`);
    } else {
      onView(debate.debate_id);
    }
  };

  return (
    <Card
      className="transition-all hover:shadow-md"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold flex-1 line-clamp-2" style={{ color: "var(--foreground)" }}>
            {debate.market_question}
          </h3>
          {showActions && (
            <div className="flex gap-2 ml-2">
              <button
                onClick={handleFavoriteClick}
                disabled={isFavoriteLoading}
                className={`transition-colors text-lg ${debate.is_favorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'
                  } ${isFavoriteLoading ? 'opacity-50' : ''}`}
                style={{ cursor: "pointer" }}
                title={debate.is_favorite ? "Remove from favorites" : "Add to favorites"}
              >
                {debate.is_favorite ? '❤️' : '🤍'}
              </button>
              {!isSavedMarket && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="transition-colors disabled:opacity-50 hover:text-red-500"
                  style={{ color: "var(--foreground-secondary)", cursor: "pointer" }}
                  title="Delete debate"
                >
                  🗑️
                </button>
              )}
            </div>
          )}
        </div>

        {debate.market_category && (
          <span
            className="inline-block px-2 py-1 text-xs rounded mb-2"
            style={{
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              color: "var(--color-primary)"
            }}
          >
            {debate.market_category}
          </span>
        )}

        <div className="text-sm mb-3" style={{ color: "var(--foreground-secondary)" }}>
          {isSavedMarket ? (
            <>Saved {formatTimeAgo(debate.created_at)}</>
          ) : (
            <>{debate.rounds} rounds . {debate.models_count} models . {debate.total_tokens_used.toLocaleString()} tokens . {formatTimeAgo(debate.created_at)}</>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: debate.status === 'completed' ? "rgba(39, 174, 96, 0.1)" :
                debate.status === 'in_progress' ? "rgba(249, 199, 79, 0.1)" :
                debate.status === 'saved' ? "rgba(147, 51, 234, 0.1)" :
                  "rgba(107, 114, 128, 0.1)",
              color: debate.status === 'completed' ? "var(--color-green)" :
                debate.status === 'in_progress' ? "var(--color-sunny-yellow)" :
                debate.status === 'saved' ? "rgb(147, 51, 234)" :
                  "var(--foreground-secondary)"
            }}
          >
            {debate.status === 'saved' ? 'Saved Market' : debate.status}
          </span>

          <Button
            onClick={handleViewOrStart}
            variant="ghost"
            className="text-sm h-8 hover:bg-blue-500/10"
            style={{ color: "var(--color-primary)" }}
          >
            {isSavedMarket ? 'Start Debate' : 'View Debate'} →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
