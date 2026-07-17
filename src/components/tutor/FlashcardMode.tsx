import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

interface Flashcard {
  id: number;
  front: string;
  back: string;
}

interface FlashcardModeProps {
  cards: Flashcard[];
}

export function FlashcardMode({ cards }: FlashcardModeProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!cards || cards.length === 0) return null;

  const current = cards[index];

  const handleNext = () => {
    setFlipped(false);
    setTimeout(() => {
      setIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    setFlipped(false);
    setTimeout(() => {
      setIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/10 dark:to-purple-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 mt-3 max-w-full">
      <div className="flex items-center justify-between mb-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
        <span>FLASHCARD INDEX</span>
        <span>{index + 1} of {cards.length}</span>
      </div>

      {/* Card Wrapper */}
      <div 
        onClick={() => setFlipped(!flipped)}
        className="w-full h-44 cursor-pointer relative transition-transform duration-500 preserve-3d"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)"
        }}
      >
        {/* Front side */}
        <div className="absolute inset-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between shadow-sm backface-hidden">
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
              {current.front}
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium">
            <RotateCw className="w-3 h-3 animate-pulse" /> Click to flip
          </div>
        </div>

        {/* Back side */}
        <div 
          className="absolute inset-0 bg-indigo-600 text-white rounded-xl p-5 flex flex-col justify-between shadow-md backface-hidden"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden"
          }}
        >
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="font-semibold text-white text-sm leading-relaxed">
              {current.back}
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-indigo-200 font-medium">
            <RotateCw className="w-3 h-3" /> Click to flip
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handlePrev}
          disabled={cards.length <= 1}
          className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleNext}
          disabled={cards.length <= 1}
          className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Helper to parse flashcards from AI output string
export function parseFlashcardsFromText(text: string): Flashcard[] | null {
  const cardBlockRegex = /FLASHCARD\s*(\d+)[\s\S]*?Front:\s*([\s\S]*?)Back:\s*([\s\S]*?)(?=\nFLASHCARD|---|$)/gi;
  const cards: Flashcard[] = [];

  let match;
  cardBlockRegex.lastIndex = 0;
  while ((match = cardBlockRegex.exec(text)) !== null) {
    const id = parseInt(match[1]);
    const front = match[2].trim().replace(/^"|"$/g, '');
    const back = match[3].trim().replace(/^"|"$/g, '');
    
    if (front && back) {
      cards.push({ id, front, back });
    }
  }

  return cards.length > 0 ? cards : null;
}
