// DebateChat.tsx
"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import BlurText from "@/components/BlurText";
import { ModelOrbsRow } from "./ModelOrbsRow";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getModelColorConfig, formatProb } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface DebateMessage {
  model_id: string;
  model_name: string;
  round: number;
  message_type: string;
  text: string;
  predictions?: Record<string, number>;
  audio_url?: string | null;
  message_id?: string;
}

interface SimpleModel {
  id: string;
  name: string;
}

interface DebateChatProps {
  messages: DebateMessage[];
  rounds: number;
  currentRound: number;
  models: SimpleModel[];
  isCompleted?: boolean;
  debateCompleteEventReceived?: boolean;
  hasAudio?: boolean; // Whether audio is available
  isWaitingForResponse?: boolean; // Whether we're waiting for the next response
}

export function DebateChat({
  messages,
  rounds,
  currentRound,
  models,
  isCompleted = false,
  debateCompleteEventReceived = false,
  hasAudio = true,
  isWaitingForResponse = false,
}: DebateChatProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasCompletedRef = useRef(isCompleted && messages.length > 0);
  const messagesRef = useRef(messages);
  const isMountedRef = useRef(true);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const [playedIds, setPlayedIds] = useState<Set<string>>(() => {
    if (isCompleted && messages.length > 0) {
      return new Set(messages.map((m, idx) => `${m.model_id}-${m.round}-${idx}`));
    }
    return new Set();
  });

  const previousPredictionsRef = useRef<Map<string, Record<string, number>>>(new Map());

  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(() => {
    if (isCompleted && messages.length > 0) {
      return new Set(messages.map((m, idx) => `${m.model_id}-${m.round}-${idx}`));
    }
    return new Set();
  });

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isCompleted && debateCompleteEventReceived && messages.length > 0 && !hasCompletedRef.current) {
      const timeoutId = setTimeout(() => {
        if (!isMountedRef.current) return;

        if (!hasCompletedRef.current) {
          const currentMessages = messagesRef.current;
          const allMessageIds = new Set<string>();
          currentMessages.forEach((msg, idx) => {
            const messageId = `${msg.model_id}-${msg.round}-${idx}`;
            allMessageIds.add(messageId);
          });

          setVisibleMessageIds(allMessageIds);
          setPlayedIds((prev) => {
            const combined = new Set(prev);
            allMessageIds.forEach(id => combined.add(id));
            return combined;
          });
          hasCompletedRef.current = true;
          setPlayingMessageId(null);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('debate-truly-complete'));
          }
        }
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [isCompleted, debateCompleteEventReceived, messages.length]);

  const activeModelId = messages.length > 0 ? messages[messages.length - 1].model_id : null;

  const speakingModelId = useMemo(() => {
    if (!playingMessageId) return null;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = `${msg.model_id}-${msg.round}-${i}`;
      if (messageId === playingMessageId) return msg.model_id;
    }
    return null;
  }, [playingMessageId, messages]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visibleMessageIds.size]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.src = '';
          audioRef.current.load();
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
        } catch (err) { }
        audioRef.current = null;
      }
      setPlayingMessageId(null);
    };
  }, []);

  // Fallback check for truly complete state
  useEffect(() => {
    if (debateCompleteEventReceived && !hasCompletedRef.current && playingMessageId === null) {
      // Check if all messages are visible and played
      const allDone = messages.every((m, idx) => {
        const id = `${m.model_id}-${m.round}-${idx}`;
        return playedIds.has(id);
      });

      if (allDone) {
        // Wait a tiny bit to avoid race conditions with some pending state updates
        const timeout = setTimeout(() => {
          if (!hasCompletedRef.current) {
            console.log("Triggering truly-complete from fallback check");
            hasCompletedRef.current = true;
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('debate-truly-complete'));
          }
        }, 1000);
        return () => clearTimeout(timeout);
      }
    }
  }, [debateCompleteEventReceived, messages.length, playedIds.size, playingMessageId]);

  useEffect(() => {
    if (hasCompletedRef.current || isCompleted) return;
    if (playingMessageId !== null) return;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = `${msg.model_id}-${msg.round}-${i}`;

      if (playedIds.has(messageId)) continue;
      if (visibleMessageIds.has(messageId)) continue;

      let allPreviousPlayed = true;
      for (let j = 0; j < i; j++) {
        const prevMsg = messages[j];
        const prevMessageId = `${prevMsg.model_id}-${prevMsg.round}-${j}`;
        if (!playedIds.has(prevMessageId)) {
          allPreviousPlayed = false;
          break;
        }
      }

      if (!allPreviousPlayed) break;

      setVisibleMessageIds((prev) => new Set([...prev, messageId]));

      if (msg.audio_url) {
        setPlayingMessageId(messageId);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          const audioUrl = msg.audio_url?.startsWith('http') ? msg.audio_url : `${API_BASE_URL}${msg.audio_url}`;
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          const handleEnded = () => {
            if (!isMountedRef.current) return;
            setPlayedIds((prev) => new Set([...prev, messageId]));
            setPlayingMessageId(null);
            if (audioRef.current === audio) audioRef.current = null;

            if (debateCompleteEventReceived) {
              setTimeout(() => {
                const currentMessages = messagesRef.current;
                const currentIndex = currentMessages.findIndex((m, idx) => `${m.model_id}-${m.round}-${idx}` === messageId);
                if (currentIndex === currentMessages.length - 1 && !hasCompletedRef.current) {
                  hasCompletedRef.current = true;
                  const allIds = new Set(currentMessages.map((m, idx) => `${m.model_id}-${m.round}-${idx}`));
                  setVisibleMessageIds(allIds);
                  setPlayedIds(allIds);
                  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('debate-truly-complete'));
                }
              }, 300);
            }
          };

          audio.addEventListener("ended", handleEnded);
          setTimeout(() => {
            if (!isMountedRef.current) return;
            audio.play().catch((err) => {
              if (err.name === 'NotAllowedError') setAutoplayBlocked(true);
              setTimeout(() => {
                setPlayedIds((prev) => new Set([...prev, messageId]));
                setPlayingMessageId(null);
              }, 1000);
            });
          }, 200);
        }, 300);
        break;
      } else {
        setTimeout(() => {
          setPlayedIds((prev) => new Set([...prev, messageId]));
        }, 500);
        break;
      }
    }
  }, [messages, playingMessageId, playedIds, visibleMessageIds, debateCompleteEventReceived, isCompleted]);

  const visibleMessagesWithIndices = useMemo(() => {
    return messages
      .map((msg, originalIndex) => ({
        msg,
        originalIndex,
        messageId: `${msg.model_id}-${msg.round}-${originalIndex}`,
        isVisible: visibleMessageIds.has(`${msg.model_id}-${msg.round}-${originalIndex}`)
      }))
      .filter(({ isVisible }) => isVisible);
  }, [messages, visibleMessageIds]);

  const messagesByRound = useMemo(() => {
    const grouped: Record<number, Array<{ msg: DebateMessage; globalIndex: number }>> = {};
    visibleMessagesWithIndices.forEach(({ msg, originalIndex }) => {
      if (!grouped[msg.round]) grouped[msg.round] = [];
      grouped[msg.round].push({ msg, globalIndex: originalIndex });
    });
    return grouped;
  }, [visibleMessagesWithIndices]);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-240px)]">
      {/* Header Area */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[hsla(var(--border-subtle))] bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-[hsl(var(--text-principal))]">
            Live Debate Execution
          </h2>
          <p className="text-xs text-[hsl(var(--text-secondary))] font-medium">
            Round {currentRound || 1} of {rounds}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {autoplayBlocked && !isCompleted && (
            <button
              onClick={() => setAutoplayBlocked(false)}
              className="px-3 py-1.5 bg-[hsl(var(--brand-blue))] hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Enable Audio
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsla(var(--bg-floor))] border border-[hsla(var(--border-subtle))]">
            <div className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-[hsl(var(--brand-blue))]' : 'bg-[hsl(var(--brand-green))] animate-pulse'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--text-secondary))]">
              {isCompleted ? 'Finalized' : 'Processing'}
            </span>
          </div>
        </div>
      </div>

      {/* Model Status Row & Round Indicator */}
      <div className="bg-white/40 border-b border-[hsla(var(--border-subtle))] shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative z-[9]">
        <div className="px-6 pt-1 pb-4">
          <ModelOrbsRow
            models={models}
            activeModelId={activeModelId}
            speakingModelId={speakingModelId}
            hasAudio={hasAudio}
          />
        </div>

        {/* Sub-header for the current active round phase */}
        {!isCompleted && (
          <div className="px-6 py-2 border-t border-[hsla(0,0%,0%,0.02)] bg-[hsla(var(--bg-floor),0.3)] flex items-center justify-center">
            <div className="flex items-center gap-4 w-full max-w-sm">
              <div className="h-[1px] flex-1 bg-[hsla(0,0%,0%,0.05)]" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[hsl(var(--text-secondary))] whitespace-nowrap">
                ROUND {currentRound || 1} IN PROGRESS
              </span>
              <div className="h-[1px] flex-1 bg-[hsla(0,0%,0%,0.05)]" />
            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide space-y-8"
      >
        {Object.keys(messagesByRound).length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <div className="w-12 h-12 border-2 border-[hsl(var(--brand-blue))] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Initializing model consensus...</p>
          </div>
        )}

        {Object.entries(messagesByRound)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, roundMessages]) => (
            <div key={round} className="relative">
              {/* Optional: subtle divider for historical rounds if multiple exist */}
              {Number(round) > 1 && (
                <div className="flex items-center gap-4 py-8">
                  <div className="h-[1px] flex-1 bg-[hsla(0,0%,0%,0.03)]" />
                  <span className="text-[8px] font-black text-[hsla(0,0%,0%,0.2)] uppercase tracking-[0.2em]">Next Round</span>
                  <div className="h-[1px] flex-1 bg-[hsla(0,0%,0%,0.03)]" />
                </div>
              )}

              <div className="space-y-6">

                <div className="space-y-4">
                  {roundMessages.map(({ msg, globalIndex }) => {
                    const messageId = `${msg.model_id}-${msg.round}-${globalIndex}`;
                    const isPlaying = playingMessageId === messageId;
                    const isVisible = visibleMessageIds.has(messageId);
                    const isSystem = msg.message_type === 'initial';

                    const colorConfig = getModelColorConfig(msg.model_id);
                    const borderStyle = {
                      borderLeft: `4px solid ${colorConfig.color1}`,
                      backgroundColor: `${colorConfig.color1}08`
                    };

                    return (
                      <motion.div
                        key={messageId}
                        layout
                        initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        className={`group relative p-6 rounded-xl border border-[hsla(var(--border-subtle))] ${isSystem ? 'message-system card-l2' : 'message-ai card-l1'}`}
                        style={borderStyle}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tracking-tight text-[hsl(var(--text-principal))]">
                              {msg.model_name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[hsla(var(--border-subtle))] text-[hsl(var(--text-secondary))] uppercase">
                              {msg.message_type}
                            </span>
                          </div>
                          {isPlaying && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3].map(i => (
                                <motion.div
                                  key={i}
                                  animate={{ height: [4, 12, 4] }}
                                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                  className="w-1 bg-[hsl(var(--brand-blue))] rounded-full"
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        <BlurText
                          text={msg.text}
                          delay={25}
                          stepDuration={0.2}
                          className="text-[14px] leading-relaxed text-[hsl(var(--text-principal))] font-medium"
                        />

                        {msg.predictions && Object.keys(msg.predictions).length > 0 && (
                          <div className="mt-5 pt-4 border-t border-[hsla(var(--border-subtle))]">
                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                              {Object.entries(msg.predictions).map(([outcome, pct], pIdx) => {
                                const modelKey = msg.model_id;
                                const prev = previousPredictionsRef.current.get(modelKey)?.[outcome];
                                const change = prev !== undefined ? pct - prev : 0;

                                if (!previousPredictionsRef.current.has(modelKey)) {
                                  previousPredictionsRef.current.set(modelKey, {});
                                }
                                previousPredictionsRef.current.get(modelKey)![outcome] = pct;

                                return (
                                  <motion.div
                                    key={outcome}
                                    initial={{ opacity: 0 }}
                                    animate={isVisible ? { opacity: 1 } : {}}
                                    transition={{ delay: 0.4 + pIdx * 0.1 }}
                                    className="flex flex-col"
                                  >
                                    <span className="text-[10px] font-bold text-[hsl(var(--text-secondary))] uppercase tracking-wider mb-0.5">
                                      {outcome}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-base font-bold tabular-nums">
                                        {formatProb(pct)}%
                                      </span>
                                      {prev !== undefined && change !== 0 && (
                                        <span className={`text-[10px] font-bold ${change > 0 ? 'text-[hsl(var(--brand-green))]' : 'text-[hsl(var(--brand-red))]'}`}>
                                          {change > 0 ? '↑' : '↓'}{formatProb(Math.abs(change))}%
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator when waiting for next response */}
          {isWaitingForResponse && !isCompleted && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner size="md" />
                <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                  Waiting for AI response...
                </p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
