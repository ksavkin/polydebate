// ExecutiveReport.tsx
"use client";

import { motion } from "framer-motion";
import { type DebateResults } from "@/lib/api";
import { getModelColorConfig, formatProb } from "@/lib/utils";

interface ExecutiveReportProps {
    results: DebateResults;
}

export default function ExecutiveReport({ results }: ExecutiveReportProps) {
    const allOutcomes = results.market.outcomes.map(o => o.name);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
        >
            {/* Report Hero - Synthesis */}
            <section className="card-l2 p-10 border-l-4 border-l-[hsl(var(--brand-coral))] bg-white">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-6 bg-[hsl(var(--brand-coral))] rounded-full" />
                    <h3 className="text-xs font-black text-[hsl(var(--brand-coral))] uppercase tracking-[0.3em]">
                        EXECUTIVE INTELLIGENCE SYNTHESIS
                    </h3>
                </div>
                <p className="text-xl font-medium leading-relaxed text-[hsl(var(--text-principal))] max-w-5xl">
                    {results.summary.overall || "Synthesis pending final consolidation."}
                </p>
            </section>

            {/* Bento Phase 1: Consensus & Divergence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Points of Consensus */}
                <div className="card-l1 p-8 bg-white/50 backdrop-blur-sm group hover:shadow-md transition-shadow">
                    <h4 className="text-[10px] font-black text-[hsl(var(--brand-green))] uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-green))]" />
                        CONSENSUS
                    </h4>
                    <p className="text-[13px] font-medium leading-relaxed text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-principal))] transition-colors">
                        {results.summary.consensus || "Models converged on a stable probabilistic outlook with minimal significant deviations."}
                    </p>
                </div>

                {/* Critical Divergence */}
                <div className="card-l1 p-8 bg-white/50 backdrop-blur-sm group hover:shadow-md transition-shadow">
                    <h4 className="text-[10px] font-black text-[hsl(var(--brand-red))] uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--brand-red))]" />
                        DIVERGENCE
                    </h4>
                    <div className="text-[13px] font-medium leading-relaxed text-[hsl(var(--text-secondary))] group-hover:text-[hsl(var(--text-principal))] transition-colors">
                        {results.summary.disagreements && results.summary.disagreements.length > 0 ? (
                            <div className="space-y-4">
                                <p className="font-bold text-[hsl(var(--text-principal))] border-b border-[hsla(var(--border-subtle))] pb-2">
                                    Topic: {results.summary.disagreements[0].topic}
                                </p>
                                <p>
                                    Primary conflict arises from differing interpretations of historical volatility and macro catalysts.
                                </p>
                            </div>
                        ) : (
                            "Model reasoning paths maintained consistent alignment throughout the debate process."
                        )}
                    </div>
                </div>
            </div>

            {/* Phase 2: Consolidated Probabilistic Targets (Full Width) */}
            <section className="card-l1 overflow-hidden shadow-xl border-[hsla(var(--brand-blue),0.1)] bg-white">
                <div className="px-8 py-6 border-b border-[hsla(var(--border-subtle))] bg-[hsla(var(--brand-blue),0.02)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand-blue))] animate-pulse" />
                        <h4 className="text-[10px] font-black text-[hsl(var(--brand-blue))] uppercase tracking-[0.3em]">
                            CONSOLIDATED PROBABILISTIC TARGETS
                        </h4>
                    </div>
                    <span className="text-[9px] font-black px-3 py-1 rounded-full bg-[hsla(var(--brand-blue),0.1)] text-[hsl(var(--brand-blue))]">
                        FINAL READOUT
                    </span>
                </div>

                <div className="p-8">
                    {/* Multi-column grid for the table to handle many outcomes efficiently */}
                    <div className={`grid grid-cols-1 ${allOutcomes.length > 10 ? 'xl:grid-cols-2 gap-x-12' : ''}`}>
                        {[...Array(allOutcomes.length > 10 ? 2 : 1)].map((_, colIdx) => {
                            const outcomesPerCol = allOutcomes.length > 10 ? Math.ceil(allOutcomes.length / 2) : allOutcomes.length;
                            const currentOutcomes = allOutcomes.slice(colIdx * outcomesPerCol, (colIdx + 1) * outcomesPerCol);

                            if (currentOutcomes.length === 0) return null;

                            return (
                                <div key={colIdx} className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[hsla(0,0%,0%,0.05)]">
                                                <th className="py-5 text-[10px] font-black uppercase tracking-wider text-[hsl(var(--text-secondary))] opacity-60">
                                                    Outcome Range
                                                </th>
                                                {Object.keys(results.final_predictions).map(modelId => {
                                                    const colorConfig = getModelColorConfig(modelId);
                                                    return (
                                                        <th key={modelId} className="px-4 py-5 text-[10px] font-black uppercase tracking-wider text-center" style={{ color: colorConfig.color1 }}>
                                                            {modelId.split(':')[0].substring(0, 10)}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[hsla(0,0%,0%,0.02)]">
                                            {currentOutcomes.map(outcome => (
                                                <tr key={outcome} className="hover:bg-[hsla(var(--brand-blue),0.02)] transition-colors group">
                                                    <td className="py-4 text-[11px] font-bold text-[hsl(var(--text-principal))] group-hover:text-[hsl(var(--brand-blue))] transition-colors">
                                                        {outcome}
                                                    </td>
                                                    {Object.keys(results.final_predictions).map(modelId => {
                                                        const prob = results.final_predictions[modelId].predictions[outcome] || 0;
                                                        const colorConfig = getModelColorConfig(modelId);
                                                        return (
                                                            <td key={modelId} className="px-4 py-4 text-center">
                                                                <span
                                                                    className={`text-[13px] font-bold tabular-nums transition-opacity ${prob > 20 ? '' : 'opacity-30'}`}
                                                                    style={{ color: prob > 20 ? colorConfig.color1 : 'inherit' }}
                                                                >
                                                                    {formatProb(prob)}%
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Phase 2: Detailed Rationales */}
            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-black text-[hsl(var(--text-secondary))] uppercase tracking-[0.4em] whitespace-nowrap">
                        MODEL RATIONALES & EVIDENCE
                    </h3>
                    <div className="h-[1px] flex-1 bg-[hsla(var(--border-subtle))]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {results.summary.model_rationales?.map((rationale, idx) => {
                        const colorConfig = getModelColorConfig(rationale.model);
                        return (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -6, boxShadow: "var(--shadow-lg)" }}
                                className="card-l1 p-8 interactive-card flex flex-col h-full bg-white border-t-2"
                                style={{ borderTopColor: colorConfig.color1 + '22' }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: colorConfig.color1,
                                            boxShadow: `0 0 10px ${colorConfig.color1}44`
                                        }}
                                    />
                                    <h4 className="text-sm font-bold tracking-tight">{rationale.model}</h4>
                                </div>

                                <p className="text-[13px] font-medium leading-relaxed text-[hsl(var(--text-secondary))] mb-8 flex-1 italic">
                                    "{rationale.rationale}"
                                </p>

                                {rationale.key_arguments?.length > 0 && (
                                    <div className="space-y-4 pt-6 border-t border-[hsla(var(--border-subtle))]">
                                        <p className="text-[9px] font-black text-[hsl(var(--text-principal))] uppercase tracking-widest bg-[hsla(var(--bg-floor))] w-fit px-2 py-1 rounded">
                                            Key Intelligence Points
                                        </p>
                                        <ul className="space-y-3">
                                            {rationale.key_arguments.map((arg, argIdx) => (
                                                <li key={argIdx} className="flex gap-3 text-[11px] font-medium leading-relaxed text-[hsl(var(--text-secondary))]">
                                                    <span className="font-bold" style={{ color: colorConfig.color1 }}>›</span>
                                                    {arg}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
