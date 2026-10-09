import type { Language, Level } from "./curriculum";

/** A future assessment provider must return real feedback and identify its source. */
export type WritingDimension = "correctness" | "naturalness" | "vocabulary" | "sentenceStructure" | "clarity" | "nativeAlternative";
export type ExpressionQuality = "incorrect" | "correctUnnatural" | "natural" | "advanced";
export type WritingCorrection = {
  dimension: WritingDimension;
  original: string;
  improvement: string;
  quality: ExpressionQuality;
  explanation: string;
  priority: "main" | "detail";
};
export type WritingFeedback = {
  source: "teacher" | "assessmentProvider";
  assessedAt: number;
  corrections: WritingCorrection[];
};
export interface WritingAssessmentProvider {
  assess(input: { language: Language; level: Level; prompt: string; draft: string }, signal?: AbortSignal): Promise<WritingFeedback>;
}
// No assessment provider is configured. The current UI offers self-review and
// labelled educational examples; these must never be presented as draft analysis.
