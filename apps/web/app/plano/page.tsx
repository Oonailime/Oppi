"use client";

import {
  BookCheck,
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  PlayCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  Suspense,
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { CustomSelect } from "@/components/custom-select";
import { useApp } from "@/components/app-context";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type {
  StudyStatus,
  StudySummary,
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

function StudyPlanContent() {
  const searchParams = useSearchParams();
  const { selectedContest } = useApp();
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [discipline, setDiscipline] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    apiFetch<StudySummary>("/study-plan/summary")
      .then(setSummary)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (discipline) params.set("discipline", discipline);
    if (status) params.set("status", status);
    if (deferredSearch) params.set("search", deferredSearch);

    apiFetch<StudyTopic[]>(`/study-plan?${params}`)
      .then((response) => {
        if (active) setTopics(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "Erro desconhecido.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deferredSearch, discipline, status]);

  function updateStatus(topic: StudyTopic, nextStatus: StudyStatus) {
    startTransition(async () => {
      try {
        const updated = await apiFetch<StudyTopic>(`/study-plan/${topic.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        setTopics((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSummary((current) => {
          if (!current) return current;
          const deltaCompleted =
            Number(nextStatus === "COMPLETED") -
            Number(topic.status === "COMPLETED");
          const deltaInProgress =
            Number(nextStatus === "IN_PROGRESS") -
            Number(topic.status === "IN_PROGRESS");
          const completed = current.completed + deltaCompleted;
          return {
            ...current,
            completed,
            inProgress: current.inProgress + deltaInProgress,
            notStarted:
              current.total - completed - (current.inProgress + deltaInProgress),
            progress: (completed / current.total) * 100,
          };
        });
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Falha ao atualizar tópico.",
        );
      }
    });
  }

  if (!summary && loading) return <LoadingState label="Importando o plano de estudos" />;

  const disciplines = summary?.disciplines ?? [];

  return (
    <div className="page-stack study-page">
      <header className="page-heading split">
        <div>
          <span className="eyebrow">Plano · {selectedContest?.name}</span>
          <h1>
            {selectedContest?.type === "RECURRING"
              ? "Matriz oficial do ENEM 2026, assunto por assunto."
              : "Todo o edital, sem pontos cegos."}
          </h1>
          <p>
            {summary?.total ?? 0} tópicos organizados por disciplina,
            prioridade e progresso neste concurso
            {selectedContest?.type === "RECURRING"
              ? ", incluindo Redação e os dois idiomas."
              : "."}
          </p>
        </div>
        <div className="plan-progress-card">
          <span><BookCheck size={20} /></span>
          <div>
            <small>Progresso geral</small>
            <strong>{Math.round(summary?.progress ?? 0)}%</strong>
          </div>
        </div>
      </header>

      {error && <ErrorState message={error} />}

      <section className="plan-stats">
        <article>
          <span className="status-dot empty" />
          <div><strong>{summary?.notStarted ?? 0}</strong><small>Não iniciados</small></div>
        </article>
        <article>
          <span className="status-dot progress" />
          <div><strong>{summary?.inProgress ?? 0}</strong><small>Em progresso</small></div>
        </article>
        <article>
          <span className="status-dot done" />
          <div><strong>{summary?.completed ?? 0}</strong><small>Concluídos</small></div>
        </article>
      </section>

      <section className="panel filters-panel">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar assunto ou detalhamento"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="select-field">
          <span>Disciplina</span>
          <CustomSelect
            ariaLabel="Disciplina"
            value={discipline}
            onChange={setDiscipline}
            options={[
              { value: "", label: "Todas as disciplinas" },
              ...disciplines.map((item) => ({
                value: item.name,
                label: item.name,
              })),
            ]}
          />
        </div>
        <div className="select-field">
          <span>Status</span>
          <CustomSelect
            ariaLabel="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todos os status" },
              ...Object.entries(statusLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
        <div className="filter-count">
          <SlidersHorizontal size={17} />
          {topics.length} tópicos
        </div>
      </section>

      {loading ? (
        <LoadingState label="Filtrando tópicos" />
      ) : (
        <section className={`topics-table ${isPending ? "updating" : ""}`}>
          <div className="topics-table-head">
            <span>Assunto</span>
            <span>Prioridade</span>
            <span>Questões</span>
            <span>Status</span>
          </div>
          {topics.map((topic) => {
            const StatusIcon = statusIcons[topic.status];
            const accuracy =
              topic.questionsCompleted === 0
                ? null
                : Math.round(
                    (topic.correctAnswers / topic.questionsCompleted) * 100,
                  );
            return (
              <article className="topic-table-row" key={topic.id}>
                <div className="topic-main-cell">
                  <span className="topic-id">{String(topic.id).padStart(3, "0")}</span>
                  <div>
                    <strong>{topic.subject}</strong>
                    <span>{topic.discipline}</span>
                    {topic.detail && <small>{topic.detail}</small>}
                    <div className="video-lessons">
                      {topic.videoLessons.map((lesson) => (
                        <a
                          href={lesson.url}
                          target="_blank"
                          rel="noreferrer"
                          key={lesson.url}
                        >
                          <PlayCircle size={14} />
                          {lesson.label}
                          <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
                <span className={`priority ${topic.suggestedPriority.toLowerCase()}`}>
                  {topic.suggestedPriority}
                </span>
                <span className="question-stat">
                  {topic.questionsCompleted === 0
                    ? "Ainda sem treino"
                    : `${topic.correctAnswers}/${topic.questionsCompleted} · ${accuracy}%`}
                </span>
                <div className={`status-select ${topic.status.toLowerCase()}`}>
                  <StatusIcon size={16} />
                  <CustomSelect
                    ariaLabel={`Status de ${topic.subject}`}
                    value={topic.status}
                    onChange={(value) =>
                      updateStatus(topic, value as StudyStatus)
                    }
                    options={Object.entries(statusLabels).map(
                      ([value, label]) => ({ value, label }),
                    )}
                    className="compact"
                  />
                </div>
              </article>
            );
          })}
          {topics.length === 0 && (
            <div className="empty-list">
              <Search size={24} />
              <strong>Nenhum tópico encontrado</strong>
              <p>Ajuste os filtros para ampliar a busca.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function StudyPlanPage() {
  return (
    <Suspense fallback={<LoadingState label="Importando o plano de estudos" />}>
      <StudyPlanContent />
    </Suspense>
  );
}
