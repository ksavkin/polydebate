import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Outcome {
  name: string;
  price: number;
}

interface MarketCardProps {
  id: string;
  question: string;
  category: string;
  outcomes: Outcome[];
  volume: string;
  isLive?: boolean;
  period?: "daily" | "monthly";
  isNew?: boolean; // For animation when new cards appear
}

export function MarketCard({
  id,
  question,
  category,
  outcomes,
  volume,
  isLive = false,
  period = "daily",
  isNew = false,
}: MarketCardProps) {
  const handleStartDebate = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/market/${id}`;
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement save functionality
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-150",
        "border rounded-lg flex flex-col",
        "hover:-translate-y-0.5",
        "h-full",
        isNew && "animate-in"
      )}
      style={{
        backgroundColor: "var(--card-bg)",
        borderColor: "var(--card-border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--card-bg-hover)";
        e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.2)";
        e.currentTarget.style.boxShadow = "var(--shadow-md), var(--shadow-inset-light)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--card-bg)";
        e.currentTarget.style.borderColor = "var(--card-border)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
      onClick={() => window.location.href = `/market/${id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle 
            className="text-lg font-semibold leading-tight line-clamp-2"
            style={{ color: "var(--foreground)" }}
          >
            {question}
          </CardTitle>
          {isLive && (
            <span 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-medium whitespace-nowrap border shrink-0"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "var(--color-red)",
                borderColor: "rgba(239, 68, 68, 0.2)",
              }}
            >
              <span 
                className="size-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "var(--color-red)" }}
              />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span 
            className="text-caption"
            style={{ color: "var(--foreground-secondary)" }}
          >
            {category}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 flex flex-col">
        {/* Outcomes - Show up to 4 outcomes */}
        {outcomes.length === 2 ? (
          // Half-circle indicator for 2-outcome markets
          <div className="flex flex-col items-center gap-2 py-1">
            {/* SVG Half-circle */}
            <div className="relative" style={{ width: "120px", height: "60px" }}>
              <svg
                width="120"
                height="60"
                viewBox="0 0 140 70"
                className="absolute inset-0"
                style={{ width: "100%", height: "100%" }}
              >
                {/* Background arc (full half-circle) - gray */}
                <path
                  d="M 20 60 A 50 50 0 0 1 120 60"
                  fill="none"
                  stroke="var(--color-soft-gray)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Progress arc - shows first outcome percentage */}
                {(() => {
                  const percentage = Math.max(0, Math.min(1, outcomes[0].price)); // clamp 0..1
                  
                  const arcColor = percentage < 0.5 ? "var(--color-red)" : "var(--color-green)";
                  
                  const radius = 50;
                  const centerX = 70; // matches background arc
                  const centerY = 60; // matches background arc
                  
                  // Gauge is a half-circle from left (180°) to right (0°)
                  const startAngleDeg = 180;
                  const endAngleDeg = 180 - percentage * 180;
                  
                  const startRad = (startAngleDeg * Math.PI) / 180;
                  const endRad = (endAngleDeg * Math.PI) / 180;
                  
                  const startX = centerX + radius * Math.cos(startRad);
                  const startY = centerY - radius * Math.sin(startRad); // NOTE: minus for top half
                  const endX = centerX + radius * Math.cos(endRad);
                  const endY = centerY - radius * Math.sin(endRad); // NOTE: minus for top half
                  
                  const largeArcFlag = 0; // always small arc (≤ 180°)
                  const sweepFlag = 1; // same direction as gray arc
                  
                  if (percentage <= 0) return null;
                  
                  return (
                    <path
                      key="progress-arc"
                      d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`}
                      fill="none"
                      stroke={arcColor}
                      strokeWidth="10"
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  );
                })()}
              </svg>
            </div>
            {/* Percentage display below the half-circle */}
            <div className="text-center">
              <div 
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {Math.round(outcomes[0].price * 100)}%
              </div>
              <div 
                className="text-caption"
                style={{ color: "var(--foreground-secondary)" }}
              >
                chance
              </div>
            </div>
            {/* Yes/No indicators (non-clickable) */}
            <div className="flex gap-1.5 w-full">
              <div 
                className="flex-1 flex items-center justify-center px-2 py-1 rounded border cursor-default" 
                style={{ 
                  borderColor: "var(--color-green)", 
                  backgroundColor: "rgba(39, 174, 96, 0.05)" 
                }}
              >
                <span 
                  className="text-caption font-semibold"
                  style={{ color: "var(--color-green)" }}
                >
                  Yes
                </span>
              </div>
              <div 
                className="flex-1 flex items-center justify-center px-2 py-1 rounded border cursor-default" 
                style={{ 
                  borderColor: "var(--color-red)", 
                  backgroundColor: "rgba(239, 68, 68, 0.05)" 
                }}
              >
                <span 
                  className="text-caption font-semibold"
                  style={{ color: "var(--color-red)" }}
                >
                  No
                </span>
              </div>
            </div>
          </div>
        ) : (
          // Regular progress bars for 3+ outcomes
          <div className="space-y-2">
            {outcomes.slice(0, 4).map((outcome, idx) => {
              const percentage = Math.round(outcome.price * 100);
              const isYes = outcome.name.toLowerCase() === "yes" || idx === 0;
              
              return (
                <div key={outcome.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className="text-body font-medium flex-1"
                      style={{ color: "var(--foreground)" }}
                    >
                      {outcome.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="text-base font-semibold tabular-nums"
                        style={{ color: "var(--foreground)" }}
                      >
                        {percentage}%
                      </span>
                      <div className="flex gap-1">
                        <div 
                          className="h-6 px-2 flex items-center justify-center rounded border cursor-default"
                          style={{
                            backgroundColor: "rgba(39, 174, 96, 0.05)",
                            borderColor: "var(--color-green)",
                          }}
                        >
                          <span 
                            className="text-caption font-semibold"
                            style={{ color: "var(--color-green)" }}
                          >
                            Yes
                          </span>
                        </div>
                        <div 
                          className="h-6 px-2 flex items-center justify-center rounded border cursor-default"
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.05)",
                            borderColor: "var(--color-red)",
                          }}
                        >
                          <span 
                            className="text-caption font-semibold"
                            style={{ color: "var(--color-red)" }}
                          >
                            No
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="relative h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-soft-gray)" }}
                  >
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isYes ? "var(--color-green)" : "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {outcomes.length > 4 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/market/${id}`;
                }}
                className="text-caption pt-1 text-left hover:underline transition-all duration-150"
                style={{ color: "var(--color-primary)" }}
              >
                +{outcomes.length - 4} more
              </button>
            )}
          </div>
        )}

        {/* Volume, Period, and Action Icons */}
        <div 
          className="flex items-center justify-between pt-2 border-t mt-auto"
          style={{ borderColor: "var(--card-border)" }}
        >
          <div className="flex items-center gap-2">
            <span 
              className="text-caption tabular-nums"
              style={{ color: "var(--foreground-secondary)" }}
            >
              ${volume} Vol.
            </span>
            {/* Period indicator with icon */}
            <div className="flex items-center gap-1">
              <svg
                className="size-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--foreground-secondary)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span 
                className="text-caption capitalize"
                style={{ color: "var(--foreground-secondary)" }}
              >
                {period}
              </span>
            </div>
          </div>
          
          {/* Save and Share Icons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              className="p-1.5 rounded transition-colors duration-150 hover:bg-black/5"
              style={{ color: "var(--foreground-secondary)" }}
              aria-label="Save market"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            <button
              onClick={handleShare}
              className="p-1.5 rounded transition-colors duration-150 hover:bg-black/5"
              style={{ color: "var(--foreground-secondary)" }}
              aria-label="Share market"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Start AI Debate Button - Appears on hover, minimal and aesthetic */}
        <div className="mt-2 overflow-hidden">
          <Button
            className={cn(
              "w-full h-9 text-body font-medium text-white transition-all duration-300 ease-out",
              "group-hover:opacity-100 group-hover:translate-y-0",
              "opacity-0 translate-y-2",
              "cursor-pointer"
            )}
            style={{
              backgroundColor: "var(--nav-bg)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3a3a3a"; // Lighter shade of black
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--nav-bg)";
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              handleStartDebate(e);
            }}
          >
            Start AI Debate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

