import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface OrbColorConfig {
  color1: string;
  color2: string;
  glow1: string;
  glow2: string;
}

export const getModelColorConfig = (identifier: string): OrbColorConfig => {
  // Normalize identifier for matching
  const identifierLower = identifier.toLowerCase();
  
  // Match provider/model names to get consistent colors across the app
  // OpenAI / Anthropic - Purple/Indigo gradient
  if (identifierLower.includes('openai') || identifierLower.includes('gpt') || 
      identifierLower.includes('anthropic') || identifierLower.includes('claude')) {
    return {
      color1: '#8b5cf6', // Purple
      color2: '#6366f1', // Indigo
      glow1: '#8b5cf633',
      glow2: '#6366f133',
    };
  }
  
  // Google / Gemini - Blue/Cyan gradient
  if (identifierLower.includes('google') || identifierLower.includes('gemini') || 
      identifierLower.includes('gemma')) {
    return {
      color1: '#3b82f6', // Blue
      color2: '#06b6d4', // Cyan
      glow1: '#3b82f633',
      glow2: '#06b6d433',
    };
  }
  
  // Meta / Llama - Cyan/Blue gradient
  if (identifierLower.includes('meta') || identifierLower.includes('llama')) {
    return {
      color1: '#06b6d4', // Cyan
      color2: '#3b82f6', // Blue
      glow1: '#06b6d433',
      glow2: '#3b82f633',
    };
  }
  
  // Mistral - Orange/Amber gradient
  if (identifierLower.includes('mistral')) {
    return {
      color1: '#f59e0b', // Amber
      color2: '#fbbf24', // Yellow
      glow1: '#f59e0b33',
      glow2: '#fbbf2433',
    };
  }
  
  // Cohere - Pink/Magenta gradient
  if (identifierLower.includes('cohere')) {
    return {
      color1: '#ec4899', // Pink
      color2: '#d946ef', // Magenta
      glow1: '#ec489933',
      glow2: '#d946ef33',
    };
  }
  
  // Xiaomi / Mimo - Orange/Yellow gradient (peach to cream)
  if (identifierLower.includes('xiaomi') || identifierLower.includes('mimo')) {
    return {
      color1: '#ff6f59', // Coral/Orange
      color2: '#f9c74f', // Yellow
      glow1: '#ff6f5933',
      glow2: '#f9c74f33',
    };
  }
  
  // Kwaipilot / KAT - Orange/Yellow gradient (similar to Xiaomi)
  if (identifierLower.includes('kwaipilot') || identifierLower.includes('kat')) {
    return {
      color1: '#ff6f59', // Coral/Orange
      color2: '#f9c74f', // Yellow
      glow1: '#ff6f5933',
      glow2: '#f9c74f33',
    };
  }
  
  // NVIDIA - Teal/Cyan gradient
  if (identifierLower.includes('nvidia') || identifierLower.includes('nemotron')) {
    return {
      color1: '#06b6d4', // Cyan
      color2: '#3b82f6', // Blue
      glow1: '#06b6d433',
      glow2: '#3b82f633',
    };
  }
  
  // DeepSeek - Green/Cyan gradient
  if (identifierLower.includes('deepseek')) {
    return {
      color1: '#10b981', // Green
      color2: '#06b6d4', // Cyan
      glow1: '#10b98133',
      glow2: '#06b6d433',
    };
  }
  
  // xAI / Grok - Indigo/Purple gradient
  if (identifierLower.includes('x-ai') || identifierLower.includes('grok') || 
      identifierLower.includes('xai')) {
    return {
      color1: '#6366f1', // Indigo
      color2: '#8b5cf6', // Purple
      glow1: '#6366f133',
      glow2: '#8b5cf633',
    };
  }
  
  // Default - generate from model ID hash with vibrant colors
  const hash = identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  const sat = 75 + (hash % 15); // 75-90% saturation
  const color1 = `hsl(${hue}, ${sat}%, 50%)`;
  const color2 = `hsl(${(hue + 20) % 360}, ${sat}%, 60%)`;
  
  return {
    color1,
    color2,
    glow1: `${color1}33`,
    glow2: `${color2}33`,
  };
};

export const formatProb = (val: number): string => {
  if (val === undefined || val === null) return "0";
  return Number(val.toFixed(2)).toString();
};
