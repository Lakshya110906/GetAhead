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
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30 dark:bg-gray-950/30">
      {/* Scrollable chat body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 scrollbar-thin"
      >
        {messages.length === 0 ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto select-none">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/10 mb-5 animate-pulse">
              <Brain className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2" style={{ fontFamily: "var(--font-poppins)" }}>
              AI Evaluation Tutor
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              Ask questions about this evaluation report. I know your score, strengths, weaknesses, and answer sheet.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-sm">
              <span className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-100/50 dark:border-blue-900/30">
                📄 Answers Extracted
              </span>
              <span className="text-[11px] font-semibold bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 px-2.5 py-1 rounded-full border border-teal-100/50 dark:border-teal-900/30">
                📊 Marks Calibrated
              </span>
              <span className="text-[11px] font-semibold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full border border-purple-100/50 dark:border-purple-900/30">
                🎯 Context Aware
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
              <Brain className="w-4 h-4" />
            </div>
            <div className="flex flex-col max-w-[85%]">
              <div className="rounded-2xl px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 rounded-tl-none flex items-center gap-2 shadow-sm">
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
            className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 text-xs px-3 py-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shadow-sm font-medium cursor-pointer"
          >
            <StopCircle className="w-3.5 h-3.5" />
            Stop generating
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mx-4 my-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-red-700 dark:text-red-400 leading-normal">{error}</p>
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
