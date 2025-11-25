'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface DebateCardProps {
  debate: Debate;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  showActions?: boolean;
}

export function DebateCard({ debate, onDelete, onView, showActions = true }: DebateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this debate?')) {
      setIsDeleting(true);
      onDelete(debate.debate_id);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a1f2e] to-[#252b3b] border-gray-800 hover:border-gray-700 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white flex-1 line-clamp-2">
            {debate.market_question}
          </h3>
          {showActions && (
            <div className="flex gap-2 ml-2">
              {debate.is_favorite && (
                <span className="text-red-500 text-lg">❤️</span>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                title="Delete debate"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {debate.market_category && (
          <span className="inline-block px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded mb-2">
            {debate.market_category}
          </span>
        )}

        <div className="text-sm text-gray-400 mb-3">
          {debate.rounds} rounds • {debate.models_count} models • {debate.total_tokens_used.toLocaleString()} tokens • {formatTimeAgo(debate.created_at)}
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded ${
            debate.status === 'completed' ? 'bg-green-500/20 text-green-400' :
            debate.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {debate.status}
          </span>

          <Button
            onClick={() => onView(debate.debate_id)}
            variant="ghost"
            className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 text-sm h-8"
          >
            View Debate →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
