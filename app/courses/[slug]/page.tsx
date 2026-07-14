import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCourseBySlug } from "@/lib/course-catalog";
import { getCourseTheme } from "@/lib/course-theme";

export default async function CoursePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await loadCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  return (
    <main className={`course-shell ${getCourseTheme(course)}`}>
      <section className="course-hero">
        <div className="course-hero-copy">
          <Link href="/" className="course-backlink">
            &larr; catálogo
          </Link>
          <span className="course-badge">{course.provider} track</span>
          <h1>{course.title}</h1>
          <p>
            Área de estudo dedicada ao treinamento, com visão por módulos, tópicos e
            simulados para revisão direcionada.
          </p>
          <div className="course-meta-inline">
            <span>Instrutor: {course.instructor}</span>
            <span>Idioma: {course.language}</span>
          </div>
          <div className="course-actions">
            <Link href={`/courses/${course.slug}/exams`} className="course-primary-button">
              montar simulado
            </Link>
            <a href={course.landingPage} className="course-secondary-button">
              ver treinamento
            </a>
          </div>
        </div>

        <aside className="course-callouts">
          <div className="callout-card">
            <strong>{course.moduleCount} módulos</strong>
            <span>conteúdo mapeado</span>
          </div>
          <div className="callout-card">
            <strong>{course.topicCount} tópicos</strong>
            <span>prontos para revisão</span>
          </div>
          <div className="callout-card">
            <strong>{course.questionCount} questões</strong>
            <span>disponíveis no banco</span>
          </div>
        </aside>
      </section>

      <section className="course-section">
        <div className="section-heading">
          <span className="course-badge">Módulos</span>
          <h2>Trilha disponível</h2>
        </div>

        <div className="module-grid">
          {course.modules.map((module) => (
            <article key={module.slug} className="module-card">
              <div className="module-topline">
                <span>Day {String(module.order).padStart(2, "0")}</span>
                <span>{module.topics.length} tópicos</span>
              </div>
              <h3>{module.title}</h3>
              <div className="module-topics">
                {module.topics.map((topic) => (
                  <span key={topic.slug} className="module-topic-pill">
                    {topic.title}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
