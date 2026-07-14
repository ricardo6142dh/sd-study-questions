import type { CourseCatalogEntry } from "@/types/course";

export function getCourseTheme(_course: Pick<CourseCatalogEntry, "slug" | "provider">) {
  return "theme-default-course";
}
