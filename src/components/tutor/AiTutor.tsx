"use client";

import { useState, useEffect, useRef } from "react";
import { TutorPanel } from "./TutorPanel";
import { TutorChat } from "./TutorChat";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string | Date;
}

interface AiTutorProps {
  evaluationId: string;
}

export function AiTutor({ evaluationId }: AiTutorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("AI Tutor Session");
  const [isStreaming, setIsStreaming] = useState(false);
  const [breakdownCount, setBreakdownCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!evaluationId) return;

    fetch(`/api/tutor/${evaluationId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
        if (data.conversation?.title) {
          setTitle(data.conversation.title);
        }
        if (data.evaluation?.marksBreakdown) {
          // If it's stored as a string, parse it, otherwise use length
          const parsed = typeof data.evaluation.marksBreakdown === "string" 
            ? JSON.parse(data.evaluation.marksBreakdown) 
            : data.evaluation.marksBreakdown;
          setBreakdownCount(parsed.length || 0);
        }
      })
      .catch((err) => {
        console.error("Failed to load chat:", err);
        setError("Unable to load chat history. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, [evaluationId]);

  // Highlight helper for "Explain Question X" patterns
  const handleHighlightTrigger = (text: string) => {
    const match = text.match(/Explain\s+Question\s+(\d+)/i);
    if (match) {
      const questionIndex = parseInt(match[1]) - 1; // 0-indexed
      // Dispatch browser custom event
      window.dispatchEvent(
        new CustomEvent("tutor:highlight", {
          detail: { index: questionIndex },
        })
      );
    }
  };

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

    setError(null);
    setIsStreaming(true);

    // Trigger scroll-highlight if needed
    handleHighlightTrigger(messageText);

    // 1. Add user message optimistically
    const userMsg: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date(),
    };
    
    // Add temporary assistant placeholder
    const assistantMsgPlaceholder: Message = {
      id: "temp-assistant",
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsgPlaceholder]);

    // Setup streaming connection
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/tutor/${evaluationId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to start AI response stream");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Null stream reader");

      let assistantText = "";
      let tempAssistantId = "temp-assistant";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Process SSE payload format (data: {...})
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let errorMsg: string | null = null;
            try {
              const payload = JSON.parse(line.slice(6));
              
              if (payload.type === "user_message_id" && payload.id) {
                // Update optimistic user message ID
                setMessages((prev) => 
                  prev.map((m) => m.id === userMsg.id ? { ...m, id: payload.id } : m)
                );
              } else if (payload.type === "delta" && payload.text) {
                assistantText += payload.text;
                // Update assistant message with streaming content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantId
                      ? { ...m, content: assistantText }
                      : m
                  )
                );
              } else if (payload.type === "done" && payload.id) {
                // Save final assistant message ID
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantId
                      ? { ...m, id: payload.id, content: assistantText }
                      : m
                  )
                );
                tempAssistantId = payload.id;
              } else if (payload.type === "error" && payload.message) {
                errorMsg = payload.message;
              }
            } catch {
              // Ignore partial chunk parse failures
            }

            if (errorMsg) {
              throw new Error(errorMsg);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Stream aborted manually by user
        return;
      }
      
      const errMsg = err instanceof Error ? err.message : "AI evaluation response failed";
      setError(errMsg);

      // Remove temporary assistant placeholder on failure
      setMessages((prev) => prev.filter((m) => m.id !== "temp-assistant"));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      
      // Keep whatever text was generated before termination, remove placeholder if empty
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.id === "temp-assistant") {
          if (!last.content) {
            return prev.filter((m) => m.id !== "temp-assistant");
          }
          return prev.map((m) => m.id === "temp-assistant" ? { ...m, id: `aborted-${Date.now()}` } : m);
        }
        return prev;
      });
    }
  };

  const handleClear = async () => {
    if (isStreaming) handleStop();
    
    setError(null);
    try {
      const res = await fetch(`/api/tutor/${evaluationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear chat");
      setMessages([]);
    } catch {
      setError("Failed to clear chat history. Please try again.");
    }
  };

  const handleRename = async (newTitle: string) => {
    try {
      const res = await fetch(`/api/tutor/${evaluationId}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setTitle(newTitle);
    } catch {
      setError("Failed to update title. Please try again.");
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2 || isStreaming) return;
    
    // Find last user message
    const historyCopy = [...messages];
    let lastUserIndex = -1;
    for (let i = historyCopy.length - 1; i >= 0; i--) {
      if (historyCopy[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserText = historyCopy[lastUserIndex].content;

    // Slice messages to exclude the last assistant message
    setMessages(historyCopy.slice(0, lastUserIndex + 1));
    
    // Re-send user prompt
    handleSend(lastUserText);
  };

  if (loading) {
    return null; // Silent load (lazy rendering handled at parent level if needed)
  }

  return (
    <TutorPanel
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      onClearChat={handleClear}
      title={title}
      onRenameTitle={handleRename}
    >
      <TutorChat
        messages={messages}
        isStreaming={isStreaming}
        onSend={handleSend}
        onStop={handleStop}
        onRegenerate={handleRegenerate}
        breakdownCount={breakdownCount}
        error={error}
      />
    </TutorPanel>
  );
}
