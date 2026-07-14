import { promises as fs } from "node:fs";
import path from "node:path";
import type { CourseCatalogEntry, CourseCatalogMetadata } from "@/types/course";
import { loadQuizBankByCourse } from "@/lib/quiz-bank";
import { safeReadJson } from "@/lib/fs-utils";

const COURSE_BANKS_DIR = path.resolve(process.cwd(), "data/course-banks");

function countTopics(modules: CourseCatalogMetadata["modules"]) {
  return modules.reduce((total, module) => total + module.topics.length, 0);
}

export async function loadCourseCatalog(): Promise<CourseCatalogEntry[]> {
  try {
    const courseDirs = await fs.readdir(COURSE_BANKS_DIR);
    const entries = await Promise.all(
      courseDirs.map(async (courseSlug) => {
        const metadataFile = path.join(COURSE_BANKS_DIR, courseSlug, "metadata.json");
        const stats = await fs.stat(path.join(COURSE_BANKS_DIR, courseSlug));

        if (!stats.isDirectory()) {
          return null;
        }

        const [metadata, bank] = await Promise.all([
          safeReadJson<CourseCatalogMetadata>(metadataFile),
          loadQuizBankByCourse(courseSlug)
        ]);

        return {
          ...metadata,
          yearLabel: "não informado",
          questionCount: bank.questions.length,
          moduleCount: metadata.modules.length,
          topicCount: countTopics(metadata.modules)
        } satisfies CourseCatalogEntry;
      })
    );

    return entries
      .filter((entry): entry is CourseCatalogEntry => entry !== null)
      .sort((left, right) => left.title.localeCompare(right.title, "pt-BR"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function loadCourseBySlug(courseSlug: string) {
  const catalog = await loadCourseCatalog();
  return catalog.find((course) => course.slug === courseSlug) ?? null;
}
