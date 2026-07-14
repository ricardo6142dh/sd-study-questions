export type QuizQuestion = {
  id: string;
  course: string;
  module_order?: number;
  module_key?: string;
  module_title: string;
  topic_key?: string;
  topic_title: string;
  format?: "multiple_choice" | "cloze" | "true_false";
  question_type?:
    | "definition"
    | "comprehension"
    | "recognition"
    | "application"
    | "scenario"
    | "tradeoff"
    | "cloze";
  bloom_level?: "remember" | "understand" | "apply" | "analyze";
  difficulty: "easy" | "medium" | "hard";
  concepts?: string[];
  tags?: string[];
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string;
  distractor_rationale?: string[];
  review_priority?: "low" | "medium" | "high";
  recommended_review: {
    topic_key?: string;
    topic_title: string;
    why_review: string;
    source_refs?: string[];
  };
  source_file?: string;
};

export type QuizBank = {
  files?: string[];
  questions: QuizQuestion[];
};

export type ExamFilters = {
  count: number;
  modules: string[];
  topics: string[];
  difficulties: string[];
};

export type BuiltExam = {
  title: string;
  filterSummary: string;
  filters: ExamFilters;
  questions: QuizQuestion[];
};
