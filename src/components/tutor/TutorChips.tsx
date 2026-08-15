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
    <div className="border-t border-rule bg-gray-50/50 p-3">
      <div className="flex items-center gap-1 mb-2 text-xs font-semibold text-graphite">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        <span>Suggested questions</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x touch-pan-x">
        {allChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onChipClick(chip)}
            className="flex-shrink-0 snap-start bg-surface hover:bg-blue-50 border border-rule/60 hover:border-blue-200 text-ink hover:text-blue-600 text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-sm"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
