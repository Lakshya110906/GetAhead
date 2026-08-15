import { useState } from "react";
import { CheckCircle } from "lucide-react";

interface QuizModeProps {
  question: string;
  options: { key: string; text: string }[];
  onSelect: (answerText: string) => void;
}

export function QuizMode({ question, options, onSelect }: QuizModeProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleSelect = (key: string, text: string) => {
    if (selectedKey) return; // Prevent multiple selection
    setSelectedKey(key);
    onSelect(`I select option ${key}: ${text}`);
  };

  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mt-3 max-w-full">
      <p className="font-semibold text-ink mb-4 text-sm leading-relaxed">
        {question}
      </p>
      
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedKey === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key, opt.text)}
              disabled={selectedKey !== null}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-surface border-rule text-ink hover:bg-paper"
              }`}
            >
              <span className="flex-1 leading-normal">
                <span className="font-bold mr-1.5">{opt.key})</span>
                {opt.text}
              </span>
              
              {isSelected && (
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper to parse quiz from AI output string
export function parseQuizFromText(text: string): { question: string; options: { key: string; text: string }[] } | null {
  const questionRegex = /(?:QUIZ QUESTION|QUESTION):\s*([^\n]+)/i;
  const choiceRegex = /^([A-D])\)\s*([^\n]+)/gm;

  const qMatch = text.match(questionRegex);
  if (!qMatch) return null;

  const question = qMatch[1].trim();
  const options: { key: string; text: string }[] = [];
  
  let match;
  // Reset regex lastIndex
  choiceRegex.lastIndex = 0;
  while ((match = choiceRegex.exec(text)) !== null) {
    options.push({
      key: match[1].toUpperCase(),
      text: match[2].trim()
    });
  }

  if (options.length === 0) {
    // Try lower case or dot variant like "A. choice"
    const dotRegex = /^([A-D])\.\s*([^\n]+)/gm;
    while ((match = dotRegex.exec(text)) !== null) {
      options.push({
        key: match[1].toUpperCase(),
        text: match[2].trim()
      });
    }
  }

  if (options.length >= 2) {
    return { question, options };
  }

  return null;
}
