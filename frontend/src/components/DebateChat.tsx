// DebateChat.tsx
"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import BlurText from "@/components/BlurText";
import { ModelOrbsRow } from "./ModelOrbsRow";

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
  debateCompleteEventReceived?: boolean; // Track if debate_complete event was received
}

export function DebateChat({
  messages,
  rounds,
  currentRound,
  models,
  isCompleted = false,
  debateCompleteEventReceived = false,
}: DebateChatProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasCompletedRef = useRef(false);
  const messagesRef = useRef(messages);
  const initializedRef = useRef(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  const [visibleMessageIds, setVisibleMessageIds] = useState<Set<string>>(new Set());
  
  // Keep messagesRef in sync with messages prop
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // If debate is completed, immediately mark all messages as visible and played
  // This handles the case where the component remounts when status changes to 'completed'
  useEffect(() => {
    if (isCompleted && messages.length > 0 && !hasCompletedRef.current) {
      // If debate is completed, ensure all messages are visible and marked as played
      const allMessageIds = new Set<string>();
      messages.forEach((msg, idx) => {
        const messageId = `${msg.model_id}-${msg.round}-${idx}`;
        allMessageIds.add(messageId);
      });
      
      console.log('Debate completed - marking all messages as visible and played');
      setVisibleMessageIds(allMessageIds);
      setPlayedIds(allMessageIds);
      hasCompletedRef.current = true;
      setPlayingMessageId(null); // Stop any playing audio
    }
  }, [isCompleted, messages]); // Re-run when isCompleted changes or messages array changes

  const activeModelId = messages.length > 0 ? messages[messages.length - 1].model_id : null;

  const speakingModelId = useMemo(() => {
    if (!playingMessageId) return null;
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = `${msg.model_id}-${msg.round}-${i}`;
      if (messageId === playingMessageId) {
        return msg.model_id;
      }
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
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", () => {});
        audioRef.current = null;
      }
      setPlayingMessageId(null);
    };
  }, []);

  // Auto-play audio when new messages arrive or when current audio ends
  // Continue processing even if debate_complete event was received - wait for all messages to be played
  useEffect(() => {
    console.log('Audio effect running:', {
      playingMessageId,
      messagesCount: messages.length,
      playedIdsCount: playedIds.size,
      visibleMessageIdsCount: visibleMessageIds.size,
      isCompleted,
      hasCompleted: hasCompletedRef.current,
      debateCompleteEventReceived
    });
    
    // Stop processing if debate is truly completed (all messages played and shown)
    if (hasCompletedRef.current) {
      console.log('Debate truly completed, skipping audio processing');
      return;
    }
    
    if (playingMessageId !== null) {
      console.log('Already playing audio, skipping');
      return; // Already playing audio, wait for it to finish
    }

    // Find first unplayed message (play in strict order by round and index)
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = `${msg.model_id}-${msg.round}-${i}`;
      
      console.log(`Checking message ${i}:`, {
        messageId,
        hasAudio: !!msg.audio_url,
        audioUrl: msg.audio_url,
        alreadyPlayed: playedIds.has(messageId),
        alreadyVisible: visibleMessageIds.has(messageId)
      });
      
      // Skip if already played
      if (playedIds.has(messageId)) {
        console.log(`Message ${i} already played, skipping`);
        continue;
      }

      // Skip if already visible (being processed)
      if (visibleMessageIds.has(messageId)) {
        console.log(`Message ${i} already visible, skipping`);
        continue;
      }

      // Check if all previous messages have been played (strict order)
      // This ensures messages appear in the exact order they're in the array
      // We only process a message if ALL previous messages are fully played
      // If a previous message is visible but not played, we wait for it to finish
      // Also check if we're transitioning between rounds - ensure all messages from previous round are done
      let allPreviousPlayed = true;
      for (let j = 0; j < i; j++) {
        const prevMsg = messages[j];
        const prevMessageId = `${prevMsg.model_id}-${prevMsg.round}-${j}`;
        
        // Previous message must be fully played (not just visible)
        // If a previous message is visible but not played, it's still being processed
        if (!playedIds.has(prevMessageId)) {
          // If it's visible, it's being processed - wait for it
          if (visibleMessageIds.has(prevMessageId)) {
            console.log(`Message ${i} waiting for previous message ${j} to finish (visible but not played)`);
            allPreviousPlayed = false;
            break;
          }
          // If it's not visible and not played, it hasn't been processed yet - wait
          console.log(`Message ${i} waiting for previous message ${j} to be processed`);
          allPreviousPlayed = false;
          break;
        }
      }

      // Only process if all previous messages are fully played
      if (!allPreviousPlayed) {
        console.log(`Message ${i} - not all previous messages played, breaking`);
        break;
      }
      
      console.log(`Processing message ${i} - making visible and playing audio if available`);
      
      // Make message visible
      setVisibleMessageIds((prev) => new Set([...prev, messageId]));
      
      // If message has audio, play it
      if (msg.audio_url) {
        console.log(`Message ${i} has audio, starting playback`);
        // Capture the current message index to check if it's the last one
        const currentMessageIndex = i;
        const totalMessagesCount = messages.length;
        
        // Set playingMessageId immediately to prevent the effect from running again
        setPlayingMessageId(messageId);
        
        // Add a small delay before loading audio to prevent rate limiting
        // This gives the server time between requests
        setTimeout(() => {
          // Convert relative URL to absolute if needed
          const audioUrl = msg.audio_url?.startsWith('http') 
            ? msg.audio_url 
            : `${API_BASE_URL}${msg.audio_url}`;
          
          console.log('Loading audio for message:', messageId, 'URL:', audioUrl);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          
          // Add error handler for audio loading
          audio.addEventListener('error', (e) => {
            console.error('Audio loading error:', e, audioUrl);
          });

          const handleEnded = () => {
            setPlayedIds((prev) => new Set([...prev, messageId]));
            setPlayingMessageId(null);
            if (audioRef.current === audio) {
              audioRef.current = null;
            }
            
            // Check if this was the last message and debate_complete was received
            if (debateCompleteEventReceived) {
              // Use a ref to check the current messages array when audio ends
              setTimeout(() => {
                const currentMessages = messagesRef.current;
                const currentIndex = currentMessages.findIndex((m, idx) => {
                  const msgId = `${m.model_id}-${m.round}-${idx}`;
                  return msgId === messageId;
                });
                const isLastMessage = currentIndex === currentMessages.length - 1;
                
                if (isLastMessage && !hasCompletedRef.current) {
                  hasCompletedRef.current = true;
                  const allMessageIds = new Set<string>();
                  currentMessages.forEach((msg, idx) => {
                    const msgId = `${msg.model_id}-${msg.round}-${idx}`;
                    allMessageIds.add(msgId);
                  });
                  setVisibleMessageIds(allMessageIds);
                  setPlayedIds((prev) => {
                    const combined = new Set(prev);
                    allMessageIds.forEach(id => combined.add(id));
                    return combined;
                  });
                  // Notify parent that debate is truly complete
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('debate-truly-complete'));
                  }
                }
              }, 300);
            }
          };

          audio.addEventListener("ended", handleEnded);

          // Add a small delay before playing to further prevent rate limiting
          setTimeout(() => {
            console.log('Attempting to play audio for message:', messageId);
            audio.play().then(() => {
              console.log('Audio playing successfully for message:', messageId);
            }).catch((err) => {
              // Log all errors for debugging
              console.error("Error playing audio:", err, 'URL:', audioUrl);
              // Silently handle autoplay errors (browser restrictions)
              if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
                console.error("Non-autoplay error playing audio:", err);
              }
              // If audio fails, wait a bit before marking as played to maintain sequence
              // This prevents messages from appearing too quickly if multiple audio files fail
              setTimeout(() => {
                setPlayedIds((prev) => new Set([...prev, messageId]));
                setPlayingMessageId(null);
                if (audioRef.current === audio) {
                  audioRef.current = null;
                }
                
                // Check if this was the last message and debate_complete was received
                if (debateCompleteEventReceived) {
                  setTimeout(() => {
                    const currentMessages = messagesRef.current;
                    const currentIndex = currentMessages.findIndex((m, idx) => {
                      const msgId = `${m.model_id}-${m.round}-${idx}`;
                      return msgId === messageId;
                    });
                    const isLastMessage = currentIndex === currentMessages.length - 1;
                    
                    if (isLastMessage && !hasCompletedRef.current) {
                      hasCompletedRef.current = true;
                      const allMessageIds = new Set<string>();
                      currentMessages.forEach((msg, idx) => {
                        const msgId = `${msg.model_id}-${msg.round}-${idx}`;
                        allMessageIds.add(msgId);
                      });
                      setVisibleMessageIds(allMessageIds);
                      setPlayedIds((prev) => {
                        const combined = new Set(prev);
                        allMessageIds.forEach(id => combined.add(id));
                        return combined;
                      });
                      // Notify parent that debate is truly complete
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('debate-truly-complete'));
                      }
                    }
                  }, 300);
                }
              }, 1000); // Wait 1 second before marking as played if audio fails
            });
          }, 200); // 200ms delay before playing
        }, 300); // 300ms delay before loading audio
        break; // Always break after processing one message
      } else {
        // Messages without audio: mark as visible, then mark as played after a short delay
        // This ensures proper visual sequencing
        console.log(`Message ${i} has no audio, marking as played after delay`);
        const currentMessageIndex = i;
        setTimeout(() => {
          setPlayedIds((prev) => new Set([...prev, messageId]));
          
          // Check if this was the last message and debate_complete was received
          if (debateCompleteEventReceived) {
            setTimeout(() => {
              const currentMessages = messagesRef.current;
              const currentIndex = currentMessages.findIndex((m, idx) => {
                const msgId = `${m.model_id}-${m.round}-${idx}`;
                return msgId === messageId;
              });
              const isLastMessage = currentIndex === currentMessages.length - 1;
              
              if (isLastMessage && !hasCompletedRef.current) {
                hasCompletedRef.current = true;
                const allMessageIds = new Set<string>();
                currentMessages.forEach((msg, idx) => {
                  const msgId = `${msg.model_id}-${msg.round}-${idx}`;
                  allMessageIds.add(msgId);
                });
                setVisibleMessageIds(allMessageIds);
                setPlayedIds((prev) => {
                  const combined = new Set(prev);
                  allMessageIds.forEach(id => combined.add(id));
                  return combined;
                });
                // Notify parent that debate is truly complete
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('debate-truly-complete'));
                }
              }
            }, 300);
          }
        }, 500); // Small delay to allow UI to update and maintain sequence
        // Break to ensure we only process one message per effect run
        break;
      }
    }
  }, [messages, playingMessageId, playedIds, visibleMessageIds, debateCompleteEventReceived, isCompleted]);

  // When debate_complete event is received, wait for all messages to be processed
  // Only show all messages when debate is actually completed AND all messages have been played
  // This effect is a fallback - the main completion logic is in the audio ended handler
  useEffect(() => {
    // Only proceed if debate_complete event was received and not already completed
    if (!debateCompleteEventReceived || hasCompletedRef.current) {
      return;
    }

    // Only run this fallback if no audio is playing and debate is marked as completed
    if (playingMessageId !== null || !isCompleted) {
      return;
    }

    // Check if all messages have been played
    const allMessagesPlayed = messages.every((msg, index) => {
      const messageId = `${msg.model_id}-${msg.round}-${index}`;
      return playedIds.has(messageId);
    });

    // If all messages are played, mark as truly completed
    if (allMessagesPlayed) {
      console.log('All messages played, marking debate as truly completed (fallback)');
      hasCompletedRef.current = true;
      const allMessageIds = new Set<string>();
      messages.forEach((msg, index) => {
        const messageId = `${msg.model_id}-${msg.round}-${index}`;
        allMessageIds.add(messageId);
      });
      setVisibleMessageIds(allMessageIds);
      setPlayedIds((prev) => {
        const combined = new Set(prev);
        allMessageIds.forEach(id => combined.add(id));
        return combined;
      });
    }
  }, [debateCompleteEventReceived, isCompleted, playingMessageId, messages, playedIds]);

  // Filter messages to only show visible ones (synchronized with audio)
  // Keep track of original indices
  const visibleMessagesWithIndices = useMemo(() => {
    return messages
      .map((msg, originalIndex) => {
        const messageId = `${msg.model_id}-${msg.round}-${originalIndex}`;
        return { msg, originalIndex, messageId, isVisible: visibleMessageIds.has(messageId) };
      })
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

  const selectedModels = useMemo(
    () =>
      models.map((m) => ({
        id: m.id,
        name: m.name,
      })),
    [models]
  );

  return (
    <div
      className="rounded-lg flex flex-col overflow-hidden"
      style={{
        maxHeight: "calc(100vh - 200px)",
      }}
    >
      <div
        className="px-6 py-4 flex-shrink-0 flex items-center justify-between"
        style={{ 
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        <div>
          <h2 className="text-h2 font-semibold text-[var(--foreground)]">
            Live debate
          </h2>
          <p className="text-xs text-[var(--foreground-secondary)] mt-1">
            Round {currentRound || 1} of {rounds}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-[var(--foreground-secondary)]">
                Debate completed
              </span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-[var(--foreground-secondary)]">
                AI models are debating…
              </span>
            </>
          )}
        </div>
      </div>

      <div 
        className="px-6 pt-4 pb-2 flex-shrink-0"
        style={{ backgroundColor: "transparent" }}
      >
        <ModelOrbsRow 
          models={selectedModels} 
          activeModelId={activeModelId}
          speakingModelId={speakingModelId}
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4"
        style={{ 
          minHeight: 0,
        }}
      >
        {Object.keys(messagesByRound).length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-12">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="text-sm text-[var(--foreground-secondary)]"
            >
              Waiting for AI models to send the first message…
            </motion.div>
          </div>
        )}

        {Object.entries(messagesByRound)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([round, roundMessages], roundIndex) => {
            const roundNum = Number(round);
            
            // Check if all messages in this round have been played
            const allRoundMessagesPlayed = roundMessages.every(({ msg, globalIndex }) => {
              const messageId = `${msg.model_id}-${msg.round}-${globalIndex}`;
              return playedIds.has(messageId);
            });
            
            // If debate is completed, all rounds are completed (show red)
            // Otherwise, show green for current round (only if not all messages played), red for completed rounds, muted for future
            const isActiveRound = !isCompleted && roundNum === currentRound && !allRoundMessagesPlayed;
            const isCompletedRound = isCompleted || (roundNum < currentRound && allRoundMessagesPlayed) || (roundNum === currentRound && allRoundMessagesPlayed);
            const isFutureRound = !isCompleted && roundNum > currentRound;
            const messageType = roundMessages[0]?.msg.message_type || '';
            const messageTypeLabel = messageType.charAt(0).toUpperCase() + messageType.slice(1);
            
            return (
            <div key={round} className="mb-6">
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--card-border)" }}></div>
                </div>
                <div className="relative flex justify-center items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${isActiveRound ? 'animate-pulse' : ''}`}
                    style={{
                      backgroundColor: isActiveRound 
                        ? '#10b981' // green
                        : isCompletedRound 
                        ? 'rgba(239, 68, 68, 0.5)' // muted red
                        : 'transparent'
                    }}
                  />
                  <span 
                    className="px-3 text-xs font-medium text-[var(--foreground-secondary)]" 
                    style={{ backgroundColor: "transparent" }}
                  >
                    Round {round} {messageType && `(${messageTypeLabel})`}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {roundMessages.map(({ msg, globalIndex }) => {
                  const messageId = `${msg.model_id}-${msg.round}-${globalIndex}`;
                  const isPlaying = playingMessageId === messageId;
                  
                  return (
                    <motion.div
                      key={messageId}
                      className="w-full rounded-lg px-4 py-3"
                      style={{
                        backgroundColor: "var(--card-bg)",
                      }}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.32, ease: "easeOut" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[var(--foreground)]">
                          {msg.model_name}
                        </span>
                        {isPlaying && (
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                      </div>

                      <BlurText
                        text={msg.text}
                        animateBy="words"
                        delay={35}
                        stepDuration={0.32}
                        direction="top"
                        className="text-sm leading-relaxed text-[var(--foreground)]"
                        threshold={0}
                        animationFrom={{
                          filter: "blur(12px)",
                          opacity: 0,
                          scale: 0.95,
                        }}
                        animationTo={[
                          {
                            filter: "blur(3px)",
                            opacity: 0.7,
                            scale: 1.03,
                          },
                          {
                            filter: "blur(0px)",
                            opacity: 1,
                            scale: 1,
                          },
                        ]}
                      />

                      {msg.predictions &&
                        Object.keys(msg.predictions).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            {Object.entries(msg.predictions).map(
                              ([outcome, pct]) => (
                                <span
                                  key={outcome}
                                  className="inline-flex items-center rounded-full px-2 py-0.5 bg-[var(--color-charcoal)] text-[var(--foreground-secondary)]"
                                >
                                  <span className="mr-1 text-[var(--foreground-secondary)]">
                                    {outcome}:
                                  </span>
                                  <span className="font-semibold text-[var(--foreground)]">
                                    {pct}%
                                  </span>
                                </span>
                              )
                            )}
                          </div>
                        )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
            );
          })}
      </div>
    </div>
  );
}
