import { notFound, redirect } from "next/navigation";
import { EditorClient } from "@/app/editor/editor-client";
import { loadEditorCourse, loadEditorCourses } from "@/lib/question-editor";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EditorPage(props: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [courses, rawSearchParams] = await Promise.all([
    loadEditorCourses(),
    props.searchParams
  ]);

  if (courses.length === 0) {
    return (
      <main className="editor-shell">
        <section className="terminal-window editor-empty">
          <div className="terminal-bar">
            <strong>question_editor.local</strong>
          </div>
          <div className="terminal-body">
            <p>Nenhum curso encontrado em `data/course-banks`.</p>
          </div>
        </section>
      </main>
    );
  }

  const selectedCourseSlug = firstValue(rawSearchParams.course) || courses[0].slug;
  const selectedQuestionId = firstValue(rawSearchParams.question) || null;
  const selectedModuleFilter = firstValue(rawSearchParams.module) || null;
  const selectedTopicFilter = firstValue(rawSearchParams.topic) || null;
  const course = await loadEditorCourse(selectedCourseSlug);

  if (!course) {
    redirect(`/editor?course=${courses[0].slug}`);
  }

  return (
    <EditorClient
      courses={courses}
      course={course}
      initialQuestionId={selectedQuestionId}
      initialModuleFilter={selectedModuleFilter}
      initialTopicFilter={selectedTopicFilter}
    />
  );
}
