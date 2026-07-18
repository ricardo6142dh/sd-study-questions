#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const APP_DIR = process.cwd();
const COURSE_BANKS_DIR = path.join(APP_DIR, "data", "course-banks");

async function safeReadJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function listCourseDirs() {
  const entries = await fs.readdir(COURSE_BANKS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(COURSE_BANKS_DIR, entry.name))
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateMetadata(metadata, dirName) {
  assert(typeof metadata.slug === "string" && metadata.slug.length > 0, `${dirName}: missing metadata.slug`);
  assert(metadata.slug === dirName, `${dirName}: metadata.slug must match folder name`);
  assert(typeof metadata.title === "string" && metadata.title.length > 0, `${dirName}: missing metadata.title`);
  assert(typeof metadata.language === "string" && metadata.language.length > 0, `${dirName}: missing metadata.language`);
  assert(typeof metadata.provider === "string" && metadata.provider.length > 0, `${dirName}: missing metadata.provider`);
  assert(typeof metadata.instructor === "string" && metadata.instructor.length > 0, `${dirName}: missing metadata.instructor`);
  assert(typeof metadata.landingPage === "string" && metadata.landingPage.length > 0, `${dirName}: missing metadata.landingPage`);
  assert(Array.isArray(metadata.modules), `${dirName}: metadata.modules must be an array`);
}

function validateQuestion(question, dirName, index) {
  const prefix = `${dirName}: question[${index}]`;
  assert(typeof question.id === "string" && question.id.length > 0, `${prefix} missing id`);
  assert(typeof question.course === "string" && question.course.length > 0, `${prefix} missing course`);
  assert(typeof question.module_title === "string" && question.module_title.length > 0, `${prefix} missing module_title`);
  assert(typeof question.topic_title === "string" && question.topic_title.length > 0, `${prefix} missing topic_title`);
  assert(typeof question.difficulty === "string" && question.difficulty.length > 0, `${prefix} missing difficulty`);
  assert(typeof question.prompt === "string" && question.prompt.length > 0, `${prefix} missing prompt`);
  assert(Array.isArray(question.options) && question.options.length >= 2, `${prefix} must have at least two options`);
  assert(
    Number.isInteger(question.correct_option) &&
      question.correct_option >= 0 &&
      question.correct_option < question.options.length,
    `${prefix} has invalid correct_option`
  );
  assert(typeof question.explanation === "string" && question.explanation.length > 0, `${prefix} missing explanation`);
  assert(question.recommended_review && typeof question.recommended_review === "object", `${prefix} missing recommended_review`);
}

async function collectTopicBankFiles(courseDir) {
  const modulesDir = path.join(courseDir, "modules");

  if (!(await pathExists(modulesDir))) {
    return [];
  }

  const moduleEntries = await fs.readdir(modulesDir, { withFileTypes: true });
  const files = await Promise.all(
    moduleEntries
      .filter((entry) => entry.isDirectory())
      .map(async (moduleEntry) => {
        const topicsDir = path.join(modulesDir, moduleEntry.name, "topics");

        if (!(await pathExists(topicsDir))) {
          return [];
        }

        const topicEntries = await fs.readdir(topicsDir, { withFileTypes: true });
        return topicEntries
          .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
          .map((entry) => path.join(topicsDir, entry.name));
      })
  );

  return files.flat().sort((left, right) => left.localeCompare(right, "pt-BR"));
}

async function loadCourseQuestions(courseDir) {
  const legacyBankPath = path.join(courseDir, "question-bank.json");
  const legacyQuestions = (await pathExists(legacyBankPath))
    ? (await safeReadJson(legacyBankPath)).questions ?? []
    : [];
  const topicBankFiles = await collectTopicBankFiles(courseDir);
  const topicBanks = await Promise.all(topicBankFiles.map((filePath) => safeReadJson(filePath)));
  const modularQuestions = topicBanks.flatMap((bank) => bank.questions ?? []);

  return Array.from(
    new Map([...legacyQuestions, ...modularQuestions].map((question) => [question.id, question])).values()
  );
}

async function validateCourseBank(courseDir) {
  const dirName = path.basename(courseDir);
  const metadata = await safeReadJson(path.join(courseDir, "metadata.json"));
  const questions = await loadCourseQuestions(courseDir);

  validateMetadata(metadata, dirName);

  questions.forEach((question, index) => validateQuestion(question, dirName, index));

  const uniqueIds = new Set(questions.map((question) => question.id));
  assert(uniqueIds.size === questions.length, `${dirName}: duplicated question ids found`);
  assert(
    questions.every((question) => question.course === metadata.slug),
    `${dirName}: found questions pointing to another course slug`
  );

  return `${dirName}: ok (${questions.length} questão(ões))`;
}

async function main() {
  const courseDirs = await listCourseDirs();
  const results = [];

  for (const courseDir of courseDirs) {
    results.push(await validateCourseBank(courseDir));
  }

  results.forEach((line) => console.log(line));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
