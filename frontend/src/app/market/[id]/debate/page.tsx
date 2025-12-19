"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, type Market, type Model, type DebateStartResponse, type DebateMessage, type DebateResults } from "@/lib/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Orb } from "@/components/Orb";
import { DebateChat } from "@/components/DebateChat";
import Link from "next/link";

interface OrbColorConfig {
  color1: string;
  color2: string;
  glow1: string;
  glow2: string;
}

type DebateStatus = 'setup' | 'starting' | 'streaming' | 'completed' | 'error';

export default function DebatePage() {
  const params = useParams();
  const router = useRouter();
  const marketId = params.id as string;

  const [market, setMarket] = useState<Market | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [focusedModelIndex, setFocusedModelIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [rounds, setRounds] = useState(3);
  const [status, setStatus] = useState<DebateStatus>('setup');
  const [debateId, setDebateId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [debateResults, setDebateResults] = useState<DebateResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debateCompleteEventReceived, setDebateCompleteEventReceived] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [remainingDebates, setRemainingDebates] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debateIdRef = useRef<string | null>(null);
  const statusRef = useRef<DebateStatus>('setup');

  // Fetch market details and available models
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [marketData, modelsData] = await Promise.all([
          apiClient.getMarket(marketId),
          apiClient.getModels(),
        ]);
        // Debug: Log market data to verify prices
        console.log('Market data received from API:', {
          id: marketData.id,
          question: marketData.question,
          outcomes: marketData.outcomes.map(o => ({
            name: o.name,
            price: o.price,
            priceType: typeof o.price
          }))
        });
        
        // Debug: Check Bad Bunny specifically and log full API response
        const badBunny = marketData.outcomes.find(o => o.name === 'Bad Bunny');
        if (badBunny) {
          console.log('Bad Bunny in market data:', {
            name: badBunny.name,
            price: badBunny.price,
            priceType: typeof badBunny.price,
            priceTimes100: badBunny.price * 100,
            fullOutcome: badBunny
          });
        }
        
        // Debug: Log the raw API response URL
        console.log('API call URL:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/markets/${marketId}`);
        
        setMarket(marketData);
        setModels(modelsData.models.filter(m => m.supported));
        
        // Set default selected outcome to the most probable one (excluding placeholders)
        if (marketData.outcomes && marketData.outcomes.length > 0) {
          const filteredOutcomes = marketData.outcomes.filter(o => {
            const name = o.name?.toLowerCase() || '';
            if (name.includes('placeholder')) {
              return false;
            }
            // Filter out "Other" only if it looks like a placeholder (price 0.5 and no shares)
            if (name === 'other' && o.price === 0.5 && (!o.shares || o.shares === '0')) {
              return false;
            }
            return true;
          });
          if (filteredOutcomes.length > 0) {
            const sortedOutcomes = [...filteredOutcomes].sort((a, b) => b.price - a.price);
            setSelectedOutcome(sortedOutcomes[0].name || sortedOutcomes[0].slug || null);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    if (marketId) {
      fetchData();
    }
  }, [marketId]);

  // Fetch daily debate limits
  useEffect(() => {
    apiClient.getLimits()
      .then(limits => {
        setRemainingDebates(limits.remaining_debates);
        setLimitReached(limits.remaining_debates <= 0);
      })
      .catch(() => {
        // If not authenticated or error, don't block - backend will handle it
        setLimitReached(false);
      });
  }, []);

  // Keep refs in sync with current state
  useEffect(() => {
    debateIdRef.current = debateId;
    statusRef.current = status;
  }, [debateId, status]);

  // Cleanup event source and stop debate on unmount ONLY
  useEffect(() => {
    return () => {
      // Close event source
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Stop the debate on the backend if it's in progress
      // Use refs to get current values at cleanup time
      const currentDebateId = debateIdRef.current;
      const currentStatus = statusRef.current;

      if (currentDebateId && (currentStatus === 'streaming' || currentStatus === 'starting')) {
        // Use navigator.sendBeacon for reliable cleanup on page unload
        // This works even when the user navigates away quickly
        const stopUrl = `${apiClient['baseUrl']}/api/debate/${currentDebateId}/stop`;
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        if (token) {
          // Try fetch with keepalive (more reliable than sendBeacon for authenticated requests)
          fetch(stopUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            keepalive: true, // Allows request to continue even after page unload
          }).catch(err => {
            console.log('Could not stop debate on unmount:', err);
          });
        }
      }
    };
  // Empty deps array - only run cleanup on actual unmount, not on re-renders
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        if (prev.length >= 4) {
          return prev;
        }
        return [...prev, modelId];
      }
    });
  };


  const handleStartDebate = async () => {
    if (selectedModels.length === 0) {
      setError('Please select at least one AI model');
      return;
    }

    try {
      setStatus('starting');
      setError(null);
      setMessages([]);
      setCurrentRound(0);

      const response: DebateStartResponse = await apiClient.startDebate({
        market_id: marketId,
        model_ids: selectedModels,
        rounds: rounds,
      });

      setDebateId(response.debate_id);
      setStatus('streaming');

      // Start SSE stream
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const eventSource = new EventSource(`${API_BASE_URL}/api/debate/${response.debate_id}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('debate_started', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        handleStreamEvent('debate_started', data);
      });

      eventSource.addEventListener('model_thinking', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        handleStreamEvent('model_thinking', data);
      });

      eventSource.addEventListener('message', (event: MessageEvent) => {
        try {
          if (!event.data || event.data.trim() === '') {
            return; // Skip empty messages
          }
          const data = JSON.parse(event.data);
          handleStreamEvent('message', data);
        } catch (err) {
          console.error('Error parsing message event:', err, event.data);
          // Don't break the stream on parse errors
        }
      });

      eventSource.addEventListener('round_complete', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        handleStreamEvent('round_complete', data);
      });

      eventSource.addEventListener('debate_complete', async (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        handleStreamEvent('debate_complete', data);
        setDebateCompleteEventReceived(true); // Mark that debate_complete event was received
        eventSource.close();
        eventSourceRef.current = null;

        // Listen for the truly complete event (when last audio finishes)
        const handleTrulyComplete = async () => {
          window.removeEventListener('debate-truly-complete', handleTrulyComplete);
          
          // Wait a bit for the backend to finish saving the debate
          await new Promise(resolve => setTimeout(resolve, 500));

          // Retry logic: try up to 3 times with increasing delays
          let retries = 3;
          let delay = 1000;
          while (retries > 0) {
            try {
              const results = await apiClient.getDebateResults(response.debate_id);
              setDebateResults(results);
              setStatus('completed');
              return; // Success, exit retry loop
            } catch (err) {
              retries--;
              if (retries === 0) {
                console.error('Error fetching results after retries:', err);
                // Don't set status to error - the debate completed, we just couldn't fetch results
                // The messages are already in state from the stream
                setStatus('completed');
              } else {
                console.warn(`Failed to fetch results, retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
              }
            }
          }
        };
        
        window.addEventListener('debate-truly-complete', handleTrulyComplete);
      });

      // Track error count to avoid spamming (only count meaningful errors)
      let errorCount = 0;
      const maxErrors = 5; // Increased threshold
      let lastErrorTime = 0;
      const errorWindowMs = 10000; // 10 second window to reset error count

      eventSource.addEventListener('error', (event: MessageEvent) => {
        try {
          if (!event.data || event.data.trim() === '') {
            return; // Skip empty error events - don't count them
          }
          const data = JSON.parse(event.data);
          
          // Only handle if there's actual error data (not empty object)
          const hasErrorData = data.error || data.message;
          const isEmpty = Object.keys(data).length === 0;
          
          if (hasErrorData && !isEmpty) {
            console.error('SSE application error event received:', data);
            handleStreamEvent('error', data);
            
            // Only count meaningful errors
            const now = Date.now();
            if (now - lastErrorTime > errorWindowMs) {
              // Reset counter if enough time has passed
              errorCount = 0;
            }
            errorCount++;
            lastErrorTime = now;
            
            if (errorCount >= maxErrors) {
              console.error('Too many SSE application errors. Closing connection.');
              setError('Multiple application errors detected. The debate stream may be corrupted.');
              setStatus('error');
              if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
              }
            }
          }
          // Silently ignore empty error objects - don't log or count them
        } catch (err) {
          // Silently ignore parsing errors for empty error events
        }
      });
      
      eventSource.onerror = (err) => {
        // Only count actual connection errors, not transient network issues
        const now = Date.now();
        
        // Reset error count if enough time has passed since last error
        if (now - lastErrorTime > errorWindowMs) {
          errorCount = 0;
        }
        
        // Only increment error count for actual connection issues
        if (eventSource.readyState === EventSource.CLOSED) {
          // Connection closed - this is a real error
          console.warn('SSE connection closed');
          setError('Connection to debate stream lost');
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          // Still connecting - this is usually transient, don't count it
          // Silently ignore - browsers often fire onerror during initial connection
        } else if (eventSource.readyState === EventSource.OPEN) {
          // Connection is open but error occurred - might be transient
          // Only count if it's a persistent issue
          errorCount++;
          lastErrorTime = now;
          
          if (errorCount >= maxErrors) {
            // Too many errors in short time - close connection
            console.error('Too many SSE connection errors. Closing connection.');
            setError('Multiple connection errors detected. The debate stream may be corrupted.');
            setStatus('error');
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          } else {
            // Log but don't treat as fatal yet
            console.warn(`SSE connection error (${errorCount}/${maxErrors})`);
          }
        }
      };

    } catch (err: unknown) {
      console.error('Error starting debate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start debate';

      // Check if it's a daily limit error (429)
      if (errorMessage.includes('daily') || errorMessage.includes('limit')) {
        setLimitReached(true);
        setRemainingDebates(0);
        setError('Daily limit reached. Try again tomorrow!');
      } else {
        setError(errorMessage);
      }
      setStatus('error');
    }
  };

  const handleStreamEvent = (eventType: string, data: any) => {
    switch (eventType) {
      case 'message':
        setMessages(prev => [...prev, data as DebateMessage]);
        // Update current round from the message data
        if (data.round) {
          setCurrentRound(data.round);
        }
        break;
      case 'round_complete':
        setCurrentRound(data.next_round || data.round + 1);
        break;
      case 'debate_complete':
        setCurrentRound(data.total_rounds || rounds);
        break;
      case 'error':
        setError(data.message || 'An error occurred during the debate');
        break;
    }
  };

  // Calculate market status
  const marketStatus = useMemo(() => {
    if (!market?.end_date) return { text: 'Open', color: 'var(--color-green)' };
    const endDate = new Date(market.end_date);
    const now = new Date();
    if (now > endDate) {
      return { text: 'Resolved', color: 'var(--foreground-secondary)' };
    }
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilEnd <= 1) {
      return { text: `Closes ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`, color: 'var(--color-red)' };
    }
    return { text: `Closes ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: 'var(--foreground-secondary)' };
  }, [market?.end_date]);

  // Get selected outcome data
  const selectedOutcomeData = useMemo(() => {
    if (!market || !selectedOutcome) return null;
    // Filter out placeholders when finding selected outcome
    const filteredOutcomes = market.outcomes.filter(o => {
      const name = o.name?.toLowerCase() || '';
      if (name.includes('placeholder')) {
        return false;
      }
      // Filter out "Other" only if it looks like a placeholder (price 0.5 and no shares)
      if (name === 'other' && o.price === 0.5 && (!o.shares || o.shares === '0')) {
        return false;
      }
      return true;
    });
    return filteredOutcomes.find(
      o => (o.name || o.slug) === selectedOutcome
    ) || null;
  }, [market, selectedOutcome]);

  // Format volume - minimal format like "$5.1 mil"
  const formatVolume = (volume: string) => {
    if (!volume) return '$0';
    
    const volumeUpper = volume.toUpperCase();
    let num = 0;
    
    // Handle already formatted volumes like "10.1M", "$5.2M", "850K", etc.
    if (volumeUpper.includes('M')) {
      const cleanVolume = volume.replace(/[^0-9.]/g, '');
      num = parseFloat(cleanVolume) * 1000000;
    } else if (volumeUpper.includes('K')) {
      const cleanVolume = volume.replace(/[^0-9.]/g, '');
      num = parseFloat(cleanVolume) * 1000;
    } else {
      // Extract number from string
      const cleanVolume = volume.replace(/[^0-9.]/g, '');
      num = parseFloat(cleanVolume) || 0;
    }
    
    if (num >= 1000000) {
      const mil = (num / 1000000).toFixed(1);
      // Remove trailing .0
      return `$${mil.replace(/\.0$/, '')} mil`;
    } else if (num >= 1000) {
      const k = (num / 1000).toFixed(1);
      return `$${k.replace(/\.0$/, '')}K`;
    }
    
    return `$${num.toLocaleString()}`;
  };

  // Get category-based debate focus label
  const getDebateFocusLabel = (category: string): string => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('sport')) {
      return 'Sports outcome debate';
    }
    if (categoryLower.includes('politic')) {
      return 'Politics outcome debate';
    }
    if (categoryLower.includes('crypto') || categoryLower.includes('finance') || categoryLower.includes('econom')) {
      return 'Financial outcome debate';
    }
    if (categoryLower.includes('tech')) {
      return 'Tech outcome debate';
    }
    return 'Prediction debate';
  };

  // Generate deterministic color config from model ID
  const getModelColorConfig = (modelId: string): OrbColorConfig => {
    // Base palette inspired by the original orb
    const palette = [
      { c1: '#ff3e1c', c2: '#1c8cff' }, // Original: orange-red + blue
      { c1: '#3b82f6', c2: '#06b6d4' }, // Deep blue + cyan
      { c1: '#8b5cf6', c2: '#ec4899' }, // Purple + pink
      { c1: '#10b981', c2: '#06b6d4' }, // Green + cyan
      { c1: '#f59e0b', c2: '#ef4444' }, // Amber + red
      { c1: '#6366f1', c2: '#8b5cf6' }, // Indigo + purple
      { c1: '#ec4899', c2: '#f472b6' }, // Pink + light pink
      { c1: '#06b6d4', c2: '#3b82f6' }, // Cyan + blue
    ];

    // Hash model ID to get deterministic index
    const hash = modelId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const paletteIndex = hash % palette.length;
    const colors = palette[paletteIndex];

    // Add slight variation based on hash for glow intensity
    const glowIntensity = 0.5 + ((hash % 30) / 100); // 0.5 to 0.8

    return {
      color1: colors.c1,
      color2: colors.c2,
      glow1: `${colors.c1}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
      glow2: `${colors.c2}${Math.floor(glowIntensity * 255).toString(16).padStart(2, '0')}`,
    };
  };

  // Get focused model
  const focusedModel = models[focusedModelIndex] || null;
  const focusedModelColorConfig = focusedModel ? getModelColorConfig(focusedModel.id) : undefined;
  const isFocusedSelected = focusedModel ? selectedModels.includes(focusedModel.id) : false;
  const canAddModel = !isFocusedSelected && selectedModels.length < 4;

  // Navigation handlers with animation state
  // Animation plays first, then index updates after animation completes
  const ANIMATION_DURATION_MS = 300;

  const handlePreviousModel = () => {
    if (isAnimating || models.length === 0) return;

    setTransitionDirection('right');
    setIsAnimating(true);

    setTimeout(() => {
      setFocusedModelIndex(prev =>
        prev > 0 ? prev - 1 : models.length - 1
      );
      setTransitionDirection(null);
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);
  };

  const handleNextModel = () => {
    if (isAnimating || models.length === 0) return;

    setTransitionDirection('left');
    setIsAnimating(true);

    setTimeout(() => {
      setFocusedModelIndex(prev =>
        prev < models.length - 1 ? prev + 1 : 0
      );
      setTransitionDirection(null);
      setIsAnimating(false);
    }, ANIMATION_DURATION_MS);
  };

  // Compute neighbor indices with infinite loop
  // prevIndex wraps around to last model if at start
  const prevIndex = models.length > 0 ? (focusedModelIndex - 1 + models.length) % models.length : 0;
  // nextIndex wraps around to first model if at end
  const nextIndex = models.length > 0 ? (focusedModelIndex + 1) % models.length : 0;

  const prevModel = models[prevIndex] || null;
  const nextModel = models[nextIndex] || null;
  const prevModelColorConfig = prevModel ? getModelColorConfig(prevModel.id) : undefined;
  const nextModelColorConfig = nextModel ? getModelColorConfig(nextModel.id) : undefined;

  // Slot styles helper - returns style based on logical slot and transition direction
  // During animation, orbs move between slots smoothly
  type LogicalSlot = 'prev' | 'center' | 'next';

  const baseSlotStyles: Record<LogicalSlot, { translateX: number; scale: number; opacity: number; zIndex: number }> = {
    prev:   { translateX: -140, scale: 0.7, opacity: 0.4, zIndex: 10 },
    center: { translateX:   0,  scale: 1.0, opacity: 1.0, zIndex: 20 },
    next:   { translateX:  140, scale: 0.7, opacity: 0.4, zIndex: 10 },
  };

  const getSlotStyle = (slot: LogicalSlot) => {
    // Resting state - no animation
    if (!transitionDirection) {
      return baseSlotStyles[slot];
    }

    // We are sliding to the NEXT model (content moves left)
    if (transitionDirection === 'left') {
      if (slot === 'prev') {
        // prev orb slides further left and fades out
        return { translateX: -280, scale: 0.6, opacity: 0, zIndex: 5 };
      }
      if (slot === 'center') {
        // center moves to where prev was
        return baseSlotStyles.prev;
      }
      // slot === 'next'
      // next moves into center
      return baseSlotStyles.center;
    }

    // We are sliding to the PREVIOUS model (content moves right)
    if (slot === 'next') {
      // next orb slides further right and fades out
      return { translateX: 280, scale: 0.6, opacity: 0, zIndex: 5 };
    }
    if (slot === 'center') {
      // center moves to where next was
      return baseSlotStyles.next;
    }
    // slot === 'prev'
    // prev moves into center
    return baseSlotStyles.center;
  };

  // Keyboard navigation
  useEffect(() => {
    if (status !== 'setup') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousModel();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextModel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, models.length]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LoadingSpinner size="lg" />
        <p style={{ color: "var(--foreground-secondary)" }}>Loading market details...</p>
      </div>
    );
  }

  if (error && status === 'setup' && !market) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--color-red)" }}>Error</h1>
          <p className="mb-6" style={{ color: "var(--foreground-secondary)" }}>{error}</p>
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

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
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

  // Streaming/Completed view - full width
  if (status === 'streaming' || status === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-block mb-4 text-sm"
              style={{ color: "var(--color-primary)" }}
            >
              ← Back to Markets
            </Link>
            <h1 className="text-h1 font-bold mb-2">{market.question}</h1>
          </div>

          {/* Chat History - Single instance that persists across streaming and completed */}
          <DebateChat
            key={`debate-${debateId}`}
            messages={messages}
            rounds={rounds}
            currentRound={status === 'completed' ? rounds : currentRound}
            models={models.filter((m) => selectedModels.includes(m.id))}
            isCompleted={status === 'completed'}
            debateCompleteEventReceived={debateCompleteEventReceived}
          />

          {/* Results Section - Only show when completed */}
          {status === 'completed' && debateResults && (
            <>
              {/* Results Section - Following design.md principles */}
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
                            // Parse change string to determine color
                            let changeColor = "var(--foreground-secondary)";
                            let changeText = data.change || "";
                            
                            if (data.change) {
                              // Extract sign from change string (e.g., "+7% 260-279 after debate" or "-5% 260-279 after debate")
                              const changeMatch = data.change.match(/^([+-]?\d+\.?\d*)%/);
                              if (changeMatch) {
                                const changeValue = parseFloat(changeMatch[1]);
                                if (changeValue > 0) {
                                  changeColor = "#27ae60"; // Green for positive (design.md accent green)
                                } else if (changeValue < 0) {
                                  changeColor = "#e74c3c"; // Red for negative
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
                                  {Object.entries(data.predictions).map(([outcome, percentage]) => {
                                    // Format percentage to 2 decimal places
                                    const formattedPercentage = typeof percentage === 'number' 
                                      ? percentage.toFixed(2) 
                                      : parseFloat(String(percentage)).toFixed(2);
                                    
                                    return (
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
                                          {formattedPercentage}%
                                        </span>
                                      </div>
                                    );
                                  })}
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

              {/* Action buttons - centered with icons */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <Link
                  href="/"
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
                  Back to Markets
                </Link>
                <button
                  onClick={() => {
                    setStatus('setup');
                    setMessages([]);
                    setDebateResults(null);
                    setDebateId(null);
                    setCurrentRound(0);
                  }}
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
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Setup Phase - Two Column Layout (PROFESSIONAL)
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-block mb-3 text-caption"
          style={{ color: "var(--color-primary)" }}
        >
          ← Back to Markets
        </Link>

        {/* Single Outer Card - Contains header and two-column content */}
        <div
          className="rounded-lg transition-all duration-200"
          style={{
            backgroundColor: "#f5f5f5",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
          }}
        >
          {/* Header Row - Internal divider */}
          <div
            className="px-4 py-3 border-b"
            style={{
              borderColor: "var(--card-border)",
            }}
          >
            <div className="flex items-center gap-3">
              {/* Left: Icon + Question + Volume + Status */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {market.image_url && (
                  <img
                    src={market.image_url}
                    alt=""
                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-h2 font-bold mb-1 line-clamp-2"
                    style={{
                      color: "var(--foreground)",
                      lineHeight: "var(--leading-tight)",
                    }}
                    title={market.question}
                  >
                    {market.question}
                  </h1>
                  <div className="flex items-center gap-2">
                    <span className="text-caption" style={{ color: "var(--foreground-secondary)" }}>
                      {formatVolume(market.volume)} Vol.
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-caption font-medium"
                      style={{
                        backgroundColor: `${marketStatus.color}20`,
                        color: marketStatus.color,
                        border: `1px solid ${marketStatus.color}40`,
                      }}
                    >
                      {marketStatus.text}
                    </span>
                  </div>
                </div>
              </div>
              {/* Right: Category + Type */}
              <div className="flex items-center gap-2 text-caption flex-shrink-0" style={{ color: "var(--foreground-secondary)" }}>
                <span>{market.category}</span>
                <span>•</span>
                <span>{market.market_type || 'binary'}</span>
              </div>
            </div>
          </div>

          {/* Two Column Layout - 57% / 43% */}
          <div className="grid grid-cols-1 lg:grid-cols-[57%_43%] gap-0 items-start px-4 pb-4 pt-4">
          {/* Left Column - Outcome Table with Professional Scroll */}
          <div
            className="flex flex-col overflow-hidden"
            style={{
              maxHeight: "calc(100vh - 200px)",
            }}
          >
            {/* Table Header - Fixed */}
            <div
              className="px-4 py-3 border-b flex-shrink-0"
              style={{
                borderColor: "var(--card-border)",
              }}
            >
              <div className="grid grid-cols-[2.5fr_0.9fr_0.9fr_1fr] gap-2 text-caption font-medium" style={{ color: "var(--foreground-secondary)" }}>
                <div>Outcome</div>
                <div className="text-center">Chance</div>
                <div className="text-center">24h Change</div>
                <div className="text-right">Volume</div>
              </div>
            </div>
            {/* Scrollable Rows - Properly Padded */}
            <div
              className="overflow-y-auto flex-1"
              style={{
                minHeight: 0,
                paddingTop: "8px",
                paddingBottom: "8px",
                paddingLeft: "16px",
                paddingRight: "16px",
              }}
            >
              {(() => {
                // Filter and sort outcomes once
                const filteredAndSorted = market.outcomes
                  .filter((outcome) => {
                    // Filter out placeholder outcomes only
                    // "Other" is a legitimate outcome for some markets, but if it has price 0.5 and shares "0", it's likely a placeholder
                    const name = outcome.name?.toLowerCase() || '';
                    if (name.includes('placeholder')) {
                      return false;
                    }
                    // Filter out "Other" only if it looks like a placeholder (price 0.5 and no shares)
                    if (name === 'other' && outcome.price === 0.5 && (!outcome.shares || outcome.shares === '0')) {
                      return false;
                    }
                    // Filter out outcomes with price_change_24h: 0.0 and shares: "0"
                    if (outcome.price_change_24h !== undefined && outcome.price_change_24h === 0.0 && (!outcome.shares || outcome.shares === '0')) {
                      return false;
                    }
                    // Filter out outcomes where shares is 0 or empty
                    const shares = outcome.shares;
                    if (!shares || shares === '0' || parseFloat(String(shares)) === 0) {
                      return false;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    // Sort by price in descending order (highest to lowest)
                    const priceA = typeof a.price === 'number' ? a.price : parseFloat(String(a.price)) || 0;
                    const priceB = typeof b.price === 'number' ? b.price : parseFloat(String(b.price)) || 0;
                    return priceB - priceA;
                  });
                
                return filteredAndSorted.map((outcome, idx) => {
                const isSelected = selectedOutcome === (outcome.name || outcome.slug);
                // Format percentage: show decimals for small values, "<1%" for very small values
                const price = typeof outcome.price === 'number' ? outcome.price : parseFloat(String(outcome.price)) || 0;
                const percentageValue = price * 100;
                
                // Debug logging for Bad Bunny
                if (outcome.name === 'Bad Bunny') {
                  console.log('Bad Bunny Debug:', {
                    name: outcome.name,
                    rawPrice: outcome.price,
                    priceType: typeof outcome.price,
                    parsedPrice: price,
                    percentageValue: percentageValue,
                    beforeRounding: percentageValue
                  });
                }
                
                let percentage: string;
                if (percentageValue < 1) {
                  percentage = "<1%";
                } else if (percentageValue < 10) {
                  // For values < 10%, show 1 decimal place (e.g., 3.6%)
                  percentage = percentageValue.toFixed(1) + "%";
                } else {
                  // For values >= 10%, round to nearest integer (e.g., 96%)
                  percentage = Math.round(percentageValue) + "%";
                }
                
                // Debug logging for Bad Bunny after calculation
                if (outcome.name === 'Bad Bunny') {
                  console.log('Bad Bunny Final:', {
                    percentage: percentage,
                    percentageValue: percentageValue,
                    rounded: Math.round(percentageValue)
                  });
                }
                // Use outcome-level price_change_24h if available, otherwise fall back to market-level
                // Backend returns price_change_24h as a decimal percentage (e.g., -0.05 means -0.05%, 0.25 means 0.25%)
                const change24h = outcome.price_change_24h !== undefined 
                  ? outcome.price_change_24h.toFixed(2) // Already a percentage, just format
                  : (market.price_change_24h ? market.price_change_24h.toFixed(2) : null);
                const isPositive = change24h ? parseFloat(change24h) > 0 : null;
                const isLast = idx === filteredAndSorted.length - 1;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedOutcome(outcome.name || outcome.slug || null)}
                    className="cursor-pointer transition-all duration-150"
                    style={{
                      padding: "10px 0",
                      backgroundColor: isSelected ? "rgba(37, 99, 235, 0.08)" : "transparent",
                      borderLeft: isSelected ? `3px solid var(--color-primary)` : "none",
                      marginLeft: isSelected ? "-16px" : "0",
                      marginRight: isSelected ? "-16px" : "0",
                      paddingLeft: isSelected ? "19px" : "0",
                      paddingRight: isSelected ? "16px" : "0",
                      borderRadius: "0",
                    }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "var(--card-bg-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div className="grid grid-cols-[2.5fr_0.9fr_0.9fr_1fr] gap-2 items-center">
                        {/* Outcome */}
                        <div className="min-w-0 flex items-center gap-2">
                          {/* Outcome Image */}
                          {outcome.image_url && (
                            <div 
                              className="rounded overflow-hidden shrink-0 flex items-center justify-center relative"
                              style={{ 
                                width: "32px",
                                height: "32px",
                                backgroundColor: "var(--color-soft-gray)",
                                border: "1px solid var(--card-border)",
                                boxShadow: "var(--shadow-sm)",
                              }}
                            >
                              <img
                                src={outcome.image_url}
                                alt={outcome.name || 'Outcome'}
                                className="w-full h-full object-cover"
                                style={{
                                  backgroundColor: "var(--color-soft-gray)",
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.02) 100%)",
                                  borderRadius: "inherit",
                                }}
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-body font-medium truncate"
                              style={{
                                color: "var(--foreground)",
                                lineHeight: "var(--leading-base)",
                              }}
                              title={outcome.name || outcome.slug || `Outcome ${idx + 1}`}
                            >
                              {outcome.name || outcome.slug || `Outcome ${idx + 1}`}
                            </div>
                            {outcome.shares && (
                              <div className="text-caption mt-0.5" style={{ color: "var(--foreground-secondary)" }}>
                                {formatVolume(outcome.shares)} Vol.
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Chance */}
                        <div className="text-center">
                          <div
                            className="text-body font-semibold"
                            style={{
                              color: "var(--foreground)",
                              lineHeight: "var(--leading-base)",
                            }}
                          >
                            {percentage}
                          </div>
                        </div>
                        {/* 24h Change */}
                        <div className="text-center">
                          {change24h ? (
                            <div
                              className="text-body font-semibold flex items-center justify-center gap-1"
                              style={{
                                color: isPositive ? "var(--color-green)" : "var(--color-red)",
                                lineHeight: "var(--leading-base)",
                              }}
                            >
                              {isPositive ? "↑" : "↓"} {Math.abs(parseFloat(change24h)).toFixed(2)}%
                            </div>
                          ) : (
                            <div className="text-caption" style={{ color: "var(--foreground-secondary)" }}>
                              —
                            </div>
                          )}
                        </div>
                        {/* Volume */}
                        <div className="text-right">
                          <div
                            className="text-body font-medium"
                            style={{
                              color: "var(--foreground)",
                              lineHeight: "var(--leading-base)",
                            }}
                          >
                            {formatVolume(outcome.shares || "0")}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right Column - Interactive Model Selector Panel */}
          <div
            className="flex flex-col border-t lg:border-t-0 lg:border-l lg:pl-4 pt-4 lg:pt-0"
            style={{
              borderColor: "var(--card-border)",
            }}
          >
            {/* Header */}
            <div className="px-0 pb-4 flex-shrink-0 border-b" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-body font-medium truncate flex-1"
                  style={{
                    color: "var(--foreground)",
                    transition: "opacity 0.2s ease",
                  }}
                  title={selectedOutcome || 'Select an outcome'}
                >
                  {selectedOutcome || 'Select an outcome'}
                </span>
                {selectedOutcomeData && (
                  <span
                    className="text-body font-semibold ml-2 flex-shrink-0"
                    style={{
                      color: "var(--color-primary)",
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {(() => {
                      const price = typeof selectedOutcomeData.price === 'number' 
                        ? selectedOutcomeData.price 
                        : parseFloat(String(selectedOutcomeData.price)) || 0;
                      // Format percentage: show decimals for small values, "<1%" for very small values
                      const percentageValue = price * 100;
                      if (percentageValue < 1) {
                        return "<1%";
                      } else if (percentageValue < 10) {
                        return percentageValue.toFixed(1) + "%";
                      } else {
                        return Math.round(percentageValue) + "%";
                      }
                    })()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-caption" style={{ color: "var(--foreground-secondary)" }}>
                  Debate focus
                </span>
                <span className="text-caption" style={{ color: "var(--foreground-secondary)" }}>•</span>
                <span className="text-caption" style={{ color: "var(--foreground-secondary)" }}>
                  {getDebateFocusLabel(market.category)}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-caption font-medium ml-auto"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-white)",
                    opacity: 0.9,
                  }}
                >
                  AI debate
                </span>
              </div>
            </div>

            {/* Selected Models Chips */}
            {selectedModels.length > 0 && (
              <div className="px-4 pt-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedModels.map((modelId) => {
                    const model = models.find(m => m.id === modelId);
                    if (!model) return null;
                    return (
                      <button
                        key={modelId}
                        onClick={() => handleModelToggle(modelId)}
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

            {/* Model Selection Section */}
            <div className="px-0 lg:pr-4 py-4 flex-shrink-0">

              {/* Character-Select Carousel with Peeking Neighbors */}
              <div 
                className="relative flex flex-col items-center"
                onWheel={(e) => {
                  e.preventDefault();
                  if (wheelTimeoutRef.current || isAnimating) return;
                  
                  const useHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
                  wheelTimeoutRef.current = setTimeout(() => {
                    wheelTimeoutRef.current = null;
                  }, 250);
                  
                  if (useHorizontal) {
                    if (e.deltaX > 0) handleNextModel();
                    else if (e.deltaX < 0) handlePreviousModel();
                  } else {
                    if (e.deltaY > 0) handleNextModel();
                    else if (e.deltaY < 0) handlePreviousModel();
                  }
                }}
              >
                {/* Carousel Container - centered with enough space for orbs and peeking neighbors */}
                <div 
                  className="relative flex items-center justify-center mb-4"
                  style={{
                    width: "100%",
                    maxWidth: "440px",
                    height: "260px",
                    margin: "0 auto",
                    overflow: "visible",
                    position: "relative",
                  }}
                >
                  {/* Left Arrow - positioned at left edge of carousel, vertically centered */}
                  <button
                    onClick={handlePreviousModel}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center transition-all duration-150 hover:opacity-70 hover:scale-110"
                    style={{ color: "var(--foreground)" }}
                    aria-label="Previous model"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Left slot: previous model */}
                  {prevModel && prevModelColorConfig && (() => {
                    const s = getSlotStyle('prev');
                    return (
                      <button
                        key={prevModel.id}
                        onClick={handlePreviousModel}
                        className="absolute left-1/2 top-1/2 cursor-pointer"
                        style={{
                          transform: `translate(-50%, -50%) translateX(${s.translateX}px) scale(${s.scale})`,
                          opacity: s.opacity,
                          zIndex: s.zIndex,
                          transition: "transform 0.3s ease, opacity 0.3s ease",
                          willChange: "transform, opacity",
                        }}
                        aria-label={`Previous: ${prevModel.name}`}
                      >
                        <Orb colorConfig={prevModelColorConfig} />
                      </button>
                    );
                  })()}

                  {/* Center slot: focused model */}
                  {focusedModel && focusedModelColorConfig && (() => {
                    const s = getSlotStyle('center');
                    return (
                      <div
                        key={focusedModel.id}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          transform: `translate(-50%, -50%) translateX(${s.translateX}px) scale(${s.scale})`,
                          opacity: s.opacity,
                          zIndex: s.zIndex,
                          transition: "transform 0.3s ease, opacity 0.3s ease",
                          willChange: "transform, opacity",
                        }}
                      >
                        <Orb colorConfig={focusedModelColorConfig} />
                      </div>
                    );
                  })()}

                  {/* Right slot: next model */}
                  {nextModel && nextModelColorConfig && (() => {
                    const s = getSlotStyle('next');
                    return (
                      <button
                        key={nextModel.id}
                        onClick={handleNextModel}
                        className="absolute left-1/2 top-1/2 cursor-pointer"
                        style={{
                          transform: `translate(-50%, -50%) translateX(${s.translateX}px) scale(${s.scale})`,
                          opacity: s.opacity,
                          zIndex: s.zIndex,
                          transition: "transform 0.3s ease, opacity 0.3s ease",
                          willChange: "transform, opacity",
                        }}
                        aria-label={`Next: ${nextModel.name}`}
                      >
                        <Orb colorConfig={nextModelColorConfig} />
                      </button>
                    );
                  })()}

                  {/* Right Arrow - positioned at right edge of carousel, vertically centered */}
                  <button
                    onClick={handleNextModel}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center transition-all duration-150 hover:opacity-70 hover:scale-110"
                    style={{ color: "var(--foreground)" }}
                    aria-label="Next model"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Model Info */}
                {focusedModel && (
                  <div 
                    key={focusedModel.id}
                    className="text-center mb-4"
                    style={{
                      opacity: isAnimating ? 0 : 1,
                      transition: "opacity 0.5s ease-in-out",
                    }}
                  >
                    <div
                      className="text-body font-semibold mb-1"
                      style={{
                        color: "var(--foreground)",
                        transition: "color 0.3s ease",
                      }}
                    >
                      {focusedModel.name}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-caption" style={{ color: "var(--foreground-secondary)" }}>
                      <span>{focusedModel.provider}</span>
                      {focusedModel.is_free && (
                        <>
                          <span>•</span>
                          <span>Free</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Add/Remove Button */}
                {focusedModel && (
                  <button
                    onClick={() => handleModelToggle(focusedModel.id)}
                    disabled={!canAddModel && !isFocusedSelected}
                    className="px-6 py-2.5 rounded-lg font-medium text-body transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isFocusedSelected ? "var(--color-red)" : "var(--color-primary)",
                      color: "var(--color-white)",
                      opacity: isAnimating ? 0 : 1,
                      transition: "opacity 0.5s ease-in-out, background-color 0.15s ease",
                    }}
                  >
                    {isFocusedSelected ? 'Remove model' : 'Add model'}
                  </button>
                )}

                {/* Max selected hint */}
                {selectedModels.length >= 4 && !isFocusedSelected && (
                  <p className="text-caption text-center mt-2" style={{ color: "var(--foreground-secondary)" }}>
                    Max 4 models selected
                  </p>
                )}
              </div>
            </div>

            {/* Rounds Selector */}
            <div className="px-0 lg:pr-4 py-4 flex-shrink-0 border-t" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="text-body font-medium mb-1" style={{ color: "var(--foreground)" }}>
                Number of rounds
              </h3>
              <p className="text-caption mb-3" style={{ color: "var(--foreground-secondary)" }}>
                More rounds = longer debate
              </p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setRounds(num)}
                    className="flex-1 py-1.5 rounded-full text-caption font-medium transition-all duration-150"
                    style={{
                      backgroundColor: rounds === num ? "var(--color-primary)" : "var(--color-charcoal)",
                      color: "var(--color-white)",
                      border: rounds === num ? `2px solid var(--color-primary)` : `1px solid var(--card-border)`,
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Footer */}
            <div className="px-0 lg:pr-4 py-4 flex-shrink-0 border-t" style={{ borderColor: "var(--card-border)" }}>
              {/* Remaining debates indicator */}
              {remainingDebates !== null && (
                <p
                  className="text-caption mb-2 text-center"
                  style={{ color: remainingDebates > 0 ? "var(--foreground-secondary)" : "var(--color-red)" }}
                >
                  {remainingDebates > 0
                    ? `${remainingDebates} debate${remainingDebates !== 1 ? 's' : ''} remaining today`
                    : 'Daily limit reached'
                  }
                </p>
              )}

              <button
                onClick={handleStartDebate}
                disabled={selectedModels.length === 0 || status === 'starting' || limitReached}
                className="w-full py-2.5 rounded-lg font-semibold text-body transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: limitReached ? "var(--foreground-secondary)" : "var(--color-primary)",
                  color: "var(--color-white)",
                }}
              >
                {status === 'starting' ? (
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    Starting...
                  </div>
                ) : limitReached ? (
                  'Daily Limit Reached'
                ) : (
                  'Start AI Debate'
                )}
              </button>

              {/* Helper Text */}
              <p className="text-caption mt-2 text-center" style={{ color: "var(--foreground-secondary)" }}>
                {limitReached
                  ? 'Resets at midnight UTC. Come back tomorrow!'
                  : 'No capital at risk — this is an AI-only simulation.'
                }
              </p>

              {/* Error Message */}
              {error && (
                <div
                  className="mt-2 p-2 rounded text-caption"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "var(--color-red)",
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

