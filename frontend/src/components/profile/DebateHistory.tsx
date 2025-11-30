'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DebateCard } from "./DebateCard";
import { UserDebate } from "@/lib/api";

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
  debates: UserDebate[];
  pagination: Pagination;
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onPageChange: (offset: number) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
  onToggleFavorite: (marketId: string, debateId: string, isFavorite: boolean) => void;
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
  onToggleFavorite,
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
    <Card
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-4" style={{ color: "var(--foreground)" }}>
          Debate History
        </CardTitle>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
              style={{
                backgroundColor: (category === 'All' && !filters.category) || filters.category === category
                  ? "var(--color-primary)"
                  : "var(--card-bg-hover)",
                color: (category === 'All' && !filters.category) || filters.category === category
                  ? "#ffffff"
                  : "var(--foreground-secondary)",
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 items-center">
          <span className="text-sm" style={{ color: "var(--foreground-secondary)" }}>Sort by:</span>
          <select
            value={filters.sort}
            onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
            className="rounded-lg px-3 py-1.5 text-sm focus:outline-none border"
            style={{
              backgroundColor: "var(--card-bg-hover)",
              borderColor: "var(--card-border)",
              color: "var(--foreground)",
            }}
          >
            <option value="recent">Most Recent</option>
            <option value="tokens">Most Tokens</option>
            <option value="rounds">Most Rounds</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="min-h-[600px] relative">
        {loading && debates.length === 0 ? (
          <div className="text-center py-8" style={{ color: "var(--foreground-secondary)" }}>Loading debates...</div>
        ) : (
          <div className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {debates.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--foreground-secondary)" }}>
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
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div
                    className="flex items-center justify-between border-t pt-4"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    <div className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                      Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} debates
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handlePrevPage}
                        disabled={pagination.offset === 0}
                        variant="outline"
                        className="disabled:opacity-50"
                        style={{
                          backgroundColor: "transparent",
                          borderColor: "var(--card-border)",
                          color: "var(--foreground)",
                        }}
                      >
                        Previous
                      </Button>

                      <span className="text-sm px-3" style={{ color: "var(--foreground-secondary)" }}>
                        Page {currentPage} of {totalPages}
                      </span>

                      <Button
                        onClick={handleNextPage}
                        disabled={!pagination.has_more}
                        variant="outline"
                        className="disabled:opacity-50"
                        style={{
                          backgroundColor: "transparent",
                          borderColor: "var(--card-border)",
                          color: "var(--foreground)",
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
