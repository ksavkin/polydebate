// ModelOrbsRow.tsx
"use client";

import { Orb } from "@/components/Orb";

interface OrbColorConfig {
  color1: string;
  color2: string;
  glow1: string;
  glow2: string;
}

interface ModelSummary {
  id: string;
  name: string;
}

interface ModelOrbsRowProps {
  models: ModelSummary[];
  activeModelId: string | null;
  speakingModelId?: string | null;
}

const getModelColorConfig = (modelId: string): OrbColorConfig => {
  const palette = [
    { c1: "#ff3e1c", c2: "#1c8cff" },
    { c1: "#3b82f6", c2: "#06b6d4" },
    { c1: "#8b5cf6", c2: "#ec4899" },
    { c1: "#10b981", c2: "#06b6d4" },
    { c1: "#f59e0b", c2: "#ef4444" },
    { c1: "#6366f1", c2: "#8b5cf6" },
    { c1: "#ec4899", c2: "#f472b6" },
    { c1: "#06b6d4", c2: "#3b82f6" },
  ];
  const hash = modelId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const paletteIndex = hash % palette.length;
  const colors = palette[paletteIndex];
  const glowIntensity = 0.5 + ((hash % 30) / 100);

  return {
    color1: colors.c1,
    color2: colors.c2,
    glow1: `${colors.c1}${Math.floor(glowIntensity * 255)
      .toString(16)
      .padStart(2, "0")}`,
    glow2: `${colors.c2}${Math.floor(glowIntensity * 255)
      .toString(16)
      .padStart(2, "0")}`,
  };
};

export function ModelOrbsRow({ models, activeModelId, speakingModelId }: ModelOrbsRowProps) {
  if (models.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center pb-3 mb-3" style={{ backgroundColor: "transparent" }}>
      <div className="flex items-center justify-center gap-4 flex-wrap overflow-visible" style={{ backgroundColor: "transparent" }}>
        {models.map((m) => {
          const isActive = m.id === activeModelId;
          const isSpeaking = m.id === speakingModelId;
          const colorConfig = getModelColorConfig(m.id);

          return (
            <div
              key={m.id}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <Orb colorConfig={colorConfig} isSpeaking={isSpeaking} />
              </div>
              <span className="mt-2 text-xs text-[var(--foreground-secondary)] max-w-[110px] text-center truncate">
                {m.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
