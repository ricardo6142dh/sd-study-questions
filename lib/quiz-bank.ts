import { promises as fs } from "node:fs";
import path from "node:path";
import type { BuiltExam, ExamFilters, QuizBank, QuizQuestion } from "@/types/quiz";
import { safeReadJson } from "@/lib/fs-utils";

const COURSE_BANKS_DIR = path.resolve(process.cwd(), "data/course-banks");

function toArray(value: string | string[] | undefined) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeSelection(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function hashString(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function deterministicSort<T>(items: T[], seed: string, getKey: (item: T) => string) {
  return [...items].sort((left, right) => {
    const leftScore = hashString(`${seed}:${getKey(left)}`);
    const rightScore = hashString(`${seed}:${getKey(right)}`);
    return leftScore - rightScore;
  });
}

function topicKey(question: QuizQuestion) {
  return question.topic_key || question.topic_title;
}

function selectBalancedQuestions(questions: QuizQuestion[], count: number, seed: string) {
  const groupedByTopic = new Map<string, QuizQuestion[]>();

  for (const question of questions) {
    const key = topicKey(question);
    groupedByTopic.set(key, [...(groupedByTopic.get(key) ?? []), question]);
  }

  const topicBuckets = deterministicSort(
    [...groupedByTopic.entries()].map(([topic, items]) => ({
      topic,
      items: deterministicSort(items, seed, (question) => question.id)
    })),
    seed,
    (bucket) => bucket.topic
  );

  const selected: QuizQuestion[] = [];
  let round = 0;

  while (selected.length < count) {
    let addedInRound = false;

    for (const bucket of topicBuckets) {
      const question = bucket.items[round];
      if (!question) {
        continue;
      }

      selected.push(question);
      addedInRound = true;

      if (selected.length >= count) {
        break;
      }
    }

    if (!addedInRound) {
      break;
    }

    round += 1;
  }

  return selected;
}

export async function loadQuizBank(): Promise<QuizBank> {
  try {
    const courseDirs = await fs.readdir(COURSE_BANKS_DIR);
    const banks = await Promise.all(
      courseDirs.map(async (courseSlug) => {
        const courseDir = path.join(COURSE_BANKS_DIR, courseSlug);
        const stats = await fs.stat(courseDir);

        if (!stats.isDirectory()) {
          return { questions: [] } satisfies QuizBank;
        }

        return safeReadJson<QuizBank>(path.join(courseDir, "question-bank.json"));
      })
    );

    const questions = banks.flatMap((bank) => bank.questions);

    return {
      questions: Array.from(
        new Map(questions.map((question) => [question.id, question])).values()
      )
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { questions: [] };
    }

    throw error;
  }
}

export async function loadQuizBankByCourse(courseSlug: string): Promise<QuizBank> {
  try {
    const bank = await safeReadJson<QuizBank>(
      path.join(COURSE_BANKS_DIR, courseSlug, "question-bank.json")
    );

    return {
      questions: bank.questions
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { questions: [] };
    }

    throw error;
  }
}

export function parseExamFilters(searchParams: Record<string, string | string[] | undefined>): ExamFilters {
  const countValue = Number(searchParams.count);
  const seed = firstValue(searchParams.seed)?.trim();

  return {
    count: Number.isFinite(countValue) && countValue > 0 ? countValue : 10,
    modules: normalizeSelection(toArray(searchParams.module)),
    topics: normalizeSelection(toArray(searchParams.topic)),
    difficulties: normalizeSelection(toArray(searchParams.difficulty)),
    seed: seed || `${Date.now()}`
  };
}

export function buildExam(questions: QuizQuestion[], filters: ExamFilters): BuiltExam {
  const filtered = questions.filter((question) => {
    const matchesModule =
      filters.modules.length === 0 || filters.modules.includes(question.module_title);
    const matchesTopic =
      filters.topics.length === 0 || filters.topics.includes(question.topic_title);
    const matchesDifficulty =
      filters.difficulties.length === 0 || filters.difficulties.includes(question.difficulty);

    return matchesModule && matchesTopic && matchesDifficulty;
  });

  const seed = JSON.stringify(filters);
  const selectedQuestions = selectBalancedQuestions(
    filtered,
    Math.min(filters.count, filtered.length),
    seed
  );

  const filterSummaryParts = [
    filters.modules.length > 0 ? `${filters.modules.length} módulo(s)` : null,
    filters.topics.length > 0 ? `${filters.topics.length} tópico(s)` : null,
    filters.difficulties.length > 0 ? `${filters.difficulties.length} dificuldade(s)` : null
  ].filter(Boolean);

  return {
    title: selectedQuestions.length === 1 ? "Simulado focado" : "Simulado personalizado",
    filterSummary:
      filterSummaryParts.length > 0 ? filterSummaryParts.join(" • ") : "Banco completo",
    filters,
    questions: selectedQuestions
  };
}
