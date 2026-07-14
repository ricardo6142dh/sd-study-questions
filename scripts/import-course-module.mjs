#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const APP_DIR = process.cwd();
const COURSE_BANKS_DIR = path.join(APP_DIR, "data", "course-banks");
const STUDY_PIPE_COURSES_DIR = path.resolve(APP_DIR, "../study_pipe/courses");

function parseArgs(argv) {
  const args = { course: "", module: "" };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--course") {
      args.course = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (value === "--module") {
      args.module = argv[index + 1] ?? "";
      index += 1;
    }
  }

  return args;
}

async function safeReadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectQuizFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectQuizFiles(absolutePath);
      }

      if (entry.isFile() && entry.name === "quiz.json") {
        return [absolutePath];
      }

      return [];
    })
  );

  return nested.flat().sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function inferCourseMetadata(course) {
  return {
    slug: course,
    title: course.replace(/_/g, " "),
    language: "pt-BR",
    provider: "Custom",
    instructor: "não informado",
    landingPage: "#",
    modules: []
  };
}

function inferModuleOrder(moduleSlug) {
  const match = moduleSlug.match(/day_(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function topicSlugFromQuizPath(filePath) {
  return path.basename(path.dirname(filePath));
}

function normalizeImportedQuestion(question, course) {
  const prompt = question.prompt ?? question.question;
  const options = Array.isArray(question.options) ? question.options : [];
  const correctOption =
    Number.isInteger(question.correct_option) && question.correct_option >= 0
      ? question.correct_option
      : options.findIndex((option) => option === question.answer);

  if (!prompt || options.length < 2 || correctOption < 0) {
    return null;
  }

  return {
    ...question,
    course,
    prompt,
    difficulty: question.difficulty ?? "medium",
    correct_option: correctOption,
    explanation:
      question.explanation ??
      (typeof question.answer === "string" && question.answer.length > 0
        ? `Gabarito: ${question.answer}`
        : "Revise este tópico para reforçar o conceito."),
    recommended_review: {
      topic_title: question.recommended_review?.topic_title ?? question.topic_title,
      why_review:
        question.recommended_review?.why_review ??
        "Reveja este tópico para consolidar o conceito.",
      ...(question.recommended_review?.topic_key
        ? { topic_key: question.recommended_review.topic_key }
        : {})
    }
  };
}

async function main() {
  const { course, module } = parseArgs(process.argv.slice(2));

  if (!course || !module) {
    throw new Error("Use: node scripts/import-course-module.mjs --course <slug> --module <slug>");
  }

  const moduleBuildDir = path.join(STUDY_PIPE_COURSES_DIR, course, "build", module);
  const metadataPath = path.join(COURSE_BANKS_DIR, course, "metadata.json");
  const questionBankPath = path.join(COURSE_BANKS_DIR, course, "question-bank.json");
  const quizFiles = await collectQuizFiles(moduleBuildDir);

  if (quizFiles.length === 0) {
    throw new Error(`No quiz.json found under ${moduleBuildDir}`);
  }

  const parsedFiles = await Promise.all(
    quizFiles.map(async (filePath) => {
      const questions = await safeReadJson(filePath);

      return {
        filePath,
        topicSlug: topicSlugFromQuizPath(filePath),
        questions
      };
    })
  );

  const flatQuestions = parsedFiles.flatMap(({ questions }) => questions);
  const firstQuestion = flatQuestions[0];

  if (!firstQuestion) {
    throw new Error(`No questions found in ${moduleBuildDir}`);
  }

  const metadata = (await pathExists(metadataPath))
    ? await safeReadJson(metadataPath)
    : inferCourseMetadata(course);

  const topicTitleBySlug = new Map();

  for (const file of parsedFiles) {
    const firstTopicQuestion = file.questions[0];
    topicTitleBySlug.set(
      file.topicSlug,
      firstTopicQuestion?.topic_title ?? file.topicSlug.replace(/_/g, " ")
    );
  }

  const importedModule = {
    slug: module,
    title: firstQuestion.module_title ?? module.replace(/_/g, " "),
    order: firstQuestion.module_order ?? inferModuleOrder(module),
    key: firstQuestion.module_key ?? module,
    topics: uniqueSorted([...topicTitleBySlug.keys()]).map((topicSlug) => ({
      slug: topicSlug,
      title: topicTitleBySlug.get(topicSlug) ?? topicSlug
    }))
  };

  const previousModules = Array.isArray(metadata.modules) ? metadata.modules : [];
  metadata.modules = [...previousModules.filter((entry) => entry.slug !== module), importedModule].sort(
    (left, right) => left.order - right.order
  );

  const existingBank = (await pathExists(questionBankPath))
    ? await safeReadJson(questionBankPath)
    : { questions: [] };

  const normalizedImportedQuestions = flatQuestions
    .map((question) => normalizeImportedQuestion(question, course))
    .filter(Boolean);

  const previousQuestions = (existingBank.questions ?? []).filter((question) => {
    return !(
      question.module_title === importedModule.title ||
      question.module_key === importedModule.key ||
      question.module_order === importedModule.order
    );
  });

  const mergedQuestions = Array.from(
    new Map(
      [...previousQuestions, ...normalizedImportedQuestions].map((question) => [
        question.id,
        question
      ])
    ).values()
  );

  const mergedFiles = uniqueSorted([
    ...((existingBank.files ?? []).filter((value) => typeof value === "string")),
    ...quizFiles.map((filePath) => path.relative(APP_DIR, filePath))
  ]);

  const nextBank = {
    ...(mergedFiles.length > 0 ? { files: mergedFiles } : {}),
    questions: mergedQuestions
  };

  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
  await fs.writeFile(questionBankPath, `${JSON.stringify(nextBank, null, 2)}\n`, "utf-8");

  console.log(
    `${course}/${module}: ${normalizedImportedQuestions.length} questão(ões) importada(s), banco total = ${mergedQuestions.length}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
