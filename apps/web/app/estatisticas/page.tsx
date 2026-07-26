"use client";

import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock3,
  Medal,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type { DashboardData, HistoryItem } from "@/lib/types";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
    : `${minutes}min`;
}

export default function StatisticsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<DashboardData>("/dashboard"),
      apiFetch<HistoryItem[]>("/simulations/history?limit=30"),
    ])
      .then(([dashboardData, historyData]) => {
        setDashboard(dashboardData);
        setHistory(historyData);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!dashboard) return <LoadingState label="Calculando suas estatísticas" />;

  return (
    <div className="page-stack statistics-page">
      <header className="page-heading">
        <span className="eyebrow">Estatísticas acumuladas</span>
        <h1>Progresso que você consegue medir.</h1>
        <p>
          Cada resposta alimenta o diagnóstico por disciplina e a sua curva de
          evolução.
        </p>
      </header>

      <section className="stats-kpis">
        <article>
          <span><Target size={20} /></span>
          <small>Média</small>
          <strong>{Math.round(dashboard.averageScore)}%</strong>
        </article>
        <article>
          <span><Medal size={20} /></span>
          <small>Melhor nota</small>
          <strong>{Math.round(dashboard.bestScore)}%</strong>
        </article>
        <article>
          <span><BarChart3 size={20} /></span>
          <small>Tentativas</small>
          <strong>{dashboard.attempts}</strong>
        </article>
      </section>

      <section className="content-grid wide-left">
        <article className="panel accuracy-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Mapa de domínio</span>
              <h2>Precisão acumulada por disciplina</h2>
            </div>
          </div>
          {dashboard.disciplines.length === 0 ? (
            <div className="empty-list">
              <BarChart3 size={25} />
              <strong>Sem respostas acumuladas</strong>
              <p>Faça o primeiro simulado para abrir este diagnóstico.</p>
            </div>
          ) : (
            <div className="accuracy-list">
              {dashboard.disciplines.map((item) => (
                <div key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{Math.round(item.accuracy)}%</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${item.accuracy}%` }} />
                  </div>
                  <small>{item.attempts} respostas avaliadas</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel consistency-card">
          <span className="eyebrow">Consistência</span>
          <div className="big-number">{history.length}</div>
          <p>sessões registradas no histórico</p>
          <div className="consistency-rule">
            <span style={{ width: `${Math.min(history.length * 10, 100)}%` }} />
          </div>
          <small>Meta sugerida: 10 tentativas completas</small>
        </article>
      </section>

      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Histórico</span>
            <h2>Tentativas anteriores</h2>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="empty-list">
            <Calendar size={25} />
            <strong>Nenhum simulado concluído</strong>
            <Link href="/simulado" className="text-link">Começar agora</Link>
          </div>
        ) : (
          <div className="history-table">
            <div className="history-head">
              <span>Data e modo</span>
              <span>Tempo</span>
              <span>Pontos</span>
              <span>Nota</span>
              <span />
            </div>
            {history.map((item) => (
              <div className="history-row" key={item.id}>
                <div>
                  <Calendar size={17} />
                  <span>
                    <strong>{dateLabel(item.completedAt)}</strong>
                    <small>
                      {item.exam.name} · {item.discipline ?? "Prova completa"}
                    </small>
                  </span>
                </div>
                <span><Clock3 size={15} /> {durationLabel(item.durationSeconds)}</span>
                <span>{item.weightedScore}/{item.maxWeightedScore}</span>
                <strong>{Math.round(item.weightedPercentage)}%</strong>
                <Link href={`/resultados/${item.id}`} aria-label="Abrir resultado">
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
