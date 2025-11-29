'use client';

import { Card, CardContent } from "@/components/ui/card";

interface StatisticsCardsProps {
  statistics: {
    total_debates: number;
    total_favorites: number;
    favorite_models: Array<{ model_name: string; usage_count: number }>;
    favorite_categories: Array<{ category: string; count: number }>;
  };
  tokensRemaining: number;
}

export function StatisticsCards({ statistics, tokensRemaining }: StatisticsCardsProps) {
  const topModel = statistics.favorite_models[0]?.model_name || 'N/A';
  const topCategory = statistics.favorite_categories[0]?.category || 'N/A';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Debates"
        value={statistics.total_debates.toString()}
        gradient="from-blue-500/20 to-purple-500/20"
      />
      <StatCard
        title="Tokens Remaining"
        value={tokensRemaining.toLocaleString()}
        gradient="from-green-500/20 to-emerald-500/20"
      />
      <StatCard
        title="Favorite Model"
        value={topModel}
        small={topModel.length > 15}
        gradient="from-purple-500/20 to-pink-500/20"
      />
      <StatCard
        title="Top Category"
        value={topCategory}
        gradient="from-orange-500/20 to-red-500/20"
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  gradient: string;
  small?: boolean;
}

function StatCard({ title, value, gradient, small = false }: StatCardProps) {
  return (
    <Card
      className="transition-colors"
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <CardContent className="p-6">
        <h3 className="text-sm mb-2" style={{ color: "var(--foreground-secondary)" }}>{title}</h3>
        <p
          className={`${small ? 'text-2xl' : 'text-3xl'} font-bold truncate`}
          style={{ color: "var(--foreground)" }}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
