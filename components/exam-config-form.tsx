"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatModuleLabel, formatTopicLabel } from "@/lib/display-label";
import type { QuizQuestion } from "@/types/quiz";

type ExamConfigFormProps = {
  action: string;
  modules: string[];
  moduleTopics: Array<{
    module: string;
    topics: string[];
  }>;
  questions: QuizQuestion[];
};

function matchesSelection(selected: string[], current: string) {
  return selected.length === 0 || selected.includes(current);
}

export function ExamConfigForm({
  action,
  modules,
  moduleTopics,
  questions
}: ExamConfigFormProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [count, setCount] = useState(Math.min(Math.max(questions.length, 1), 20));
  const [hasEditedCount, setHasEditedCount] = useState(false);
  const seedInputRef = useRef<HTMLInputElement>(null);

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

  const visibleTopicGroups = useMemo(() => {
    if (selectedModules.length === 0) {
      return moduleTopics;
    }

    return moduleTopics.filter(({ module }) => selectedModules.includes(module));
  }, [moduleTopics, selectedModules]);

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

  function selectionSummary(count: number, emptyLabel: string, singularLabel: string, pluralLabel: string) {
    if (count === 0) {
      return emptyLabel;
    }

    if (count === 1) {
      return `1 ${singularLabel}`;
    }

    return `${count} ${pluralLabel}`;
  }

  return (
    <form
      action={action}
      className="course-config-form"
      onSubmit={() => {
        if (seedInputRef.current) {
          seedInputRef.current.value = crypto.randomUUID();
        }
      }}
    >
      <input ref={seedInputRef} type="hidden" name="seed" defaultValue="initial" />
      <div className="course-config-grid">
        <section className="course-panel course-config-panel">
          <div className="course-option-group">
            <div className="course-option-heading">
              <h2>Módulos</h2>
              <p>Selecione um ou mais blocos do treinamento.</p>
            </div>
            <details className="filter-dropdown">
              <summary className="filter-dropdown-trigger">
                <span>{selectionSummary(selectedModules.length, "Todos os módulos", "módulo", "módulos")}</span>
                <strong>▾</strong>
              </summary>
              <div className="filter-dropdown-panel course-chip-grid">
                {modules.map((module) => (
                  <label key={module} className="course-chip">
                    <input
                      type="checkbox"
                      name="module"
                      value={module}
                      checked={selectedModules.includes(module)}
                      onChange={() => toggleValue(module, selectedModules, setSelectedModules)}
                    />
                    <span>{formatModuleLabel(module)}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>

          <div className="course-option-group">
            <div className="course-option-heading">
              <h2>Tópicos</h2>
              <p>Abra a lista e marque apenas os tópicos que quiser incluir.</p>
            </div>
            <details className="filter-dropdown">
              <summary className="filter-dropdown-trigger">
                <span>{selectionSummary(selectedTopics.length, "Todos os tópicos", "tópico", "tópicos")}</span>
                <strong>▾</strong>
              </summary>
              <div className="filter-dropdown-panel topic-dropdown-panel">
                {visibleTopicGroups.map(({ module, topics }) => (
                  <div key={module} className="topic-group">
                    <span className="topic-group-label">{formatModuleLabel(module)}</span>
                    <div className="course-chip-grid">
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
                          <span>{formatTopicLabel(topic)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
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
