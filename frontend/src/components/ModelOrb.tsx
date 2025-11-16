"use client";

import { Model } from "@/lib/api";

interface ModelOrbProps {
  model: Model;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

// Generate color scheme based on provider
const getProviderColors = (provider: string): { primary: string; secondary: string } => {
  const providerLower = provider.toLowerCase();
  if (providerLower.includes('openai') || providerLower.includes('anthropic')) {
    return { primary: '#10b981', secondary: '#34d399' }; // Green
  }
  if (providerLower.includes('google') || providerLower.includes('gemini')) {
    return { primary: '#3b82f6', secondary: '#60a5fa' }; // Blue
  }
  if (providerLower.includes('meta') || providerLower.includes('llama')) {
    return { primary: '#8b5cf6', secondary: '#a78bfa' }; // Purple
  }
  if (providerLower.includes('mistral')) {
    return { primary: '#f59e0b', secondary: '#fbbf24' }; // Amber
  }
  // Default colors
  return { primary: '#ef4444', secondary: '#f87171' }; // Red
};

export function ModelOrb({ model, isSelected, isDisabled, onClick }: ModelOrbProps) {
  const colors = getProviderColors(model.provider);
  const orbSize = 80;
  const glowSize = isSelected ? 100 : 80;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="flex flex-col items-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        opacity: isDisabled ? 0.4 : 1,
        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = isSelected ? 'scale(1.15)' : 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
      }}
    >
      {/* Orb */}
      <div
        className="relative rounded-full transition-all duration-200"
        style={{
          width: `${orbSize}px`,
          height: `${orbSize}px`,
          filter: isSelected 
            ? `drop-shadow(0 0 ${glowSize * 0.3}px ${colors.primary}88) drop-shadow(0 0 ${glowSize * 0.2}px ${colors.secondary}88)`
            : `drop-shadow(0 0 8px ${colors.primary}44)`,
        }}
      >
        {/* Outer glow ring */}
        {isSelected && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${colors.primary}40 0%, transparent 70%)`,
              transform: 'scale(1.3)',
            }}
          />
        )}
        {/* Main orb */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${colors.secondary}, ${colors.primary})`,
            boxShadow: isSelected 
              ? `inset 0 0 20px ${colors.primary}80, 0 0 30px ${colors.primary}60`
              : `inset 0 0 15px rgba(0,0,0,0.3)`,
          }}
        />
        {/* Inner highlight */}
        <div
          className="absolute top-1/4 left-1/4 w-1/3 h-1/3 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            filter: 'blur(8px)',
          }}
        />
        {/* Checkmark for selected */}
        {isSelected && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: colors.primary,
              border: '2px solid var(--card-bg)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Model Info */}
      <div className="text-center min-w-0" style={{ width: '100px' }}>
        <div
          className="text-caption font-semibold truncate mb-0.5"
          style={{
            color: isSelected ? colors.primary : "var(--foreground)",
          }}
        >
          {model.name}
        </div>
        <div
          className="text-caption truncate mb-1"
          style={{
            color: "var(--foreground-secondary)",
            fontSize: '11px',
          }}
        >
          {model.provider}
        </div>
        {model.is_free && (
          <div
            className="inline-block px-1.5 py-0.5 rounded text-caption font-medium"
            style={{
              backgroundColor: `${colors.primary}20`,
              color: colors.primary,
              fontSize: '10px',
            }}
          >
            Free
          </div>
        )}
      </div>
    </button>
  );
}

