"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatModuleLabel, formatTopicLabel } from "@/lib/display-label";
import type { EditorCourseData, EditorCourseSummary } from "@/lib/question-editor";
import type { QuizQuestion } from "@/types/quiz";

type EditorClientProps = {
  courses: EditorCourseSummary[];
  course: EditorCourseData;
  initialQuestionId?: string | null;
  initialModuleFilter?: string | null;
  initialTopicFilter?: string | null;
};

type EditorFormState = {
  questionId?: string;
  moduleSlug: string;
  topicSlug: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
  reviewWhy: string;
};

function ensureEditorOptions(options: string[]) {
  const normalized = options.length > 0 ? options : ["", "", "", ""];
  return normalized.length >= 2 ? normalized : [...normalized, ""];
}

function buildFormState(course: EditorCourseData, question?: QuizQuestion): EditorFormState {
  const firstModule = course.modules[0];
  const firstTopic = firstModule?.topics[0];

  if (question) {
    const matchedModule =
      course.modules.find((module) => module.title === question.module_title) ?? firstModule;
    const matchedTopic =
      matchedModule?.topics.find(
        (topic) =>
          topic.slug === question.topic_key || topic.title === question.topic_title
      ) ?? matchedModule?.topics[0] ?? firstTopic;

    return {
      questionId: question.id,
      moduleSlug: matchedModule?.slug || "",
      topicSlug: matchedTopic?.slug || "",
      prompt: question.prompt,
      options: ensureEditorOptions(question.options),
      correctOption: question.correct_option,
      explanation: question.explanation,
      reviewWhy: question.recommended_review?.why_review || ""
    };
  }

  return {
    moduleSlug: firstModule?.slug || "",
    topicSlug: firstTopic?.slug || "",
    prompt: "",
    options: ["", "", "", ""],
    correctOption: 0,
    explanation: "",
    reviewWhy: ""
  };
}

export function EditorClient({
  courses,
  course,
  initialQuestionId,
  initialModuleFilter,
  initialTopicFilter
}: EditorClientProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialQuestionId ?? course.questions[0]?.id ?? null
  );
  const [isCreating, setIsCreating] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>(initialModuleFilter ?? "all");
  const [topicFilter, setTopicFilter] = useState<string>(initialTopicFilter ?? "all");
  const [formState, setFormState] = useState<EditorFormState>(() =>
    buildFormState(course, course.questions[0])
  );
  const [feedback, setFeedback] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const selectedQuestion = useMemo(
    () => course.questions.find((question) => question.id === selectedQuestionId) ?? null,
    [course.questions, selectedQuestionId]
  );

  const moduleOptions = course.modules;
  const selectedModule = moduleOptions.find((module) => module.slug === formState.moduleSlug) ?? moduleOptions[0];
  const topicOptions = selectedModule?.topics ?? [];
  const filterModules = course.modules.filter(
    (module) => moduleFilter === "all" || module.slug === moduleFilter
  );
  const filterTopicOptions = filterModules.flatMap((module) =>
    module.topics.map((topic) => ({
      moduleSlug: module.slug,
      topicSlug: topic.slug,
      topicTitle: topic.title
    }))
  );

  useEffect(() => {
    if (topicFilter === "all") {
      return;
    }

    const topicStillVisible = filterTopicOptions.some((topic) => topic.topicSlug === topicFilter);
    if (!topicStillVisible) {
      setTopicFilter("all");
    }
  }, [filterTopicOptions, topicFilter]);

  const filteredQuestions = useMemo(() => {
    return course.questions.filter((question) => {
      const selectedFilterModule =
        moduleFilter === "all"
          ? null
          : moduleOptions.find((module) => module.slug === moduleFilter);
      const selectedFilterTopic =
        topicFilter === "all"
          ? null
          : filterTopicOptions.find((topic) => topic.topicSlug === topicFilter);

      const matchesModule =
        !selectedFilterModule || question.module_title === selectedFilterModule.title;
      const matchesTopic =
        !selectedFilterTopic ||
        question.topic_key === selectedFilterTopic.topicSlug ||
        question.topic_title === selectedFilterTopic.topicTitle;

      return matchesModule && matchesTopic;
    });
  }, [course.questions, filterTopicOptions, moduleFilter, moduleOptions, topicFilter]);

  useEffect(() => {
    if (isCreating) {
      setFormState(buildFormState(course));
      return;
    }

    if (selectedQuestion) {
      setFormState(buildFormState(course, selectedQuestion));
    }
  }, [course, isCreating, selectedQuestion]);

  function updateForm<K extends keyof EditorFormState>(key: K, value: EditorFormState[K]) {
    setFormState((current) => ({ ...current, [key]: value }));
  }

  function handleModuleChange(nextModuleSlug: string) {
    const nextModule = course.modules.find((module) => module.slug === nextModuleSlug);
    updateForm("moduleSlug", nextModuleSlug);
    updateForm("topicSlug", nextModule?.topics[0]?.slug || "");
  }

  function updateOption(index: number, value: string) {
    setFormState((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      )
    }));
  }

  function addOption() {
    setFormState((current) => ({
      ...current,
      options: [...current.options, ""]
    }));
  }

  function removeOption(index: number) {
    setFormState((current) => {
      if (current.options.length <= 2) {
        return current;
      }

      const nextOptions = current.options.filter((_, optionIndex) => optionIndex !== index);
      const nextCorrectOption =
        current.correctOption > index
          ? current.correctOption - 1
          : Math.min(current.correctOption, nextOptions.length - 1);

      return {
        ...current,
        options: nextOptions,
        correctOption: nextCorrectOption
      };
    });
  }

  async function saveQuestion() {
    setFeedback("");
    setError("");

    const options = formState.options
      .map((value) => value.trim())
      .filter(Boolean);

    const response = await fetch("/api/editor/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        courseSlug: course.slug,
        questionId: isCreating ? undefined : formState.questionId,
        moduleSlug: formState.moduleSlug,
        topicSlug: formState.topicSlug,
        prompt: formState.prompt,
        options,
        correctOption: formState.correctOption,
        explanation: formState.explanation,
        reviewWhy: formState.reviewWhy
      })
    });

    const payload = (await response.json()) as { error?: string; questionId?: string; created?: boolean };
    if (!response.ok) {
      throw new Error(payload.error || "Não foi possível salvar.");
    }

    setFeedback(payload.created ? "Questão criada com sucesso." : "Questão atualizada com sucesso.");
    const params = new URLSearchParams({
      course: course.slug,
      question: payload.questionId || ""
    });

    if (moduleFilter !== "all") {
      params.set("module", moduleFilter);
    }

    if (topicFilter !== "all") {
      params.set("topic", topicFilter);
    }

    window.location.href = `/editor?${params.toString()}`;
  }

  return (
    <main className="editor-shell">
      <section className="editor-header terminal-window">
        <div className="terminal-bar">
          <span className="terminal-dot red" />
          <span className="terminal-dot amber" />
          <span className="terminal-dot green" />
          <strong>question_editor.local</strong>
        </div>
        <div className="terminal-body editor-toolbar">
          <div className="editor-toolbar-actions">
            <button
              type="button"
              className="terminal-button"
              onClick={() => {
                setIsCreating(true);
                setSelectedQuestionId(null);
              }}
            >
              nova questão
            </button>
          </div>
        </div>
      </section>

      <section className="editor-grid">
        <aside className="terminal-window editor-sidebar">
          <div className="terminal-bar">
            <strong>banco: {course.slug}</strong>
          </div>
          <div className="terminal-body editor-sidebar-body">
            <div className="editor-filter-grid">
              <label className="editor-label" htmlFor="editor-course-select">
                Curso
                <select
                  id="editor-course-select"
                  value={course.slug}
                  onChange={(event) => {
                    window.location.href = `/editor?course=${event.target.value}`;
                  }}
                >
                  {courses.map((entry) => (
                    <option key={entry.slug} value={entry.slug}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-label">
                Módulo
                <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  {course.modules.map((module) => (
                    <option key={module.slug} value={module.slug}>
                      {formatModuleLabel(module.title)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-label">
                Tópico
                <select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
                  <option value="all">Todos</option>
                  {filterTopicOptions.map((topic) => (
                    <option key={`${topic.moduleSlug}-${topic.topicSlug}`} value={topic.topicSlug}>
                      {formatTopicLabel(topic.topicTitle)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="editor-question-list">
              {filteredQuestions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className={`editor-question-item ${selectedQuestionId === question.id && !isCreating ? "active" : ""}`}
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedQuestionId(question.id);
                  }}
                >
                  <strong>{formatTopicLabel(question.topic_title)}</strong>
                  <span>{question.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="terminal-window editor-main">
          <div className="terminal-bar">
            <strong>{isCreating ? "new-question.json" : formState.questionId || "question.json"}</strong>
          </div>
          <div className="terminal-body editor-form-shell">
            <label className="editor-label">
              Enunciado
              <textarea
                rows={6}
                value={formState.prompt}
                onChange={(event) => updateForm("prompt", event.target.value)}
              />
            </label>

            <label className="editor-label">
              Opções
              <div className="editor-options-list">
                {formState.options.map((option, index) => (
                  <div key={`option-${index}`} className="editor-option-row">
                    <span className="editor-option-badge">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <textarea
                      rows={3}
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                    />
                    <button
                      type="button"
                      className="terminal-button terminal-button-secondary editor-option-remove"
                      onClick={() => removeOption(index)}
                      disabled={formState.options.length <= 2}
                    >
                      remover
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="terminal-button terminal-button-secondary"
                  onClick={addOption}
                >
                  adicionar opção
                </button>
              </div>
            </label>

            <label className="editor-label">
              Índice da correta
              <select
                value={String(formState.correctOption)}
                onChange={(event) => updateForm("correctOption", Number(event.target.value))}
              >
                {formState.options.map((option, index) => (
                  <option key={`${index}-${option}`} value={index}>
                    {String.fromCharCode(65 + index)} - {option.trim() || "opção vazia"}
                  </option>
                ))}
              </select>
            </label>

            <label className="editor-label">
              Explicação
              <textarea
                rows={6}
                value={formState.explanation}
                onChange={(event) => updateForm("explanation", event.target.value)}
              />
            </label>

            <label className="editor-label">
              Revisar depois
              <textarea
                rows={4}
                value={formState.reviewWhy}
                onChange={(event) => updateForm("reviewWhy", event.target.value)}
              />
            </label>

            {feedback ? <p className="editor-feedback success">{feedback}</p> : null}
            {error ? <p className="editor-feedback error">{error}</p> : null}

            <div className="editor-submit-row">
              <button
                type="button"
                className="terminal-button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await saveQuestion();
                    } catch (saveError) {
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "Não foi possível salvar a questão."
                      );
                    }
                  })
                }
              >
                {isPending ? "salvando..." : "salvar no json"}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
