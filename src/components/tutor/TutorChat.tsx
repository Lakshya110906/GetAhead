import React, { useRef, useEffect } from "react";
import { TutorMessageComponent } from "./TutorMessage";
import { TutorChips } from "./TutorChips";
import { TutorInput } from "./TutorInput";
import { parseQuizFromText, QuizMode } from "./QuizMode";
import { parseFlashcardsFromText, FlashcardMode } from "./FlashcardMode";
import { Brain, AlertCircle, StopCircle } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string | Date;
}

interface ChatProps {
  messages: Message[];
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  breakdownCount?: number;
  error: string | null;
}

export function TutorChat({
  messages,
  isStreaming,
  onSend,
  onStop,
  onRegenerate,
  breakdownCount = 0,
  error,
}: ChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30">
      {/* Scrollable chat body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin"
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-fixed-ink flex items-center justify-center text-white shadow-md mb-5">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-ink text-lg mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Ask about this report
            </h3>
            <p className="text-sm text-graphite max-w-xs leading-relaxed">
              I can see your score, your marked answers, and where you lost marks — ask me anything about this evaluation.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-sm">
              <span className="text-[11px] font-semibold text-graphite px-2.5 py-1 rounded-full border border-rule">
                Reads your answers
              </span>
              <span className="text-[11px] font-semibold text-graphite px-2.5 py-1 rounded-full border border-rule">
                Knows your marks
              </span>
            </div>
          </div>
        ) : (
          /* Conversation messages */
          <div>
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              const isAssistant = msg.role === "assistant";
              
              // Custom rendering if flashcards or quizzes are detected in assistant message
              const quiz = isAssistant ? parseQuizFromText(msg.content) : null;
              const flashcards = isAssistant ? parseFlashcardsFromText(msg.content) : null;

              return (
                <div key={msg.id || idx}>
                  <TutorMessageComponent
                    message={msg}
                    isLast={isLast}
                    onRegenerate={onRegenerate}
                    isStreaming={isStreaming}
                  />
                  
                  {/* Interactive modules */}
                  {quiz && (
                    <QuizMode
                      question={quiz.question}
                      options={quiz.options}
                      onSelect={onSend}
                    />
                  )}
                  
                  {flashcards && (
                    <FlashcardMode cards={flashcards} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-ink text-paper flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex flex-col max-w-[85%]">
              <div className="rounded-2xl px-4 py-3 text-sm bg-surface border border-rule text-graphite rounded-tl-none flex items-center gap-2 shadow-sm">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stop Streaming Button */}
      {isStreaming && (
        <div className="flex justify-center pb-2 select-none">
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 text-xs px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors shadow-sm font-medium cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5" />
            Stop generating
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mx-4 my-2 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-red-700 leading-normal">{error}</p>
          </div>
        </div>
      )}

      {/* Suggested actions prompt chips */}
      <TutorChips 
        onChipClick={onSend}
        breakdownCount={breakdownCount}
      />

      {/* Input container */}
      <TutorInput 
        onSend={onSend}
        isStreaming={isStreaming}
      />
    </div>
  );
}
