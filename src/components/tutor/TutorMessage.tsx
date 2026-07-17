import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RotateCcw, User, Brain } from "lucide-react";

interface MessageProps {
  message: {
    id: string;
    role: string;
    content: string;
    createdAt: string | Date;
  };
  isLast: boolean;
  onRegenerate?: () => void;
  isStreaming?: boolean;
}

export function TutorMessageComponent({ message, isLast, onRegenerate, isStreaming }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const formatTime = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
        isUser 
          ? "bg-blue-600 text-white" 
          : "bg-gradient-to-br from-blue-500 to-teal-500 text-white"
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
      </div>

      {/* Bubble Container */}
      <div className="flex flex-col max-w-[85%]">
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser 
            ? "bg-blue-600 text-white rounded-tr-none" 
            : "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</p>
          ) : (
            <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-50 prose-pre:dark:bg-gray-950 prose-pre:border prose-pre:border-gray-100 prose-pre:dark:border-gray-800 prose-pre:p-3 prose-pre:rounded-xl break-words">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer info (Timestamp & Actions) */}
        <div className={`flex items-center gap-3 mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 ${
          isUser ? "justify-end" : "justify-start"
        }`}>
          <span>{formatTime(message.createdAt)}</span>
          
          {!isUser && message.content && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                title="Copy response"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>

              {isLast && onRegenerate && !isStreaming && (
                <button
                  onClick={onRegenerate}
                  className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3 h-3" />
                  Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
