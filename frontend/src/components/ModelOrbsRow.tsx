// ModelOrbsRow.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Orb } from "@/components/Orb";
import { getModelColorConfig } from "@/lib/utils";

interface ModelSummary {
  id: string;
  name: string;
}

interface ModelOrbsRowProps {
  models: ModelSummary[];
  activeModelId: string | null;
  speakingModelId?: string | null;
  hasAudio?: boolean; // Whether audio is available
}

export function ModelOrbsRow({ models, activeModelId, speakingModelId, hasAudio = true }: ModelOrbsRowProps) {
  if (models.length === 0) return null;

  return (
    <div className="w-full flex justify-center">
      <div className="flex items-center gap-6 flex-wrap">
        {models.map((m) => {
          const isActive = m.id === activeModelId;
          const isSpeaking = m.id === speakingModelId;
          const colorConfig = getModelColorConfig(m.id);

          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${isSpeaking ? 'bg-white shadow-sm ring-1 ring-[hsla(var(--border-subtle))]' : 'opacity-60'}`}
            >
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Orb
                  colorConfig={colorConfig}
                  isSpeaking={isSpeaking}
                  size={32}
                />
                <AnimatePresence>
                  {isSpeaking && hasAudio && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="absolute inset-0 rounded-full border border-[hsl(var(--brand-blue))] animate-ping"
                    />
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[hsl(var(--text-principal))] leading-none">
                  {m.name}
                </span>
                {isSpeaking && hasAudio ? (
                  <span className="text-[9px] font-bold text-[hsl(var(--brand-blue))] uppercase tracking-wider mt-1">
                    Speaking
                  </span>
                ) : isActive ? (
                  <span className="text-[9px] font-medium text-[hsl(var(--text-secondary))] uppercase tracking-wider mt-1">
                    Active
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
