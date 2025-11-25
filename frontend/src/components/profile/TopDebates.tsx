'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DebateCard } from "./DebateCard";
import { useState } from "react";

interface Debate {
  debate_id: string;
  market_question: string;
  market_category: string | null;
  status: string;
  rounds: number;
  models_count: number;
  total_tokens_used: number;
  created_at: string;
  completed_at: string | null;
  is_favorite: boolean;
}

interface TopDebatesProps {
  debates: Debate[];
  type: 'recent' | 'favorites';
  onTypeChange: (type: 'recent' | 'favorites') => void;
  onDelete: (debateId: string) => void;
  onView: (debateId: string) => void;
  loading?: boolean;
}

export function TopDebates({
  debates,
  type,
  onTypeChange,
  onDelete,
  onView,
  loading = false
}: TopDebatesProps) {
  return (
    <Card className="bg-gradient-to-br from-[#1a1f2e] to-[#252b3b] border-gray-800 mb-6">
      <CardHeader>
        <div className="flex items-center gap-4 border-b border-gray-800 pb-3">
          <button
            onClick={() => onTypeChange('recent')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              type === 'recent'
                ? 'text-blue-500 border-b-2 border-blue-500 -mb-3'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => onTypeChange('favorites')}
            className={`pb-3 px-4 font-semibold transition-colors ${
              type === 'favorites'
                ? 'text-blue-500 border-b-2 border-blue-500 -mb-3'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Favorites
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : debates.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
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
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
