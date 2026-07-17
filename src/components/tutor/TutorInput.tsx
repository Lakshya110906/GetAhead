import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";

interface InputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function TutorInput({ onSend, isStreaming, disabled = false }: InputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming || disabled) return;

    onSend(input.trim());
    setInput("");

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
      <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:border-blue-500 transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask GetAhead AI Tutor..."
          disabled={disabled}
          maxLength={4000}
          className="flex-1 max-h-40 min-h-[36px] bg-transparent border-0 outline-none focus:ring-0 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 p-2 resize-none leading-relaxed"
        />

        <div className="flex items-center gap-2 pr-1.5 pb-1">
          {input.length > 3000 && (
            <span className="text-[10px] text-gray-400 font-medium">
              {input.length}/4000
            </span>
          )}

          <button
            type="submit"
            disabled={!input.trim() || isStreaming || disabled}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              input.trim() && !isStreaming && !disabled
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm hover:scale-105"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            }`}
            title="Send message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
