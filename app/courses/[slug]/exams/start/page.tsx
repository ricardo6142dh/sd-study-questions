import { notFound } from "next/navigation";
import { ExamRunner } from "@/components/exam-runner";
import { loadCourseBySlug } from "@/lib/course-catalog";
import { buildExam, loadQuizBankByCourse, parseExamFilters } from "@/lib/quiz-bank";

type SearchParamValue = string | string[] | undefined;
type SearchParams = Promise<Record<string, SearchParamValue>>;

export default async function CourseExamStartPage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams: SearchParams;
  }
) {
  const [{ slug }, rawSearchParams] = await Promise.all([props.params, props.searchParams]);
  const [course, bank] = await Promise.all([loadCourseBySlug(slug), loadQuizBankByCourse(slug)]);

  if (!course) {
    notFound();
  }

  const exam = buildExam(bank.questions, parseExamFilters(rawSearchParams));

  return <ExamRunner exam={exam} course={course} />;
}
