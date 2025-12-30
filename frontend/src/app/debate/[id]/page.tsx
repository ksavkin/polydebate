"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient, type Model, type DebateMessage, type DebateResults } from "@/lib/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DebateChat } from "@/components/DebateChat";
import ExecutiveReport from "@/components/ExecutiveReport";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DebateViewPage() {
  const params = useParams();
  const debateId = params.id as string;

  const [debate, setDebate] = useState<any | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [debateResults, setDebateResults] = useState<DebateResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const debateData = await apiClient.getDebate(debateId);
        setDebate(debateData);

        const modelsData = await apiClient.getModels();
        setModels(modelsData.models);

        if (debateData.status === 'completed') {
          try {
            const results = await apiClient.getDebateResults(debateId);
            setDebateResults(results);
          } catch (err) {
            console.warn('Could not fetch debate results:', err);
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-bold text-[hsl(var(--text-secondary))] uppercase tracking-[0.2em] animate-pulse">
          Retrieving Market Intelligence
        </p>
      </div>
    );
  }

  if (error || !debate) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto card-l1 p-12 text-center">
          <h1 className="text-2xl font-bold mb-4 text-[hsl(var(--brand-red))]">Intel Access Error</h1>
          <p className="mb-8 text-[hsl(var(--text-secondary))] leading-relaxed">
            {error || 'The requested debate could not be retrieved from the intelligence archive.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-8 py-3 bg-[hsl(var(--brand-blue))] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all"
          >
            Return to Core Terminal
          </Link>
        </div>
      </div>
    );
  }

  const marketQuestion = debate.market?.question || debate.market_question || 'Unknown Market';
  const marketId = debate.market?.id || debate.market_id;
  const messages: DebateMessage[] = debate.messages || [];
  const isCompleted = debate.status === 'completed';
  const currentRound = debate.current_round || debate.rounds;

  return (
    <div className="container mx-auto px-6 py-10 max-w-7xl">
      <div className="space-y-10">
        {/* Header Section */}
        <div className="flex flex-col gap-6">
          <Link
            href="/profile"
            className="group flex items-center gap-2 text-xs font-bold text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--brand-blue))] transition-colors w-fit"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            BACK TO DEBATE ARCHIVE
          </Link>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--text-principal))] leading-[1.1]">
              {marketQuestion}
            </h1>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[hsla(var(--border-subtle))] shadow-sm">
                <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-[hsl(var(--brand-blue))]' : 'bg-[hsl(var(--brand-green))] animate-pulse'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {debate.status.replace('_', ' ')}
                </span>
              </div>
              <span className="text-[11px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-widest">•</span>
              <span className="text-[11px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-widest">
                {debate.rounds} ROUNDS
              </span>
              <span className="text-[11px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-widest">•</span>
              <span className="text-[11px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-widest">
                {(debate.models || debate.selected_models || []).length} AI MODELS
              </span>
            </div>
          </div>
        </div>

        {/* Live Execution Grid */}
        <div className="grid grid-cols-1 gap-10">
          <div className="card-l1 overflow-hidden">
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
          </div>

          {/* Results Summary Section */}
          {isCompleted && debateResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 pt-4"
            >
              {/* Report Title */}
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-[hsla(var(--border-subtle))]" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[hsl(var(--text-secondary))]">
                  CONSOLIDATED INTELLIGENCE REPORT
                </h2>
                <div className="h-[1px] flex-1 bg-[hsla(var(--border-subtle))]" />
              </div>

              <ExecutiveReport results={debateResults} />

              {/* Bottom Actions */}
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 py-12 border-t border-[hsla(var(--border-subtle))]">
                <Link
                  href="/profile"
                  className="w-full md:w-auto px-8 py-3 rounded-xl border border-[hsla(var(--border-subtle))] bg-white font-bold text-sm hover:bg-[hsl(var(--bg-surface-raised))] transition-all text-center"
                >
                  DEBATE HISTORY
                </Link>
                <Link
                  href={`/market/${marketId}/debate`}
                  className="w-full md:w-auto px-8 py-3 rounded-xl bg-[hsl(var(--brand-blue))] text-white font-bold text-sm hover:opacity-90 transition-all text-center shadow-lg"
                >
                  START NEW DEBATE
                </Link>
              </div>
            </motion.div>
          )}

          {!isCompleted && (
            <div className="card-l1 p-12 text-center bg-[hsla(var(--bg-floor),0.5)] border-dashed">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-[hsla(var(--border-subtle))] mb-6">
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand-green))] animate-pulse" />
                <span className="text-[10px] font-black tracking-widest uppercase">Orchestrating Consensus</span>
              </div>
              <p className="text-sm font-medium text-[hsl(var(--text-secondary))] max-w-md mx-auto leading-relaxed">
                Synthesis and probabilistic consolidation will be available once the live debate process completes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
