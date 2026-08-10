"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  PlayCircle,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useApp } from "@/components/app-context";
import { CustomSelect } from "@/components/custom-select";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type {
  StudyCatalog,
  StudyStatus,
  StudyTopic,
} from "@/lib/types";

const statusLabels: Record<StudyStatus, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em progresso",
  COMPLETED: "Concluído",
};

const statusIcons = {
  NOT_STARTED: Circle,
  IN_PROGRESS: CircleDot,
  COMPLETED: CheckCircle2,
};

export default function TopicsPage() {
  const { selectedContest } = useApp();
  const [catalog, setCatalog] = useState<StudyCatalog | null>(null);
  const [moduleName, setModuleName] = useState("");
  const [topicCode, setTopicCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    apiFetch<StudyCatalog>("/study-plan/catalog")
      .then((response) => {
        setCatalog(response);
        const firstModule = response.modules[0];
        setModuleName(firstModule?.name ?? "");
        setTopicCode(firstModule?.topics[0]?.code ?? "");
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, []);

  const selectedModule = catalog?.modules.find(
    (module) => module.name === moduleName,
  );
  const selectedTopic = selectedModule?.topics.find(
    (topic) => topic.code === topicCode,
  );
  const totalSubjects = useMemo(
    () =>
      catalog?.modules.reduce(
        (total, module) =>
          total +
          module.topics.reduce(
            (moduleTotal, topic) => moduleTotal + topic.totalSubjects,
            0,
          ),
        0,
      ) ?? 0,
    [catalog],
  );

  function chooseModule(nextModule: string) {
    const selectedModuleEntry = catalog?.modules.find(
      (item) => item.name === nextModule,
    );
    setModuleName(nextModule);
    setTopicCode(selectedModuleEntry?.topics[0]?.code ?? "");
  }

  function updateStatus(topic: StudyTopic, nextStatus: StudyStatus) {
    startTransition(async () => {
      try {
        const updated = await apiFetch<StudyTopic>(`/study-plan/${topic.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        setCatalog((current) => {
          if (!current) return current;
          return {
            ...current,
            modules: current.modules.map((module) => ({
              ...module,
              topics: module.topics.map((group) => {
                const subjects = group.subjects.map((subject) =>
                  subject.id === updated.id ? updated : subject,
                );
                const completedSubjects = subjects.filter(
                  (subject) => subject.status === "COMPLETED",
                ).length;
                return {
                  ...group,
                  subjects,
                  completedSubjects,
                  progress:
                    subjects.length === 0
                      ? 0
                      : (completedSubjects / subjects.length) * 100,
                };
              }),
            })),
          };
        });
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível atualizar o assunto.",
        );
      }
    });
  }

  if (!catalog) {
    return <LoadingState label="Organizando tópicos e assuntos" />;
  }

  return (
    <div className="page-stack topics-page">
      <header className="page-heading split">
        <div>
          <span className="eyebrow">Tópicos · {selectedContest?.name}</span>
          <h1>Da Matriz oficial ao que estudar hoje.</h1>
          <p>
            Navegue por tópico, consulte os códigos de competência e habilidade
            e acompanhe separadamente cada um dos {totalSubjects} assuntos do
            plano.
          </p>
        </div>
        <Link className="button secondary" href="/plano">
          <BookOpenCheck size={18} />
          Ver checklist completo
        </Link>
      </header>

      {error && <ErrorState message={error} />}

      {catalog.cognitiveAxes.length > 0 && (
        <section className="matrix-axes">
          {catalog.cognitiveAxes.map((axis) => (
            <article key={axis.code}>
              <span>{axis.code}</span>
              <strong>{axis.title}</strong>
              <p>{axis.description}</p>
            </article>
          ))}
        </section>
      )}

      <section className="topic-module-tabs" aria-label="Áreas da Matriz">
        {catalog.modules.map((module) => (
          <button
            type="button"
            className={module.name === moduleName ? "active" : ""}
            onClick={() => chooseModule(module.name)}
            key={module.name}
          >
            {module.name}
            <small>{module.topics.length} tópicos</small>
          </button>
        ))}
      </section>

      <section className="topic-browser">
        <aside className="topic-index">
          <header className="topic-index-heading">
            <div>
              <span className="eyebrow">Navegação por tópicos</span>
              <strong>{selectedModule?.name}</strong>
            </div>
            <span className="topic-index-count">
              {selectedModule?.topics.length ?? 0}
              <small>tópicos</small>
            </span>
          </header>
          <div className="topic-index-list">
            {selectedModule?.topics.map((topic) => {
              const active = topic.code === topicCode;
              return (
                <button
                  type="button"
                  className={active ? "active" : ""}
                  aria-current={active ? "true" : undefined}
                  onClick={() => setTopicCode(topic.code)}
                  key={topic.code}
                >
                  <span className="topic-index-code">{topic.code}</span>
                  <span className="topic-index-copy">
                    <strong>{topic.title}</strong>
                    <small>
                      {topic.completedSubjects}/{topic.totalSubjects} assuntos ·{" "}
                      {Math.round(topic.progress)}%
                    </small>
                  </span>
                  <span className="topic-index-arrow">
                    <ArrowRight size={15} />
                  </span>
                  <span className="topic-index-progress" aria-hidden="true">
                    <span style={{ width: `${topic.progress}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {selectedTopic && (
          <div className={`topic-detail ${isPending ? "updating" : ""}`}>
            <header>
              <div>
                <span className="matrix-code">{selectedTopic.code}</span>
                <h2>{selectedTopic.title}</h2>
                <p>{selectedTopic.page}</p>
              </div>
              <div className="topic-progress-ring">
                <strong>{Math.round(selectedTopic.progress)}%</strong>
                <small>concluído</small>
              </div>
            </header>

            <div className="matrix-code-groups">
              <div>
                <small>Competências</small>
                <div className="matrix-code-list">
                  {selectedTopic.competencyCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
              <div>
                <small>Habilidades relacionadas</small>
                <div className="matrix-code-list">
                  {selectedTopic.skillCodes.map((code) => (
                    <span key={code}>{code}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="topic-subject-list">
              {selectedTopic.subjects.map((subject) => {
                const StatusIcon = statusIcons[subject.status];
                const accuracy =
                  subject.questionsCompleted === 0
                    ? null
                    : Math.round(
                        (subject.correctAnswers /
                          subject.questionsCompleted) *
                          100,
                      );
                return (
                  <article key={subject.id}>
                    <div className="subject-plan-heading">
                      <span className="subject-plan-number">
                        {String(subject.sortOrder).padStart(2, "0")}
                      </span>
                      <div>
                        <strong>{subject.subject}</strong>
                        <small>{subject.discipline}</small>
                      </div>
                      <span
                        className={`priority ${subject.suggestedPriority.toLowerCase()}`}
                      >
                        {subject.suggestedPriority}
                      </span>
                    </div>
                    <p>{subject.detail}</p>
                    <div className="subject-plan-footer">
                      <span className="subject-question-result">
                        <Target size={15} />
                        {accuracy === null
                          ? "Sem questões respondidas"
                          : `${subject.correctAnswers}/${subject.questionsCompleted} · ${accuracy}%`}
                      </span>
                      <div className={`status-select ${subject.status.toLowerCase()}`}>
                        <StatusIcon size={16} />
                        <CustomSelect
                          ariaLabel={`Status de ${subject.subject}`}
                          value={subject.status}
                          onChange={(value) =>
                            updateStatus(subject, value as StudyStatus)
                          }
                          options={Object.entries(statusLabels).map(
                            ([value, label]) => ({ value, label }),
                          )}
                          className="compact"
                        />
                      </div>
                    </div>
                    <div className="subject-study-actions">
                      {subject.videoLessons.map((lesson) => (
                        <a
                          href={lesson.url}
                          target="_blank"
                          rel="noreferrer"
                          key={lesson.url}
                        >
                          <PlayCircle size={15} />
                          {lesson.label}
                          <ExternalLink size={12} />
                        </a>
                      ))}
                      <Link
                        href={{
                          pathname: "/simulado",
                          query: {
                            training: "topic",
                            mode:
                              selectedContest?.type === "RECURRING"
                                ? "ALL_YEARS"
                                : "DISCIPLINE",
                            discipline: subject.discipline,
                            topic: String(subject.id),
                            includeCorrectAnswers: "true",
                          },
                        }}
                      >
                        Treinar este assunto
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
