'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DebateCard } from "./DebateCard";
import { useState } from "react";
import { UserDebate } from "@/lib/api";

interface TopDebatesProps {
  debates: UserDebate[];
  type: 'recent' | 'favorites';
  onTypeChange: (type: 'recent' | 'favorites') => void;
  onDelete: (debateId: string) => void;
  onView: (debateId: string) => void;
  onToggleFavorite: (marketId: string, debateId: string, isFavorite: boolean) => void;
  loading: boolean;
}

export function TopDebates({
  debates,
  type,
  onTypeChange,
  onDelete,
  onView,
  onToggleFavorite,
  loading = false
}: TopDebatesProps) {
  return (
    <Card
      className="mb-6"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <CardHeader>
        <div
          className="flex items-center gap-4 border-b pb-3"
          style={{ borderColor: "var(--card-border)" }}
        >
          <button
            onClick={() => onTypeChange('recent')}
            className={`pb-3 px-4 font-semibold transition-colors -mb-3 border-b-2`}
            style={{
              color: type === 'recent' ? "var(--color-primary)" : "var(--foreground-secondary)",
              borderColor: type === 'recent' ? "var(--color-primary)" : "transparent",
            }}
          >
            Recent
          </button>
          <button
            onClick={() => onTypeChange('favorites')}
            className={`pb-3 px-4 font-semibold transition-colors -mb-3 border-b-2`}
            style={{
              color: type === 'favorites' ? "var(--color-primary)" : "var(--foreground-secondary)",
              borderColor: type === 'favorites' ? "var(--color-primary)" : "transparent",
            }}
          >
            Favorites
          </button>
        </div>
      </CardHeader>

      <CardContent className="min-h-[300px] relative">
        {loading && debates.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--foreground-secondary)" }}>Loading...</div>
        ) : (
          <div className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {debates.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--foreground-secondary)" }}>
                {type === 'recent' ? 'No recent debates' : 'No favorite debates'}
              </div>
            ) : (
              <div className="space-y-3">
                {debates.map((debate) => (
                  <DebateCard
                    key={debate.debate_id}
                    debate={debate}
                    onDelete={onDelete}
                    onView={onView}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {loading && debates.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-black/10 backdrop-blur-[1px] absolute inset-0 rounded-xl" />
            <div className="relative bg-white/80 dark:bg-black/80 px-4 py-2 rounded-full shadow-lg text-sm font-medium">
              Updating...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
