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

function slugFallback(value) {
  return String(value || "unclassified")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findModule(metadata, question) {
  return metadata.modules.find((module) => {
    return (
      module.slug === question.module_key ||
      module.key === question.module_key ||
      module.title === question.module_title
    );
  });
}

function findTopic(module, question) {
  return module?.topics.find((topic) => {
    return topic.slug === question.topic_key || topic.title === question.topic_title;
  });
}

function targetSlugs(metadata, question) {
  const module = findModule(metadata, question);
  const topic = findTopic(module, question);

  return {
    moduleSlug: module?.slug ?? slugFallback(question.module_key || question.module_title),
    topicSlug: topic?.slug ?? slugFallback(question.topic_key || question.topic_title)
  };
}

async function splitCourseBank(courseDir) {
  const courseSlug = path.basename(courseDir);
  const bankPath = path.join(courseDir, "question-bank.json");

  if (!(await pathExists(bankPath))) {
    return `${courseSlug}: sem question-bank.json legado`;
  }

  const metadata = await safeReadJson(path.join(courseDir, "metadata.json"));
  const bank = await safeReadJson(bankPath);
  const groups = new Map();

  for (const question of bank.questions ?? []) {
    const { moduleSlug, topicSlug } = targetSlugs(metadata, question);
    const key = `${moduleSlug}\0${topicSlug}`;
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }

  for (const [key, questions] of groups.entries()) {
    const [moduleSlug, topicSlug] = key.split("\0");
    const filePath = path.join(courseDir, "modules", moduleSlug, "topics", `${topicSlug}.json`);
    const topicBank = {
      course: courseSlug,
      module_slug: moduleSlug,
      topic_slug: topicSlug,
      questions
    };

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(topicBank, null, 2)}\n`, "utf-8");
  }

  return `${courseSlug}: ${bank.questions?.length ?? 0} questão(ões) em ${groups.size} arquivo(s)`;
}

async function main() {
  const courseDirs = await listCourseDirs();
  const results = [];

  for (const courseDir of courseDirs) {
    results.push(await splitCourseBank(courseDir));
  }

  results.forEach((line) => console.log(line));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
