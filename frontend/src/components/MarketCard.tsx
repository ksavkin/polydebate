import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import BlurText from "@/components/BlurText";
import { useState, useMemo, useRef, useEffect } from "react";

interface Outcome {
  name: string;
  slug?: string;
  price: number;
  shares?: string;
}

interface MarketCardProps {
  id: string;
  question: string;
  description?: string;
  category: string;
  tag_id?: string;
  market_type?: 'binary' | 'categorical';
  outcomes: Outcome[];
  volume: string;
  volume_24h?: string;
  liquidity?: string;
  end_date?: string;
  created_date?: string;
  image_url?: string;
  resolution_source?: string;
  isLive?: boolean;
  period?: "daily" | "monthly";
  isNew?: boolean; // For animation when new cards appear
}

export function MarketCard({
  id,
  question,
  description,
  category,
  tag_id,
  market_type,
  outcomes,
  volume,
  volume_24h,
  liquidity,
  end_date,
  created_date,
  image_url,
  resolution_source,
  isLive = false,
  period = "daily",
  isNew = false,
}: MarketCardProps) {
  const [hoveredIcon, setHoveredIcon] = useState<'save' | 'share' | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Filter out outcomes with 0 shares and sort by price (highest to lowest)
  const sortedOutcomes = useMemo(() => {
    return [...outcomes]
      .filter((outcome) => {
        // Filter out outcomes with 0 shares, empty shares, or undefined shares
        if (!outcome.shares) return false;
        const sharesNum = parseFloat(outcome.shares);
        return !isNaN(sharesNum) && sharesNum > 0;
      })
      .sort((a, b) => b.price - a.price);
  }, [outcomes]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement save functionality
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={wrapperRef}
      className="relative group" 
      style={{ 
        overflow: "visible",
        zIndex: 1,
      }}
      onMouseEnter={(e) => {
        // Clear any pending timeout immediately
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        if (e.currentTarget) {
          e.currentTarget.style.zIndex = "10";
        }
        // Immediately set hovered state
        setIsCardHovered(true);
      }}
      onMouseLeave={(e) => {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        const wrapperElement = wrapperRef.current;
        const rt = e.relatedTarget as Node | null;

        // If relatedTarget is still inside this wrapper, ignore the event
        if (wrapperElement && rt && wrapperElement.contains(rt)) {
          return;
        }

        // We really left this card → hide it with a tiny delay
        hoverTimeoutRef.current = setTimeout(() => {
          setIsCardHovered(false);
          if (wrapperElement) {
            wrapperElement.style.zIndex = "1";
          }
          hoverTimeoutRef.current = null;
        }, 20);
      }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-150",
          "border rounded-lg flex flex-col",
          "h-full",
          isNew && "animate-in"
        )}
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--shadow-sm)",
          transform: "translateY(0)",
          willChange: "transform",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--card-bg-hover)";
          e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.15)";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--card-bg)";
          e.currentTarget.style.borderColor = "var(--card-border)";
          e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
        onClick={() => window.location.href = `/market/${id}`}
      >
      <CardHeader 
        className="overflow-hidden rounded-t-lg"
        style={{ 
          paddingBottom: "calc(var(--leading-base) * 0.5em)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Market Image as Icon (if available) */}
            {image_url && (
              <div 
                className="rounded overflow-hidden shrink-0 flex items-center justify-center relative"
                style={{ 
                  width: "48px",
                  height: "48px",
                  backgroundColor: "var(--color-soft-gray)",
                  border: "2px solid var(--card-border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <img
                  src={image_url}
                  alt={question}
                  className="w-full h-full object-cover"
                  style={{
                    backgroundColor: "var(--color-soft-gray)",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {/* Subtle overlay to ensure image blends well */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.02) 100%)",
                    borderRadius: "inherit",
                  }}
                />
              </div>
            )}
            <CardTitle 
              className="text-body font-bold flex-1"
              style={{ 
                color: "var(--foreground)",
                lineHeight: "var(--leading-base)",
                fontSize: "var(--text-base)", // 14px - smaller than h2
                fontWeight: "bold",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
              title={description || question}
            >
              {question}
            </CardTitle>
          </div>
          {isLive && (
            <span 
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-medium whitespace-nowrap border shrink-0"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "var(--color-red)",
                borderColor: "rgba(239, 68, 68, 0.2)",
                lineHeight: "var(--leading-base)",
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
        
        {/* Category and Market Type */}
        <div 
          className="flex items-center gap-2 flex-wrap"
          style={{ marginTop: "calc(var(--leading-tight) * 0.5em)" }}
        >
          <span 
            className="text-caption"
            style={{ 
              color: "var(--foreground-secondary)",
              lineHeight: "var(--leading-base)",
            }}
          >
            {category}
          </span>
          {market_type && (
            <>
              <span 
                className="text-caption"
                style={{ 
                  color: "var(--foreground-secondary)",
                  lineHeight: "var(--leading-base)",
                }}
              >
                •
              </span>
              <span 
                className="text-caption capitalize"
                style={{ 
                  color: "var(--foreground-secondary)",
                  lineHeight: "var(--leading-base)",
                }}
              >
                {market_type}
              </span>
            </>
          )}
        </div>
        
        {/* Time/Date/Duration Row - New row with smaller font */}
        {(end_date || created_date || period) && (
          <div 
            className="flex items-center gap-2 flex-wrap"
            style={{ 
              marginTop: "calc(var(--leading-base) * 0.25em)",
            }}
          >
            {end_date && (
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span 
                  className="text-caption tabular-nums"
                  style={{ 
                    color: "var(--foreground-secondary)",
                    lineHeight: "var(--leading-base)",
                    fontSize: "0.75rem", // 12px - smaller than caption
                  }}
                >
                  {new Date(end_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
            {period && (
              <>
                {(end_date || created_date) && (
                  <span 
                    className="text-caption"
                    style={{ 
                      color: "var(--foreground-secondary)",
                      lineHeight: "var(--leading-base)",
                    }}
                  >
                    •
                  </span>
                )}
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
                    style={{ 
                      color: "var(--foreground-secondary)",
                      lineHeight: "var(--leading-base)",
                      fontSize: "0.75rem", // 12px - smaller than caption
                    }}
                  >
                    {period}
                  </span>
                </div>
              </>
            )}
            {created_date && (
              <>
                {(end_date || period) && (
                  <span 
                    className="text-caption"
                    style={{ 
                      color: "var(--foreground-secondary)",
                      lineHeight: "var(--leading-base)",
                    }}
                  >
                    •
                  </span>
                )}
                <span 
                  className="text-caption"
                  style={{ 
                    color: "var(--foreground-secondary)",
                    lineHeight: "var(--leading-base)",
                    fontSize: "0.75rem", // 12px - smaller than caption
                  }}
                >
                  Created {new Date(created_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </span>
              </>
            )}
          </div>
        )}
        
        {/* Description (truncated, if available) */}
        {description && (
          <p 
            className="text-caption line-clamp-2"
            style={{ 
              color: "var(--foreground-secondary)",
              lineHeight: "var(--leading-base)",
              marginTop: "calc(var(--leading-base) * 0.25em)",
            }}
            title={description}
          >
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 flex-1 flex flex-col">
        {/* Outcomes - Show arc for 1-2 outcomes, or top 2 outcomes for 3+ */}
        {(outcomes.length === 1 || outcomes.length === 2) ? (
          // Circular arc indicator for 2-outcome markets
          <div className="flex flex-col items-center justify-center gap-2 py-4" style={{ minHeight: "140px" }}>
            {/* SVG Circular Arc */}
            <div className="relative" style={{ width: "100px", height: "100px", minHeight: "100px", flexShrink: 0 }}>
              <svg
                width="100"
                height="100"
                viewBox="0 0 100 100"
                style={{ width: "100%", height: "100%", display: "block", position: "relative" }}
              >
                {/* Background arc - gray (fixed 180-degree half circle on top) */}
                <path
                  id="gauge-arc"
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#d0d0d0"
                  strokeWidth="8"
                  strokeLinecap="round"
                  pathLength={100}
                />
                {/* Progress arc - fills proportionally using strokeDasharray */}
                {(() => {
                  // For Yes/No markets, show the "Yes" outcome percentage
                  // Use sortedOutcomes if available, otherwise fall back to original outcomes
                  const outcomesToUse = sortedOutcomes.length > 0 ? sortedOutcomes : outcomes;
                  if (outcomesToUse.length === 0) return null;
                  
                  const yesOutcome = outcomesToUse.find(o => o.name.toLowerCase() === "yes" || o.name.toLowerCase() === "up") || outcomesToUse[0];
                  if (!yesOutcome) return null;
                  const percentage = Math.max(0, Math.min(1, yesOutcome.price)); // clamp 0..1
                  
                  // Don't render if percentage is 0
                  if (percentage <= 0) return null;
                  
                  // Red for low percentage (< 50%), green for high (>= 50%)
                  const arcColor = percentage < 0.5 ? "#ef4444" : "#27ae60";
                  
                  return (
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke={arcColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={100 - percentage * 100}
                      className="transition-all duration-300"
                    />
                  );
                })()}
              </svg>
              {/* Percentage display in center of circle */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ lineHeight: "var(--leading-base)" }}
              >
                {(() => {
                  // Use sortedOutcomes if available, otherwise fall back to original outcomes
                  const outcomesToUse = sortedOutcomes.length > 0 ? sortedOutcomes : outcomes;
                  const yesOutcome = outcomesToUse.find(o => o.name.toLowerCase() === "yes" || o.name.toLowerCase() === "up") || outcomesToUse[0];
                  if (!yesOutcome) return null;
                  const percentage = Math.round(yesOutcome.price * 100);
                  const isYes = yesOutcome.name.toLowerCase() === "yes" || yesOutcome.name.toLowerCase() === "up";
                  
                  return (
                    <>
                      <div 
                        className="text-h2 font-bold tabular-nums"
                        style={{ 
                          color: "var(--foreground)",
                          lineHeight: "var(--leading-tight)",
                        }}
                      >
                        {percentage}%
                      </div>
                      <div 
                        className="text-caption font-medium"
                        style={{ 
                          color: "var(--foreground-secondary)",
                          lineHeight: "var(--leading-base)",
                          fontSize: "0.75rem",
                        }}
                      >
                        chance
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            {/* Outcomes list with shares */}
            <div style={{ gap: "calc(var(--leading-base) * 0.5em)" }} className="flex flex-col w-full">
              {(sortedOutcomes.length > 0 ? sortedOutcomes : outcomes).map((outcome, idx) => {
                const percentage = Math.round(outcome.price * 100);
                const isYes = outcome.name.toLowerCase() === "yes" || outcome.name.toLowerCase() === "up";
                const isNo = outcome.name.toLowerCase() === "no" || outcome.name.toLowerCase() === "down";
                
                return (
                  <div 
                    key={outcome.name}
                    style={{ 
                      lineHeight: "var(--leading-base)",
                      marginBottom: idx < (sortedOutcomes.length > 0 ? sortedOutcomes : outcomes).length - 1 ? "calc(var(--leading-base) * 0.5em)" : "0",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span 
                          className="text-body font-medium block truncate"
                          style={{ 
                            color: "var(--foreground)",
                            lineHeight: "var(--leading-base)",
                          }}
                          title={outcome.name}
                        >
                          {outcome.name}
                        </span>
                        {outcome.shares && (
                          <span 
                            className="text-caption tabular-nums"
                            style={{ 
                              color: "var(--foreground-secondary)",
                              lineHeight: "var(--leading-base)",
                            }}
                          >
                            {parseFloat(outcome.shares).toLocaleString()} shares
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span 
                          className="text-body font-semibold tabular-nums"
                          style={{ 
                            color: "var(--foreground)",
                            lineHeight: "var(--leading-base)",
                          }}
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
            </div>
          </div>
        ) : (
          // Regular progress bars for 3+ outcomes (show top 2)
          <div style={{ gap: "calc(var(--leading-base) * 0.5em)" }} className="flex flex-col">
            {sortedOutcomes.slice(0, 2).map((outcome, idx) => {
              const percentage = Math.round(outcome.price * 100);
              const isYes = outcome.name.toLowerCase() === "yes" || idx === 0;
              
              return (
                <div 
                  key={outcome.name} 
                  style={{ 
                    lineHeight: "var(--leading-base)",
                    marginBottom: idx < Math.min(sortedOutcomes.length, 2) - 1 ? "calc(var(--leading-base) * 0.5em)" : "0",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span 
                        className="text-body font-medium block truncate"
                        style={{ 
                          color: "var(--foreground)",
                          lineHeight: "var(--leading-base)",
                        }}
                        title={outcome.name}
                      >
                        {outcome.name}
                      </span>
                      {outcome.shares && (
                        <span 
                          className="text-caption tabular-nums"
                          style={{ 
                            color: "var(--foreground-secondary)",
                            lineHeight: "var(--leading-base)",
                          }}
                        >
                          {parseFloat(outcome.shares).toLocaleString()} shares
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span 
                        className="text-body font-semibold tabular-nums"
                        style={{ 
                          color: "var(--foreground)",
                          lineHeight: "var(--leading-base)",
                        }}
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
            {sortedOutcomes.length > 2 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/market/${id}`;
                }}
                className="text-caption text-left hover:underline transition-all duration-150"
                style={{ 
                  color: "var(--color-primary)",
                  lineHeight: "var(--leading-base)",
                  paddingTop: "calc(var(--leading-base) * 0.25em)",
                }}
              >
                    +{sortedOutcomes.length - 2} more
              </button>
            )}
          </div>
        )}

        {/* Volume, Liquidity, Resolution Source, and Action Icons - Single Row */}
        <div 
          className="flex items-center justify-between gap-2 border-t mt-auto flex-wrap"
          style={{ 
            borderColor: "var(--card-border)",
            paddingTop: "calc(var(--leading-base) * 0.5em)",
          }}
        >
          {/* Left side: Volume, Liquidity, Resolution Source */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <span 
                className="text-caption"
                style={{ 
                  color: "var(--foreground-secondary)",
                  lineHeight: "var(--leading-base)",
                }}
              >
                Volume
              </span>
              <span 
                className="text-caption tabular-nums"
                style={{ 
                  color: "var(--foreground-secondary)",
                  lineHeight: "var(--leading-base)",
                }}
              >
                ${volume}
              </span>
              {volume_24h && (
                <>
                  <span 
                    className="text-caption"
                    style={{ 
                      color: "var(--foreground-secondary)",
                      lineHeight: "var(--leading-base)",
                    }}
                  >
                    •
                  </span>
                  <span 
                    className="text-caption tabular-nums"
                    style={{ 
                      color: "var(--foreground-secondary)",
                      lineHeight: "var(--leading-base)",
                    }}
                    title="24h Volume"
                  >
                    ${volume_24h} 24h
                  </span>
                </>
              )}
            </div>
            {liquidity && (
              <>
                <span 
                  className="text-caption"
                  style={{ 
                    color: "var(--foreground-secondary)",
                    lineHeight: "var(--leading-base)",
                  }}
                >
                  •
                </span>
                <span 
                  className="text-caption tabular-nums"
                  style={{ 
                    color: "var(--foreground-secondary)",
                    lineHeight: "var(--leading-base)",
                  }}
                  title="Liquidity"
                >
                  ${liquidity} Liq.
                </span>
              </>
            )}
            {resolution_source && (
              <>
                <span 
                  className="text-caption"
                  style={{ 
                    color: "var(--foreground-secondary)",
                    lineHeight: "var(--leading-base)",
                  }}
                >
                  •
                </span>
                <span 
                  className="text-caption"
                  style={{ 
                    color: "var(--foreground-secondary)",
                    lineHeight: "var(--leading-base)",
                  }}
                  title={`Resolves via: ${resolution_source}`}
                >
                  {resolution_source}
                </span>
              </>
            )}
          </div>
          
          {/* Right side: Save and Share Icons */}
          <div 
            className="flex items-center gap-2"
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => {
              e.stopPropagation();
              setHoveredIcon(null);
            }}
          >
            <button
              onClick={handleSave}
              className="p-1.5 rounded transition-all duration-150"
              style={{ 
                color: "var(--foreground-secondary)",
                backgroundColor: hoveredIcon === 'save' ? "var(--color-soft-gray)" : "transparent",
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setHoveredIcon('save');
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                setHoveredIcon(null);
              }}
              aria-label="Save market"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ pointerEvents: "none" }}
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
              className="p-1.5 rounded transition-all duration-150"
              style={{ 
                color: "var(--foreground-secondary)",
                backgroundColor: hoveredIcon === 'share' ? "var(--color-soft-gray)" : "transparent",
              }}
              onMouseEnter={(e) => {
                e.stopPropagation();
                setHoveredIcon('share');
              }}
              onMouseLeave={(e) => {
                e.stopPropagation();
                setHoveredIcon(null);
              }}
              aria-label="Share market"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ pointerEvents: "none" }}
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
      </CardContent>
    </Card>
    
    {/* Start AI Debate Button - slides out from bottom on hover */}
    <button
      data-role="start-ai-debate"
      onClick={(e) => {
        e.stopPropagation();
        // TODO: Navigate to debate page
        window.location.href = `/market/${id}/debate`;
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        // Clear any pending timeout to keep button visible
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsCardHovered(true);
        e.currentTarget.style.backgroundColor = "var(--nav-bg)";
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        e.currentTarget.style.backgroundColor = "var(--color-charcoal)";

        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }

        const wrapperElement = wrapperRef.current;
        const rt = e.relatedTarget as Node | null;

        // If we moved back to the wrapper/card, keep it hovered
        if (wrapperElement && rt && wrapperElement.contains(rt)) {
          return;
        }

        // Otherwise we left both button and card → hide
        hoverTimeoutRef.current = setTimeout(() => {
          setIsCardHovered(false);
          if (wrapperElement) {
            wrapperElement.style.zIndex = "1";
          }
          hoverTimeoutRef.current = null;
        }, 30);
      }}
      className="absolute left-0 right-0 transition-all duration-300 ease-out"
      style={{
        bottom: isCardHovered ? "8px" : "-48px",
        opacity: isCardHovered ? 1 : 0,
        backgroundColor: "var(--color-charcoal)",
        color: "var(--color-white)",
        padding: "10px 6px",
        borderRadius: "1.5rem",
        fontSize: "var(--text-base)",
        fontWeight: 500,
        lineHeight: "var(--leading-base)",
        boxShadow: "var(--shadow-md)",
        pointerEvents: isCardHovered ? "auto" : "none",
        zIndex: 20,
      }}
    >
      Start AI Debate
    </button>
    </div>
  );
}

