"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient, type Model, type DebateMessage, type DebateResults } from "@/lib/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DebateChat } from "@/components/DebateChat";
import Link from "next/link";

export default function DebateViewPage() {
  const params = useParams();
  const debateId = params.id as string;

  const [debate, setDebate] = useState<any | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [debateResults, setDebateResults] = useState<DebateResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch debate details
  useEffect(() => {
    const fetchDebate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch debate data
        const debateData = await apiClient.getDebate(debateId);
        console.log('Debate data:', debateData);
        setDebate(debateData);

        // Fetch available models to get full model info
        const modelsData = await apiClient.getModels();
        setModels(modelsData.models);

        // If debate is completed, fetch results
        if (debateData.status === 'completed') {
          try {
            const results = await apiClient.getDebateResults(debateId);
            setDebateResults(results);
          } catch (err) {
            console.warn('Could not fetch debate results:', err);
            // Don't treat this as a fatal error
          }
        }
      } catch (err) {
        console.error('Error fetching debate:', err);
        setError(err instanceof Error ? err.message : 'Failed to load debate');
      } finally {
        setIsLoading(false);
      }
    };

    if (debateId) {
      fetchDebate();
    }
  }, [debateId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LoadingSpinner size="lg" />
        <p style={{ color: "var(--foreground-secondary)" }}>Loading debate...</p>
      </div>
    );
  }

  if (error || !debate) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--color-red)" }}>Error</h1>
          <p className="mb-6" style={{ color: "var(--foreground-secondary)" }}>
            {error || 'Debate not found'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 rounded"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-white)" }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Extract market info - handle both nested and flat structures
  const marketQuestion = debate.market?.question || debate.market_question || 'Unknown Market';
  const marketId = debate.market?.id || debate.market_id;

  // Convert debate data to messages format
  const messages: DebateMessage[] = debate.messages || [];

  const isCompleted = debate.status === 'completed';
  const currentRound = debate.current_round || debate.rounds;

  return (
    <div className="container mx-auto px-4 py-8" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-block mb-4 text-sm"
            style={{ color: "var(--color-primary)" }}
          >
            ← Back to Profile
          </Link>
          <h1 className="text-h1 font-bold mb-2">{marketQuestion}</h1>
          <div className="flex items-center gap-4 text-sm" style={{ color: "var(--foreground-secondary)" }}>
            <span>Status: <strong style={{ color: isCompleted ? "var(--color-green)" : "var(--color-primary)" }}>
              {debate.status}
            </strong></span>
            <span>•</span>
            <span>{debate.rounds} rounds</span>
            <span>•</span>
            <span>{(debate.models || debate.selected_models || []).length} models</span>
          </div>
        </div>

        {/* Chat History */}
        <DebateChat
          key={`debate-${debateId}`}
          messages={messages}
          rounds={debate.rounds}
          currentRound={currentRound}
          models={models.filter((m) => {
            const debateModels = debate.models || debate.selected_models || [];
            return debateModels.some((dm: any) => dm && dm.model_id === m.id);
          })}
          isCompleted={isCompleted}
          debateCompleteEventReceived={isCompleted}
        />

        {/* Results Section - Only show when completed */}
        {isCompleted && debateResults && (
          <>
            {/* Results Section */}
            <div
              className="rounded-lg"
              style={{
                backgroundColor: "var(--card-bg)",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
                <h2
                  className="text-base font-semibold"
                  style={{
                    color: "var(--foreground)",
                    lineHeight: "1.5",
                  }}
                >
                  Debate Results
                </h2>
              </div>

              {/* Content */}
              <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {/* Summary Section */}
                <div className="px-6 py-5">
                  <h3
                    className="text-base font-semibold mb-4"
                    style={{
                      color: "var(--foreground)",
                      lineHeight: "1.5",
                    }}
                  >
                    Summary
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-5"
                    style={{
                      color: "var(--foreground-secondary)",
                      lineHeight: "1.7",
                      fontSize: "14px",
                    }}
                  >
                    {debateResults.summary.overall || "No summary available."}
                  </p>
                  {debateResults.summary.consensus && (
                    <div className="pt-5 border-t" style={{ borderColor: "var(--card-border)" }}>
                      <h4
                        className="text-sm font-semibold mb-3"
                        style={{
                          color: "var(--foreground)",
                          lineHeight: "1.5",
                        }}
                      >
                        Consensus
                      </h4>
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: "var(--foreground-secondary)",
                          lineHeight: "1.7",
                          fontSize: "14px",
                        }}
                      >
                        {debateResults.summary.consensus}
                      </p>
                    </div>
                  )}
                </div>

                {/* Final Predictions Section */}
                {Object.keys(debateResults.final_predictions).length > 0 && (
                  <div className="px-6 py-4">
                    <h3
                      className="text-base font-semibold mb-5"
                      style={{
                        color: "var(--foreground)",
                        lineHeight: "1.5",
                      }}
                    >
                      Final Predictions
                    </h3>
                    <div className="space-y-5">
                      {Object.entries(debateResults.final_predictions).map(([modelName, data]) => {
                        let changeColor = "var(--foreground-secondary)";
                        let changeText = data.change || "";

                        if (data.change) {
                          const changeMatch = data.change.match(/^([+-]?\d+\.?\d*)%/);
                          if (changeMatch) {
                            const changeValue = parseFloat(changeMatch[1]);
                            if (changeValue > 0) {
                              changeColor = "#27ae60";
                            } else if (changeValue < 0) {
                              changeColor = "#e74c3c";
                            }
                          }
                        }

                        return (
                          <div
                            key={modelName}
                            className="pb-5 last:pb-0 border-b last:border-b-0"
                            style={{ borderColor: "var(--card-border)" }}
                          >
                            <div
                              className="text-sm font-semibold mb-3"
                              style={{
                                color: "var(--foreground)",
                                lineHeight: "1.5",
                              }}
                            >
                              {modelName}
                            </div>
                            <div className="flex gap-x-8 gap-y-2.5 flex-wrap text-sm mb-3">
                              {Object.entries(data.predictions).map(([outcome, percentage]) => (
                                <div
                                  key={outcome}
                                  className="inline-flex items-baseline gap-2"
                                >
                                  <span
                                    style={{
                                      color: "var(--foreground-secondary)",
                                      fontSize: "13px",
                                    }}
                                  >
                                    {outcome}:
                                  </span>
                                  <span
                                    className="font-semibold tabular-nums"
                                    style={{
                                      color: "var(--foreground)",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {percentage}%
                                  </span>
                                </div>
                              ))}
                            </div>
                            {data.change && (
                              <div
                                className="text-sm font-medium tabular-nums"
                                style={{
                                  color: changeColor,
                                  lineHeight: "1.5",
                                }}
                              >
                                {changeText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Model Rationales Section */}
                {debateResults.summary.model_rationales && debateResults.summary.model_rationales.length > 0 && (
                  <div className="px-6 py-5">
                    <h3
                      className="text-base font-semibold mb-5"
                      style={{
                        color: "var(--foreground)",
                        lineHeight: "1.5",
                      }}
                    >
                      Model Rationales
                    </h3>
                    <div className="space-y-6">
                      {debateResults.summary.model_rationales.map((rationale, idx) => (
                        <div
                          key={idx}
                          className="pb-6 last:pb-0 border-b last:border-b-0"
                          style={{ borderColor: "var(--card-border)" }}
                        >
                          <div
                            className="text-sm font-semibold mb-3"
                            style={{
                              color: "var(--foreground)",
                              lineHeight: "1.5",
                            }}
                          >
                            {rationale.model}
                          </div>
                          <p
                            className="text-sm leading-relaxed mb-4"
                            style={{
                              color: "var(--foreground-secondary)",
                              lineHeight: "1.7",
                              fontSize: "14px",
                            }}
                          >
                            {rationale.rationale}
                          </p>
                          {rationale.key_arguments && rationale.key_arguments.length > 0 && (
                            <div className="text-sm">
                              <div
                                className="font-semibold mb-2.5"
                                style={{
                                  color: "var(--foreground)",
                                  lineHeight: "1.5",
                                }}
                              >
                                Key Arguments
                              </div>
                              <ul
                                className="list-disc list-inside space-y-1.5"
                                style={{
                                  color: "var(--foreground-secondary)",
                                  lineHeight: "1.7",
                                  fontSize: "14px",
                                }}
                              >
                                {rationale.key_arguments.map((arg, argIdx) => (
                                  <li key={argIdx}>{arg}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center items-center gap-4 mt-6">
              <Link
                href="/profile"
                className="px-4 py-2 rounded font-medium text-sm inline-flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: "var(--color-charcoal)",
                  color: "var(--color-white)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Profile
              </Link>
              <Link
                href={`/market/${marketId}/debate`}
                className="px-4 py-2 rounded font-medium text-sm inline-flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "var(--color-white)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-primary)";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                Start New Debate
              </Link>
            </div>
          </>
        )}

        {/* If not completed, show status */}
        {!isCompleted && (
          <div className="text-center py-8">
            <p style={{ color: "var(--foreground-secondary)" }}>
              This debate is {debate.status}.
              {debate.status === 'in_progress' && ' Please wait for it to complete to see results.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
