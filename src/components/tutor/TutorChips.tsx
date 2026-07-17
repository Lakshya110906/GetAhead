import { Sparkles } from "lucide-react";

interface ChipsProps {
  onChipClick: (prompt: string) => void;
  breakdownCount?: number;
}

export function TutorChips({ onChipClick, breakdownCount = 0 }: ChipsProps) {
  // Static prompt templates
  const generalChips = [
    "Why did I lose marks?",
    "Explain like I'm 10 years old",
    "Give another example",
    "Give me 5 similar questions",
    "Ask me a quiz",
    "Summarize my weak areas",
    "Create flashcards",
    "Create revision notes",
    "Give me a study plan",
    "How can I score full marks?",
    "Which concepts should I revise first?",
    "What mistakes am I repeating?",
  ];

  // Dynamic question chips
  const questionChips: string[] = [];
  for (let i = 1; i <= Math.min(breakdownCount, 8); i++) {
    questionChips.push(`Explain Question ${i}`);
  }

  // Combine them with question explanation first as it's highly specific
  const allChips = [...questionChips, ...generalChips];

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-3">
      <div className="flex items-center gap-1 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        <span>Smart Suggested Actions</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x touch-pan-x">
        {allChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onChipClick(chip)}
            className="flex-shrink-0 snap-start bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200/60 dark:border-gray-700/60 hover:border-blue-200 dark:hover:border-blue-800 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
