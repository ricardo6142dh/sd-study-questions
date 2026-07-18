import { promises as fs } from "node:fs";
import path from "node:path";
import { safeReadJson } from "@/lib/fs-utils";
import {
  loadCourseBank,
  metadataPath,
  removeQuestionFromTopic,
  writeTopicQuestions
} from "@/lib/course-bank-storage";
import type { CourseCatalogMetadata } from "@/types/course";
import type { QuizQuestion } from "@/types/quiz";

const COURSE_BANKS_DIR = path.resolve(process.cwd(), "data/course-banks");

export type EditorCourseSummary = {
  slug: string;
  title: string;
};

export type EditorCourseData = {
  slug: string;
  title: string;
  modules: CourseCatalogMetadata["modules"];
  questions: QuizQuestion[];
};

export type UpsertQuestionInput = {
  courseSlug: string;
  questionId?: string;
  moduleSlug: string;
  topicSlug: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
  reviewWhy: string;
  difficulty?: QuizQuestion["difficulty"];
};

function trimLines(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function buildAnswer(options: string[], correctOption: number) {
  return options[correctOption] ?? "";
}

function nextQuestionId(courseSlug: string, moduleKey: string, topicSlug: string, questions: QuizQuestion[]) {
  const prefix = `${courseSlug}-${moduleKey}-${topicSlug}-q`;
  const currentMax = questions.reduce((max, question) => {
    if (!question.id.startsWith(prefix)) {
      return max;
    }

    const suffix = Number(question.id.slice(prefix.length));
    if (!Number.isFinite(suffix)) {
      return max;
    }

    return Math.max(max, suffix);
  }, 0);

  return `${prefix}${String(currentMax + 1).padStart(3, "0")}`;
}

async function loadCourseMetadata(courseSlug: string) {
  return safeReadJson<CourseCatalogMetadata>(metadataPath(courseSlug));
}

export async function loadEditorCourses(): Promise<EditorCourseSummary[]> {
  const dirEntries = await fs.readdir(COURSE_BANKS_DIR);
  const courses = await Promise.all(
    dirEntries.map(async (courseSlug) => {
      const courseDir = path.join(COURSE_BANKS_DIR, courseSlug);
      const stats = await fs.stat(courseDir);

      if (!stats.isDirectory()) {
        return null;
      }

      const metadata = await loadCourseMetadata(courseSlug);
      return { slug: metadata.slug, title: metadata.title } satisfies EditorCourseSummary;
    })
  );

  return courses
    .filter((course): course is EditorCourseSummary => course !== null)
    .sort((left, right) => left.title.localeCompare(right.title, "pt-BR"));
}

export async function loadEditorCourse(courseSlug: string): Promise<EditorCourseData | null> {
  try {
    const [metadata, bank] = await Promise.all([
      loadCourseMetadata(courseSlug),
      loadCourseBank(courseSlug)
    ]);

    return {
      slug: metadata.slug,
      title: metadata.title,
      modules: metadata.modules,
      questions: bank.questions
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function upsertQuestion(input: UpsertQuestionInput) {
  const [metadata, bank] = await Promise.all([
    loadCourseMetadata(input.courseSlug),
    loadCourseBank(input.courseSlug)
  ]);

  const module = metadata.modules.find((entry) => entry.slug === input.moduleSlug);
  if (!module) {
    throw new Error("Módulo inválido.");
  }

  const topic = module.topics.find((entry) => entry.slug === input.topicSlug);
  if (!topic) {
    throw new Error("Tópico inválido.");
  }

  const options = trimLines(input.options);
  if (options.length < 2) {
    throw new Error("A questão precisa ter pelo menos 2 opções.");
  }

  if (input.correctOption < 0 || input.correctOption >= options.length) {
    throw new Error("A opção correta está fora do intervalo.");
  }

  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("O enunciado não pode ficar vazio.");
  }

  const explanation = input.explanation.trim();
  const reviewWhy = input.reviewWhy.trim() || "Reveja este tópico para consolidar o conceito.";
  const answer = buildAnswer(options, input.correctOption);
  const existingIndex = input.questionId
    ? bank.questions.findIndex((question) => question.id === input.questionId)
    : -1;
  const existingQuestion = existingIndex >= 0 ? bank.questions[existingIndex] : null;
  const questionId =
    existingQuestion?.id ||
    nextQuestionId(input.courseSlug, module.key || module.slug, topic.slug, bank.questions);

  const nextQuestion: QuizQuestion & { answer?: string; question?: string } = {
    ...(existingQuestion ?? {}),
    id: questionId,
    course: input.courseSlug,
    module_order: module.order,
    module_key: module.key || module.slug,
    module_title: module.title,
    topic_key: topic.slug,
    topic_title: topic.title,
    format: "multiple_choice",
    prompt,
    question: prompt,
    options,
    correct_option: input.correctOption,
    answer,
    difficulty: input.difficulty ?? existingQuestion?.difficulty ?? "medium",
    explanation,
    recommended_review: {
      ...(existingQuestion?.recommended_review ?? {}),
      topic_key: topic.slug,
      topic_title: topic.title,
      why_review: reviewWhy
    }
  };

  if (existingIndex >= 0) {
    bank.questions[existingIndex] = nextQuestion;
  } else {
    bank.questions.push(nextQuestion);
  }

  const topicQuestions = bank.questions.filter((question) => {
    return (
      (question.module_key || question.module_title) === (module.key || module.slug) &&
      (question.topic_key || question.topic_title) === topic.slug
    );
  });

  const previousModule = existingQuestion
    ? metadata.modules.find((entry) => {
        return (
          entry.slug === existingQuestion.module_key ||
          entry.key === existingQuestion.module_key ||
          entry.title === existingQuestion.module_title
        );
      })
    : null;
  const previousTopic = previousModule
    ? previousModule.topics.find((entry) => {
        return entry.slug === existingQuestion?.topic_key || entry.title === existingQuestion?.topic_title;
      })
    : null;

  if (
    existingQuestion &&
    previousModule &&
    previousTopic &&
    (previousModule.slug !== module.slug || previousTopic.slug !== topic.slug)
  ) {
    await removeQuestionFromTopic(
      input.courseSlug,
      previousModule.slug,
      previousTopic.slug,
      existingQuestion.id
    );
  }

  await writeTopicQuestions(input.courseSlug, module.slug, topic.slug, topicQuestions);

  return {
    questionId,
    created: existingIndex === -1
  };
}
