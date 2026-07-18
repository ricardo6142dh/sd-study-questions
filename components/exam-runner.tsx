"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatModuleLabel, formatTopicLabel } from "@/lib/display-label";
import type { CourseCatalogEntry } from "@/types/course";
import { getCourseTheme } from "@/lib/course-theme";
import type { BuiltExam, QuizQuestion } from "@/types/quiz";

function countUnique(items: string[]) {
  return new Set(items).size;
}

function normalizeExplanation(explanation: string, correctAnswer: string) {
  const normalized = explanation.trim();
  const gabaritoPattern = new RegExp(`^gabarito\\s*:\\s*${correctAnswer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i");

  if (gabaritoPattern.test(normalized)) {
    return normalized.replace(gabaritoPattern, "").trim();
  }

  return normalized;
}

function ResultCard({
  question,
  selectedOption
}: {
  question: QuizQuestion;
  selectedOption: number | null;
}) {
  const isCorrect = selectedOption === question.correct_option;
  const correctAnswer = question.options[question.correct_option];
  const explanation = normalizeExplanation(question.explanation, correctAnswer);

  return (
    <article className={`result-card ${isCorrect ? "correct" : "wrong"}`}>
      <h3>{question.prompt}</h3>
      <p>
        <strong>Sua resposta:</strong>{" "}
        {selectedOption === null ? "Não respondida" : question.options[selectedOption]}
      </p>
      <p>
        <strong>Gabarito:</strong> {correctAnswer}
      </p>
      {explanation ? <p>{explanation}</p> : null}
      {!isCorrect ? (
        <div className="review-box">
          <strong>Revisar depois</strong>
          <p>{formatTopicLabel(question.recommended_review.topic_title)}</p>
          <p>{question.recommended_review.why_review}</p>
        </div>
      ) : null}
    </article>
  );
}

export function ExamRunner({
  exam,
  course
}: {
  exam: BuiltExam;
  course: CourseCatalogEntry;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = exam.questions[currentIndex];

  const score = useMemo(() => {
    return exam.questions.reduce((total, question) => {
      return total + (answers[question.id] === question.correct_option ? 1 : 0);
    }, 0);
  }, [answers, exam.questions]);

  const orderedResults = useMemo(() => {
    return [...exam.questions].sort((left, right) => {
      const leftCorrect = answers[left.id] === left.correct_option;
      const rightCorrect = answers[right.id] === right.correct_option;

      if (leftCorrect === rightCorrect) {
        return 0;
      }

      return leftCorrect ? 1 : -1;
    });
  }, [answers, exam.questions]);

  const answeredCount = Object.keys(answers).length;

  if (exam.questions.length === 0) {
    return (
      <main className={`course-shell ${getCourseTheme(course)}`}>
        <section className="course-panel course-empty-panel">
          <span className="course-badge">Sem correspondência</span>
          <h1>Nenhuma questão atende aos filtros selecionados</h1>
          <p>Volte e relaxe os filtros de módulo ou tópico.</p>
          <Link href={`/courses/${course.slug}/exams`} className="course-secondary-button">
            ajustar filtros
          </Link>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className={`course-shell exam-theme-shell ${getCourseTheme(course)}`}>
        <div className="terminal-window course-terminal-window">
          <div className="terminal-bar">
            <span className="terminal-dot red" />
            <span className="terminal-dot amber" />
            <span className="terminal-dot green" />
            <strong>results.log</strong>
          </div>
          <section className="exam-main exam-results-main">
            <div className="course-panel">
              <span className="course-badge">Resultado</span>
              <div className="score-grid">
                <div className="score-box">
                  <span>Acertos</span>
                  <strong>
                    {score}/{exam.questions.length}
                  </strong>
                </div>
                <div className="score-box">
                  <span>Aproveitamento</span>
                  <strong>
                    {Math.round((score / exam.questions.length) * 100)}%
                  </strong>
                </div>
                <div className="score-box">
                  <span>Tópicos cobrados</span>
                  <strong>{countUnique(exam.questions.map((question) => question.topic_title))}</strong>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="result-actions">
                  <Link href="/" className="terminal-button terminal-button-secondary">
                    Voltar para home
                  </Link>
                  <Link
                    href={`/courses/${course.slug}/exams`}
                    className="terminal-button terminal-button-secondary"
                  >
                    Novo simulado
                  </Link>
                </div>
              </div>
              <div className="results-list">
                {orderedResults.map((question) => (
                  <ResultCard
                    key={question.id}
                    question={question}
                    selectedOption={answers[question.id] ?? null}
                  />
                ))}
              </div>
              <div className="result-actions result-actions-bottom">
                <Link href="/" className="terminal-button terminal-button-secondary">
                  Voltar para home
                </Link>
                <Link
                  href={`/courses/${course.slug}/exams`}
                  className="terminal-button terminal-button-secondary"
                >
                  Novo simulado
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={`course-shell exam-theme-shell ${getCourseTheme(course)}`}>
      <div className="terminal-window course-terminal-window">
        <div className="terminal-bar">
          <span className="terminal-dot red" />
          <span className="terminal-dot amber" />
          <span className="terminal-dot green" />
          <strong>exam_session.sh</strong>
        </div>
        <section className="exam-main">
          <div className="course-panel">
            <div className="panel-header">
              <div className="exam-header-actions">
                <Link href="/" className="terminal-button terminal-button-secondary">
                  Cancelar simulado
                </Link>
              </div>
            </div>

            <div className="progress-row">
              <span>
                Questão {currentIndex + 1} de {exam.questions.length} • {answeredCount} respondidas
              </span>
            </div>
            <div
              className="progress-bar"
              aria-hidden="true"
              style={{
                ["--progress" as string]: `${((currentIndex + 1) / exam.questions.length) * 100}%`
              }}
            />
          </div>

          <article className="course-panel question-card">
            <h2>{currentQuestion.prompt}</h2>

            <div className="question-meta">
              <span>{formatModuleLabel(currentQuestion.module_title)}</span>
              <span>{formatTopicLabel(currentQuestion.topic_title)}</span>
            </div>

            <div className="answers">
              {currentQuestion.options.map((option, optionIndex) => {
                const isSelected = answers[currentQuestion.id] === optionIndex;

                return (
                  <button
                    key={`${currentQuestion.id}-${optionIndex}`}
                    type="button"
                    className={`answer-button ${isSelected ? "selected" : ""}`}
                    onClick={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [currentQuestion.id]: optionIndex
                      }))
                    }
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    <strong>{option}</strong>
                  </button>
                );
              })}
            </div>

            <div className="question-actions">
              <button
                type="button"
                className="terminal-button terminal-button-secondary"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((value) => Math.max(value - 1, 0))}
              >
                Anterior
              </button>

              {currentIndex === exam.questions.length - 1 ? (
                <button
                  type="button"
                  className="terminal-button"
                  onClick={() => setSubmitted(true)}
                >
                  Finalizar
                </button>
              ) : (
                <button
                  type="button"
                  className="terminal-button"
                  onClick={() =>
                    setCurrentIndex((value) => Math.min(value + 1, exam.questions.length - 1))
                  }
                >
                  Próxima
                </button>
              )}
            </div>
          </article>

          <aside className="exam-sidebar">
            <div className="course-panel sticky">
              <div className="index-grid">
                {exam.questions.map((question, index) => {
                  const answered = answers[question.id] !== undefined;
                  const active = currentIndex === index;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`index-button ${answered ? "answered" : ""} ${active ? "active" : ""}`}
                      onClick={() => setCurrentIndex(index)}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
