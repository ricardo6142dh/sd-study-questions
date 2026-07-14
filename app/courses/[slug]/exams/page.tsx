import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamConfigForm } from "@/components/exam-config-form";
import { loadCourseBySlug } from "@/lib/course-catalog";
import { getCourseTheme } from "@/lib/course-theme";
import { loadQuizBankByCourse } from "@/lib/quiz-bank";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((left, right) =>
    left.localeCompare(right, "pt-BR")
  );
}

export default async function CourseExamsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, bank] = await Promise.all([loadCourseBySlug(slug), loadQuizBankByCourse(slug)]);

  if (!course) {
    notFound();
  }

  const modules = uniqueSorted(bank.questions.map((question) => question.module_title));
  const topics = uniqueSorted(bank.questions.map((question) => question.topic_title));
  const moduleTopics = modules.map((module) => ({
    module,
    topics: uniqueSorted(
      bank.questions
        .filter((question) => question.module_title === module)
        .map((question) => question.topic_title)
    )
  }));

  return (
    <main className={`course-shell ${getCourseTheme(course)}`}>
      <section className="course-config-header">
        <div>
          <Link href="/" className="course-backlink">
            &larr; voltar para home
          </Link>
          <h1>{course.title}</h1>
          <p>Configure o simulado escolhendo quantidade, módulos e tópicos.</p>
        </div>
      </section>

      <div className="terminal-window course-terminal-window">
        <div className="terminal-bar">
          <span className="terminal-dot red" />
          <span className="terminal-dot amber" />
          <span className="terminal-dot green" />
          <strong>simulado.conf</strong>
        </div>

        <ExamConfigForm
          action={`/courses/${course.slug}/exams/start`}
          modules={modules}
          moduleTopics={moduleTopics}
          topicCount={topics.length}
          questions={bank.questions}
        />
      </div>
    </main>
  );
}
