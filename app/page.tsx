import Link from "next/link";
import { loadCourseCatalog } from "@/lib/course-catalog";

export default async function HomePage() {
  const courses = await loadCourseCatalog();

  return (
    <main className="terminal-home">
      <section className="terminal-window">
        <header className="terminal-bar">
          <span className="terminal-dot red" />
          <span className="terminal-dot amber" />
          <span className="terminal-dot green" />
          <strong>study_catalog.sh</strong>
        </header>

        <div className="terminal-body">
          <p className="terminal-line">
            <span className="terminal-prompt">ricardo@study:~$</span> ls courses --verbose
          </p>
          <p className="terminal-line muted">
            catálogos detectados: {courses.length}
          </p>

          <div className="catalog-grid">
            {courses.map((course) => (
              <article key={course.slug} className="catalog-card">
                <div className="catalog-header">
                  <span className="catalog-tag">{course.provider}</span>
                </div>
                <h2>{course.title}</h2>
                <Link href={`/courses/${course.slug}`} className="catalog-link">
                  ver home do curso
                </Link>
                <p className="catalog-subtitle">Instrutor: {course.instructor}</p>
                <div className="catalog-meta">
                  <span>{course.moduleCount} módulos</span>
                  <span>{course.topicCount} tópicos</span>
                  <span>{course.questionCount} questões</span>
                </div>
                <Link href={`/courses/${course.slug}/exams`} className="terminal-button">
                  iniciar simulado
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
