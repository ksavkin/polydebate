'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DebateCard } from "./DebateCard";

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

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

interface Filters {
  category: string | null;
  status: string | null;
  sort: string;
}

interface DebateHistoryProps {
  debates: Debate[];
  pagination: Pagination;
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onPageChange: (offset: number) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  loading?: boolean;
}

export function DebateHistory({
  debates,
  pagination,
  filters,
  onFilterChange,
  onPageChange,
  onDelete,
  onView,
  loading = false
}: DebateHistoryProps) {
  const categories = ['All', 'Politics', 'Sports', 'Crypto', 'Tech', 'Culture', 'Economy'];

  const handleCategoryClick = (category: string) => {
    onFilterChange({
      ...filters,
      category: category === 'All' ? null : category
    });
  };

  const handleNextPage = () => {
    if (pagination.has_more) {
      onPageChange(pagination.offset + pagination.limit);
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      onPageChange(Math.max(0, pagination.offset - pagination.limit));
    }
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <Card className="bg-gradient-to-br from-[#1a1f2e] to-[#252b3b] border-gray-800">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white mb-4">
          Debate History
        </CardTitle>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                (category === 'All' && !filters.category) || filters.category === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-400">Sort by:</span>
          <select
            value={filters.sort}
            onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="recent">Most Recent</option>
            <option value="tokens">Most Tokens</option>
            <option value="rounds">Most Rounds</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading debates...</div>
        ) : debates.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No debates found
            {filters.category && ` in ${filters.category}`}
          </div>
        ) : (
          <>
            {/* Debate Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {debates.map((debate) => (
                <DebateCard
                  key={debate.debate_id}
                  debate={debate}
                  onDelete={onDelete}
                  onView={onView}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                <div className="text-sm text-gray-400">
                  Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} debates
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0}
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800 text-white disabled:opacity-50"
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-gray-400 px-3">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    onClick={handleNextPage}
                    disabled={!pagination.has_more}
                    variant="outline"
                    className="border-gray-700 hover:bg-gray-800 text-white disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
