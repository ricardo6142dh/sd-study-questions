"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuizQuestion } from "@/types/quiz";

type ExamConfigFormProps = {
  action: string;
  modules: string[];
  moduleTopics: Array<{
    module: string;
    topics: string[];
  }>;
  topicCount: number;
  questions: QuizQuestion[];
};

function matchesSelection(selected: string[], current: string) {
  return selected.length === 0 || selected.includes(current);
}

export function ExamConfigForm({
  action,
  modules,
  moduleTopics,
  topicCount,
  questions
}: ExamConfigFormProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [count, setCount] = useState(Math.min(Math.max(questions.length, 1), 20));
  const [hasEditedCount, setHasEditedCount] = useState(false);

  const availableQuestions = useMemo(() => {
    return questions.filter((question) => {
      return (
        matchesSelection(selectedModules, question.module_title) &&
        matchesSelection(selectedTopics, question.topic_title) &&
        matchesSelection(selectedDifficulties, question.difficulty)
      );
    });
  }, [questions, selectedModules, selectedTopics, selectedDifficulties]);

  const availableCount = availableQuestions.length;

  useEffect(() => {
    const nextAvailableCount = availableCount > 0 ? availableCount : 1;

    setCount((currentCount) => {
      if (!hasEditedCount) {
        return nextAvailableCount;
      }

      return Math.min(currentCount, nextAvailableCount);
    });
  }, [availableCount, hasEditedCount]);

  const DIFFICULTIES = [
    { value: "easy", label: "Fácil" },
    { value: "medium", label: "Médio" },
    { value: "hard", label: "Difícil" }
  ];

  function toggleValue(
    value: string,
    selected: string[],
    setSelected: (next: string[]) => void
  ) {
    setSelected(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value]
    );
  }

  function toggleOpenModule(module: string) {
    setOpenModules((current) =>
      current.includes(module)
        ? current.filter((entry) => entry !== module)
        : [...current, module]
    );
  }

  return (
    <form action={action} className="course-config-form">
      <section className="course-kpi-grid">
        <article className="course-kpi-card">
          <span className="course-kpi-label">Questões disponíveis</span>
          <strong>{availableCount}</strong>
        </article>
        <article className="course-kpi-card">
          <span className="course-kpi-label">Módulos</span>
          <strong>{modules.length}</strong>
        </article>
        <article className="course-kpi-card">
          <span className="course-kpi-label">Tópicos</span>
          <strong>{topicCount}</strong>
        </article>
      </section>

      <div className="course-config-grid">
        <section className="course-panel course-config-panel">
          <div className="course-option-group">
            <div className="course-option-heading">
              <h2>Módulos</h2>
              <p>Selecione um ou mais blocos do treinamento.</p>
            </div>
            <div className="course-chip-grid">
              {modules.map((module) => (
                <label key={module} className="course-chip">
                  <input
                    type="checkbox"
                    name="module"
                    value={module}
                    checked={selectedModules.includes(module)}
                    onChange={() => toggleValue(module, selectedModules, setSelectedModules)}
                  />
                  <span>{module}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="course-option-group">
            <div className="course-option-heading">
              <h2>Tópicos</h2>
              <p>Marque o módulo inteiro ou expanda apenas os tópicos dele.</p>
            </div>
            <div className="module-tree">
              {moduleTopics.map(({ module, topics }) => {
                const isOpen = openModules.includes(module);

                return (
                  <div key={module} className="module-node">
                    <div className="module-node-row">
                      <label className="course-chip module-chip">
                        <input
                          type="checkbox"
                          checked={selectedModules.includes(module)}
                          onChange={() =>
                            toggleValue(module, selectedModules, setSelectedModules)
                          }
                        />
                        <span>{module}</span>
                      </label>
                      <button
                        type="button"
                        className={`module-expand-button ${isOpen ? "open" : ""}`}
                        onClick={() => toggleOpenModule(module)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Recolher ${module}` : `Expandir ${module}`}
                      >
                        <span>▾</span>
                      </button>
                    </div>
                    {isOpen ? (
                      <div className="module-topics-grid">
                        {topics.map((topic) => (
                          <label key={`${module}-${topic}`} className="course-chip course-chip-subtle">
                            <input
                              type="checkbox"
                              name="topic"
                              value={topic}
                              checked={selectedTopics.includes(topic)}
                              onChange={() =>
                                toggleValue(topic, selectedTopics, setSelectedTopics)
                              }
                            />
                            <span>{topic}</span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="course-option-group">
            <div className="course-option-heading">
              <h2>Dificuldade</h2>
              <p>Filtre por nível de dificuldade.</p>
            </div>
            <div className="course-chip-grid">
              {DIFFICULTIES.map(({ value, label }) => (
                <label key={value} className="course-chip">
                  <input
                    type="checkbox"
                    name="difficulty"
                    value={value}
                    checked={selectedDifficulties.includes(value)}
                    onChange={() => toggleValue(value, selectedDifficulties, setSelectedDifficulties)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="course-field">
            <span>Quantidade de questões</span>
            <small className="course-field-note">
              {availableCount} questões disponíveis no filtro atual
            </small>
            <input
              type="number"
              name="count"
              min={1}
              max={availableCount || 1}
              value={count}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHasEditedCount(true);

                if (!Number.isFinite(next)) {
                  setCount(availableCount > 0 ? availableCount : 1);
                  return;
                }

                setCount(Math.max(1, Math.min(next, availableCount || 1)));
              }}
            />
          </label>

          <div className="course-form-actions">
            <button
              type="submit"
              className="terminal-button course-primary-button-wide"
              disabled={availableCount === 0}
            >
              iniciar simulado
            </button>
          </div>
        </section>
      </div>
    </form>
  );
}
