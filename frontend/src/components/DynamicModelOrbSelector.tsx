"use client";

import { useState, useEffect, useRef } from "react";
import { Model } from "@/lib/api";

interface DynamicModelOrbSelectorProps {
  models: Model[];
  selectedModels: string[];
  onModelToggle: (modelId: string) => void;
  maxSelected?: number;
}

// Generate distinct gradient colors based on provider/model
const getModelGradient = (model: Model): { primary: string; secondary: string; tertiary: string } => {
  const providerLower = model.provider.toLowerCase();
  const modelLower = model.name.toLowerCase();
  
  // OpenAI / Anthropic - Purple/Blue gradient
  if (providerLower.includes('openai') || modelLower.includes('gpt') || providerLower.includes('anthropic') || modelLower.includes('claude')) {
    return { primary: '#8b5cf6', secondary: '#6366f1', tertiary: '#a5b4fc' }; // Purple to Indigo
  }
  // Google / Gemini - Blue/Teal gradient
  if (providerLower.includes('google') || modelLower.includes('gemini') || modelLower.includes('gemma')) {
    return { primary: '#3b82f6', secondary: '#06b6d4', tertiary: '#67e8f9' }; // Blue to Cyan
  }
  // Meta / Llama - Cyan/Blue gradient
  if (providerLower.includes('meta') || modelLower.includes('llama')) {
    return { primary: '#06b6d4', secondary: '#3b82f6', tertiary: '#93c5fd' }; // Cyan to Blue
  }
  // Mistral - Orange/Amber gradient
  if (providerLower.includes('mistral')) {
    return { primary: '#f59e0b', secondary: '#fbbf24', tertiary: '#fde047' }; // Amber to Yellow
  }
  // Cohere - Pink/Magenta gradient
  if (providerLower.includes('cohere')) {
    return { primary: '#ec4899', secondary: '#d946ef', tertiary: '#f0abfc' }; // Pink to Purple
  }
  // Default - generate from model ID hash with vibrant colors
  const hash = model.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  const sat = 75 + (hash % 15); // 75-90% saturation
  return {
    primary: `hsl(${hue}, ${sat}%, 50%)`,
    secondary: `hsl(${(hue + 20) % 360}, ${sat}%, 60%)`,
    tertiary: `hsl(${(hue + 40) % 360}, ${sat}%, 70%)`,
  };
};

export function DynamicModelOrbSelector({
  models,
  selectedModels,
  onModelToggle,
  maxSelected = 4,
}: DynamicModelOrbSelectorProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const focusedModel = models[focusedIndex];
  const isFocusedSelected = focusedModel ? selectedModels.includes(focusedModel.id) : false;
  const isMaxReached = selectedModels.length >= maxSelected;
  const canSelect = !isFocusedSelected && !isMaxReached;

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollAmount = 53; // Width of preview orb (40-50px) + gap (12px)
    const targetScroll = index * scrollAmount;
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  const handlePrevious = () => {
    const newIndex = focusedIndex > 0 ? focusedIndex - 1 : models.length - 1;
    setFocusedIndex(newIndex);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = focusedIndex < models.length - 1 ? focusedIndex + 1 : 0;
    setFocusedIndex(newIndex);
    scrollToIndex(newIndex);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const newIndex = focusedIndex > 0 ? focusedIndex - 1 : models.length - 1;
        setFocusedIndex(newIndex);
        scrollToIndex(newIndex);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const newIndex = focusedIndex < models.length - 1 ? focusedIndex + 1 : 0;
        setFocusedIndex(newIndex);
        scrollToIndex(newIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [focusedIndex, models.length]);

  const handleSelect = () => {
    if (focusedModel && canSelect) {
      onModelToggle(focusedModel.id);
    }
  };

  if (!focusedModel) return null;

  const gradient = getModelGradient(focusedModel);
  const orbSize = 180;

  return (
    <div ref={containerRef} className="flex flex-col items-center" tabIndex={0}>
      {/* Selected Models Chips */}
      {selectedModels.length > 0 && (
        <div className="mb-4 w-full">
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {selectedModels.map((modelId) => {
              const model = models.find(m => m.id === modelId);
              if (!model) return null;
              return (
                <button
                  key={modelId}
                  onClick={() => onModelToggle(modelId)}
                  className="px-2.5 py-1 rounded-full text-caption font-medium transition-all duration-150"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-white)",
                  }}
                >
                  {model.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Orbs Carousel (small, above main orb) */}
      {models.length > 1 && (
        <div className="relative w-full mb-4">
          <button
            onClick={handlePrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150"
            style={{
              backgroundColor: "var(--color-charcoal)",
              color: "var(--color-white)",
              border: "1px solid var(--card-border)",
            }}
            aria-label="Previous model"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.75 10.5L5.25 7L8.75 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div
            ref={carouselRef}
            className="overflow-x-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingLeft: "28px",
              paddingRight: "28px",
            }}
          >
            <div className="flex gap-3 justify-center items-center" style={{ minHeight: "60px", paddingLeft: "20px", paddingRight: "20px" }}>
              {models.map((model, idx) => {
                const isFocused = idx === focusedIndex;
                const isSelected = selectedModels.includes(model.id);
                const modelGradient = getModelGradient(model);
                const previewSize = isFocused ? 50 : 40;
                const opacity = isFocused ? 1 : 0.5;

                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      setFocusedIndex(idx);
                      scrollToIndex(idx);
                    }}
                    className="flex-shrink-0 transition-all duration-300"
                    style={{
                      opacity,
                      transform: isFocused ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    <div
                      className="rounded-full relative"
                      style={{
                        width: `${previewSize}px`,
                        height: `${previewSize}px`,
                        background: `radial-gradient(circle at 30% 30%, ${modelGradient.secondary}, ${modelGradient.primary})`,
                        filter: isFocused
                          ? `drop-shadow(0 0 12px ${modelGradient.primary}88)`
                          : `drop-shadow(0 0 4px ${modelGradient.primary}44)`,
                        boxShadow: isSelected
                          ? `inset 0 0 10px ${modelGradient.primary}80, 0 0 15px ${modelGradient.primary}60`
                          : `inset 0 0 8px rgba(0,0,0,0.3)`,
                      }}
                    >
                      {isSelected && (
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: modelGradient.primary,
                            border: '2px solid var(--card-bg)',
                          }}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.5 2L3 5.5L1.5 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150"
            style={{
              backgroundColor: "var(--color-charcoal)",
              color: "var(--color-white)",
              border: "1px solid var(--card-border)",
            }}
            aria-label="Next model"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Main Dynamic Orb */}
      <div className="relative mb-4">
        <button
          onClick={handleSelect}
          disabled={!canSelect}
          className="transition-all duration-300 disabled:cursor-not-allowed"
          style={{
            opacity: canSelect ? 1 : 0.6,
            transform: isFocusedSelected ? 'scale(1.05)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (canSelect) {
              e.currentTarget.style.transform = 'scale(1.08)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = isFocusedSelected ? 'scale(1.05)' : 'scale(1)';
          }}
        >
          <div
            key={focusedModel.id}
            className="relative rounded-full transition-all duration-300"
            style={{
              width: `${orbSize}px`,
              height: `${orbSize}px`,
              filter: isFocusedSelected
                ? `drop-shadow(0 0 60px ${gradient.primary}88) drop-shadow(0 0 40px ${gradient.secondary}88) drop-shadow(0 0 20px ${gradient.tertiary}88)`
                : `drop-shadow(0 0 40px ${gradient.primary}66) drop-shadow(0 0 20px ${gradient.secondary}44)`,
            }}
          >
            {/* Outer glow ring - animated */}
            {isFocusedSelected && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${gradient.primary}50 0%, transparent 70%)`,
                  transform: 'scale(1.4)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            )}
            {/* Main orb with multi-color gradient */}
            <div
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${gradient.tertiary} 0%, ${gradient.secondary} 40%, ${gradient.primary} 80%, rgba(0,0,0,0.3) 100%)`,
                boxShadow: isFocusedSelected
                  ? `inset 0 0 30px ${gradient.primary}90, inset 0 0 60px ${gradient.secondary}60, 0 0 50px ${gradient.primary}70, 0 0 80px ${gradient.secondary}50`
                  : `inset 0 0 20px rgba(0,0,0,0.4), inset 0 0 40px ${gradient.primary}40, 0 0 30px ${gradient.primary}50`,
              }}
            />
            {/* Inner highlight - animated */}
            <div
              className="absolute top-1/4 left-1/4 w-1/3 h-1/3 rounded-full transition-all duration-300"
              style={{
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.2))',
                filter: 'blur(12px)',
              }}
            />
            {/* Secondary inner glow */}
            <div
              className="absolute top-1/3 left-1/3 w-1/4 h-1/4 rounded-full transition-all duration-300"
              style={{
                background: `radial-gradient(circle, ${gradient.tertiary}80, transparent)`,
                filter: 'blur(8px)',
              }}
            />
            {/* Selection indicator */}
            {isFocusedSelected && (
              <div
                className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  backgroundColor: gradient.primary,
                  border: '3px solid var(--card-bg)',
                  boxShadow: `0 0 15px ${gradient.primary}80, 0 0 25px ${gradient.secondary}60`,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 4L6 11L3 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {!isFocusedSelected && canSelect && (
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full text-caption font-medium transition-all duration-200"
                style={{
                  backgroundColor: "var(--color-charcoal)",
                  color: "var(--color-white)",
                  border: `1px solid ${gradient.primary}`,
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 8px ${gradient.primary}40`,
                }}
              >
                Click to select
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Model Details */}
      <div className="text-center mb-2">
        <div
          className="text-body font-semibold mb-1"
          style={{
            color: isFocusedSelected ? gradient.primary : "var(--foreground)",
            transition: "color 0.3s ease",
          }}
        >
          {focusedModel.name}
        </div>
        <div
          className="text-caption mb-2"
          style={{
            color: "var(--foreground-secondary)",
          }}
        >
          {focusedModel.provider}
        </div>
        {focusedModel.is_free && (
          <div
            className="inline-block px-2 py-0.5 rounded-full text-caption font-medium"
            style={{
              backgroundColor: `${gradient.primary}20`,
              color: gradient.primary,
            }}
          >
            Free
          </div>
        )}
      </div>

      {/* Max selected hint */}
      {isMaxReached && !isFocusedSelected && (
        <p className="text-caption text-center mt-2" style={{ color: "var(--foreground-secondary)" }}>
          Max {maxSelected} models selected
        </p>
      )}
    </div>
  );
}

