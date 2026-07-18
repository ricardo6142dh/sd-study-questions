import { promises as fs } from "node:fs";
import path from "node:path";
import { safeReadJson } from "@/lib/fs-utils";
import type { QuizBank, QuizQuestion } from "@/types/quiz";

const COURSE_BANKS_DIR = path.resolve(process.cwd(), "data/course-banks");

type TopicQuestionBank = {
  course?: string;
  module_slug?: string;
  topic_slug?: string;
  questions: QuizQuestion[];
};

export function courseDir(courseSlug: string) {
  return path.join(COURSE_BANKS_DIR, courseSlug);
}

export function metadataPath(courseSlug: string) {
  return path.join(courseDir(courseSlug), "metadata.json");
}

export function legacyBankPath(courseSlug: string) {
  return path.join(courseDir(courseSlug), "question-bank.json");
}

function moduleTopicDir(courseSlug: string, moduleSlug: string) {
  return path.join(courseDir(courseSlug), "modules", moduleSlug, "topics");
}

function topicBankPath(courseSlug: string, moduleSlug: string, topicSlug: string) {
  return path.join(moduleTopicDir(courseSlug, moduleSlug), `${topicSlug}.json`);
}

function questionModuleSlug(question: QuizQuestion) {
  return question.module_key || question.module_title;
}

function questionTopicSlug(question: QuizQuestion) {
  return question.topic_key || question.topic_title;
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function readTopicBank(filePath: string): Promise<QuizBank> {
  const bank = await safeReadJson<TopicQuestionBank>(filePath);
  return { questions: bank.questions ?? [] };
}

async function readModularCourseBank(courseSlug: string): Promise<QuizBank> {
  const modulesDir = path.join(courseDir(courseSlug), "modules");

  if (!(await pathExists(modulesDir))) {
    return { questions: [] };
  }

  const moduleEntries = await fs.readdir(modulesDir, { withFileTypes: true });
  const topicBanks = await Promise.all(
    moduleEntries
      .filter((entry) => entry.isDirectory())
      .map(async (moduleEntry) => {
        const topicsDir = path.join(modulesDir, moduleEntry.name, "topics");

        if (!(await pathExists(topicsDir))) {
          return { questions: [] } satisfies QuizBank;
        }

        const topicEntries = await fs.readdir(topicsDir, { withFileTypes: true });
        const banks = await Promise.all(
          topicEntries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
            .map((entry) => readTopicBank(path.join(topicsDir, entry.name)))
        );

        return {
          questions: banks.flatMap((bank) => bank.questions)
        } satisfies QuizBank;
      })
  );

  return {
    questions: topicBanks.flatMap((bank) => bank.questions)
  };
}

async function readLegacyCourseBank(courseSlug: string): Promise<QuizBank> {
  if (!(await pathExists(legacyBankPath(courseSlug)))) {
    return { questions: [] };
  }

  return safeReadJson<QuizBank>(legacyBankPath(courseSlug));
}

function dedupeQuestions(questions: QuizQuestion[]) {
  return Array.from(new Map(questions.map((question) => [question.id, question])).values());
}

export async function loadCourseBank(courseSlug: string): Promise<QuizBank> {
  const [modularBank, legacyBank] = await Promise.all([
    readModularCourseBank(courseSlug),
    readLegacyCourseBank(courseSlug)
  ]);

  return {
    questions: dedupeQuestions([...legacyBank.questions, ...modularBank.questions])
  };
}

export async function loadAllCourseBanks(): Promise<QuizBank> {
  try {
    const courseEntries = await fs.readdir(COURSE_BANKS_DIR, { withFileTypes: true });
    const banks = await Promise.all(
      courseEntries
        .filter((entry) => entry.isDirectory())
        .map((entry) => loadCourseBank(entry.name))
    );

    return {
      questions: dedupeQuestions(banks.flatMap((bank) => bank.questions))
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { questions: [] };
    }

    throw error;
  }
}

export async function writeTopicQuestions(
  courseSlug: string,
  moduleSlug: string,
  topicSlug: string,
  questions: QuizQuestion[]
) {
  const filePath = topicBankPath(courseSlug, moduleSlug, topicSlug);
  const nextBank: TopicQuestionBank = {
    course: courseSlug,
    module_slug: moduleSlug,
    topic_slug: topicSlug,
    questions
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(nextBank, null, 2)}\n`, "utf-8");
}

export async function removeQuestionFromTopic(
  courseSlug: string,
  moduleSlug: string,
  topicSlug: string,
  questionId: string
) {
  const filePath = topicBankPath(courseSlug, moduleSlug, topicSlug);

  if (!(await pathExists(filePath))) {
    return;
  }

  const bank = await readTopicBank(filePath);
  const questions = bank.questions.filter((question) => question.id !== questionId);
  await writeTopicQuestions(courseSlug, moduleSlug, topicSlug, questions);
}

export async function writeCourseBankByTopic(courseSlug: string, bank: QuizBank) {
  const groups = new Map<string, QuizQuestion[]>();

  for (const question of bank.questions) {
    const moduleSlug = questionModuleSlug(question);
    const topicSlug = questionTopicSlug(question);
    const key = `${moduleSlug}\0${topicSlug}`;
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }

  await Promise.all(
    [...groups.entries()].map(([key, questions]) => {
      const [moduleSlug, topicSlug] = key.split("\0");
      return writeTopicQuestions(courseSlug, moduleSlug, topicSlug, questions);
    })
  );
}
