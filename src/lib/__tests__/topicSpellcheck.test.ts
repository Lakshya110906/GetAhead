import { describe, it, expect } from "vitest";
import { suggestTopicCorrection } from "@/lib/topicSpellcheck";

// Regression coverage for the real, confirmed-live incident: topic
// "trignometry and geometry" (missing the "o") burned 5 Gemini calls across
// 3 identical repair attempts because the model spelled it correctly and
// the old validator never matched. This module is the input-time half of
// the fix — catch it before generation starts.
describe("suggestTopicCorrection", () => {
  it("suggests 'trigonometry' for the real typo that caused the incident", () => {
    const result = suggestTopicCorrection("trignometry and geometry");
    expect(result).not.toBeNull();
    expect(result!.suggestion).toBe("trigonometry and geometry");
    expect(result!.correctedWords).toEqual([{ from: "trignometry", to: "trigonometry" }]);
  });

  it("returns null for an already-correct topic (nothing to suggest)", () => {
    expect(suggestTopicCorrection("trigonometry and geometry")).toBeNull();
  });

  it("returns null for a topic outside the known vocabulary — must not block arbitrary legitimate topics", () => {
    expect(suggestTopicCorrection("the mughal empire's administrative reforms")).toBeNull();
    expect(suggestTopicCorrection("photosynthesis in c4 plants")).toBeNull();
  });

  it("does not fire on a real topic word with no close vocabulary neighbor", () => {
    const result = suggestTopicCorrection("astronomy");
    expect(result).toBeNull();
  });

  it("does not flag an already-known vocabulary word even if it's a substring match risk", () => {
    expect(suggestTopicCorrection("algebra")).toBeNull();
    expect(suggestTopicCorrection("calculus")).toBeNull();
  });
});
