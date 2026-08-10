"use client";

import {
  ArrowRight,
  BookMarked,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  Clock3,
  Pause,
  Play,
  Target,
  TimerReset,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ErrorState } from "@/components/error-state";
import {
  countdownLabel,
  daysUntilExam,
  examDateLabel,
  useApp,
} from "@/components/app-context";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type { DashboardData, StudyTimeSummary } from "@/lib/types";

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function clockLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function compactDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [timerPending, startTimerTransition] = useTransition();
  const { selectedContest } = useApp();

  useEffect(() => {
    let active = true;
    apiFetch<DashboardData>("/dashboard")
      .then((response) => {
        if (active) setData(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "Erro desconhecido.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [reload]);

  const timerRunning = data?.studyTime.manualRunning ?? false;
  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  function toggleStudyTimer() {
    if (!data) return;
    startTimerTransition(async () => {
      try {
        const studyTime = await apiFetch<StudyTimeSummary>(
          `/dashboard/study-timer/${
            data.studyTime.manualRunning ? "pause" : "start"
          }`,
          { method: "POST" },
        );
        setData((current) => (current ? { ...current, studyTime } : current));
        setClockTick(Date.now());
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível atualizar o cronômetro.",
        );
      }
    });
  }

  const daysLeft = daysUntilExam(selectedContest?.targetDate ?? null);

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null);
          setReload((value) => value + 1);
        }}
      />
    );
  }
  if (!data) return <LoadingState label="Montando seu painel" />;

  const weakest = data.disciplines.slice(0, 5);
  const trendMax = Math.max(100, ...data.trend.map((point) => point.score));
  const liveTimerSeconds = data.studyTime.manualRunning
    ? Math.max(
        0,
        Math.floor(
          (clockTick - new Date(data.studyTime.calculatedAt).getTime()) / 1000,
        ),
      )
    : 0;
  const todayStudySeconds = data.studyTime.todaySeconds + liveTimerSeconds;
  const totalStudySeconds = data.studyTime.totalSeconds + liveTimerSeconds;

  return (
    <div className="dashboard page-stack">
      <header className="page-heading split">
        <div>
          <span className="eyebrow">Painel de preparação</span>
          <h1>Seu caminho até a aprovação.</h1>
          <p>
            Acompanhe cada tentativa e transforme erros em um plano de revisão.
          </p>
        </div>
        <div className="date-chip">
          <CalendarDays size={19} />
          <span>
            <small>
              {selectedContest?.name} ·{" "}
              {selectedContest?.targetDate
                ? examDateLabel(selectedContest.targetDate)
                : selectedContest?.type === "RECURRING"
                  ? "realizado todos os anos"
                  : examDateLabel(null)}
            </small>
            <strong>
              {selectedContest?.targetDate
                ? countdownLabel(daysLeft)
                : selectedContest?.type === "RECURRING"
                  ? "10 edições disponíveis"
                  : countdownLabel(daysLeft)}
            </strong>
          </span>
        </div>
      </header>

      <section className="hero-grid">
        <article className="score-hero">
          <div>
            <span className="eyebrow light">Último desempenho</span>
            <div className="hero-score">
              <strong>{Math.round(data.lastScore)}</strong>
              <span>%</span>
            </div>
            <p>
              {data.attempts === 0
                ? "Seu primeiro simulado cria a linha de base."
                : `${data.attempts} simulado${data.attempts === 1 ? "" : "s"} concluído${data.attempts === 1 ? "" : "s"}.`}
            </p>
          </div>
          <Link href="/simulado" className="button lime">
            Começar simulado
            <ArrowRight size={18} />
          </Link>
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
        </article>

        <article className="metric-card">
          <span className="metric-icon coral">
            <Target size={20} />
          </span>
          <small>Média geral</small>
          <strong>{percent(data.averageScore)}</strong>
          <p>Melhor marca: {percent(data.bestScore)}</p>
        </article>
        <article className="metric-card">
          <span className="metric-icon blue">
            <BookMarked size={20} />
          </span>
          <small>Plano concluído</small>
          <strong>{percent(data.studyProgress)}</strong>
          <p>
            {data.completedTopics} de {data.totalTopics} tópicos
          </p>
        </article>
      </section>

      <section className="content-grid wide-left">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Evolução</span>
              <h2>Desempenho nos simulados</h2>
            </div>
            <ChartNoAxesCombined size={21} />
          </div>
          {data.trend.length === 0 ? (
            <div className="empty-chart">
              <span className="chart-baseline" />
              <p>Seu histórico aparecerá aqui após a primeira tentativa.</p>
            </div>
          ) : (
            <div className="trend-chart" aria-label="Gráfico de evolução">
              {data.trend.map((point, index) => (
                <div className="trend-column" key={`${point.label}-${index}`}>
                  <span>{Math.round(point.score)}%</span>
                  <div
                    className="trend-bar"
                    style={{ height: `${(point.score / trendMax) * 100}%` }}
                  />
                  <small>{point.label}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Foco recomendado</span>
              <h2>Próximos tópicos</h2>
            </div>
            <Link href="/plano" className="text-link">
              Ver plano
            </Link>
          </div>
          <div className="topic-list compact-list">
            {data.nextTopics.map((topic, index) => (
              <div className="topic-row" key={topic.id}>
                <span className="topic-order">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{topic.subject}</strong>
                  <small>{topic.discipline}</small>
                </div>
                <span className={`priority ${topic.suggestedPriority.toLowerCase()}`}>
                  {topic.suggestedPriority}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel disciplines-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Diagnóstico</span>
              <h2>Precisão por disciplina</h2>
            </div>
            <Link href="/estatisticas" className="text-link">
              Detalhes
            </Link>
          </div>
          {weakest.length === 0 ? (
            <p className="muted">
              Conclua um simulado para identificar seus pontos de atenção.
            </p>
          ) : (
            <div className="discipline-bars">
              {weakest.map((discipline) => (
                <div className="discipline-bar-row" key={discipline.name}>
                  <div>
                    <strong>{discipline.name}</strong>
                    <span>{percent(discipline.accuracy)}</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${discipline.accuracy}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={`panel study-timer-card ${timerRunning ? "running" : ""}`}>
          <div className="study-timer-heading">
            <span className="metric-icon blue">
              <TimerReset size={20} />
            </span>
            <span>
              <span className="eyebrow">Tempo de estudo</span>
              <small>Questões + cronômetro manual</small>
            </span>
          </div>
          <div className="study-timer-today">
            <small>Estudado hoje</small>
            <strong>{clockLabel(todayStudySeconds)}</strong>
          </div>
          <button
            type="button"
            className="study-timer-toggle"
            onClick={toggleStudyTimer}
            disabled={timerPending}
          >
            {timerRunning ? <Pause size={17} /> : <Play size={17} />}
            {timerPending
              ? "Atualizando..."
              : timerRunning
                ? "Pausar estudo"
                : "Iniciar estudo"}
          </button>
          <div className="study-time-facts">
            <span>
              <ClipboardCheck size={15} />
              Questões hoje: {compactDuration(data.studyTime.questionTodaySeconds)}
            </span>
            <span>
              <Clock3 size={15} />
              Total estudado: {compactDuration(totalStudySeconds)}
            </span>
          </div>
        </article>
      </section>
    </div>
  );
}
