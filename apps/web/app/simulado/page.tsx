"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardList,
  Layers3,
  RotateCcw,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CustomSelect } from "@/components/custom-select";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type {
  AttemptMode,
  DisciplineOption,
  ExamOption,
  StartedAttempt,
} from "@/lib/types";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

export default function SimulationSetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AttemptMode>("FULL");
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [examId, setExamId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(300);
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([]);
  const [discipline, setDiscipline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    apiFetch<ExamOption[]>("/simulations/exams")
      .then((response) => {
        setExams(response);
        const firstExam = response[0];
        setExamId(firstExam?.id ?? "");
        setDurationMinutes(firstExam?.extendedDurationMinutes ?? 300);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!examId) return;
    apiFetch<DisciplineOption[]>(
      `/simulations/disciplines?examId=${encodeURIComponent(examId)}`,
    )
      .then((response) => {
        setDisciplines(response);
        setDiscipline(response[0]?.name ?? "");
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, [examId]);

  function chooseExam(nextExamId: string) {
    const nextExam = exams.find((exam) => exam.id === nextExamId);
    setExamId(nextExamId);
    setDurationMinutes(nextExam?.extendedDurationMinutes ?? 300);
  }

  function begin() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await apiFetch<StartedAttempt>("/simulations", {
          method: "POST",
          body: JSON.stringify({
            examId,
            mode,
            durationMinutes,
            discipline: mode === "DISCIPLINE" ? discipline : undefined,
          }),
        });
        localStorage.setItem(
          `attempt:${response.attemptId}`,
          JSON.stringify(response),
        );
        router.push(`/simulado/${response.attemptId}`);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Não foi possível iniciar.",
        );
      }
    });
  }

  if (loading) return <LoadingState label="Preparando os modos de treino" />;

  const selectedExam = exams.find((exam) => exam.id === examId);
  const targetSeconds = selectedExam
    ? Math.round((durationMinutes * 60) / selectedExam.questionCount)
    : 0;
  const targetMinutes = Math.floor(targetSeconds / 60);
  const targetRemainingSeconds = targetSeconds % 60;

  return (
    <div className="page-stack setup-page">
      <header className="page-heading">
        <span className="eyebrow">Central de treino</span>
        <h1>Escolha como você quer praticar.</h1>
        <p>
          Escolha uma prova, ajuste o tempo disponível e pratique o conteúdo
          completo ou uma disciplina específica.
        </p>
      </header>

      {error && <ErrorState message={error} />}

      <section className="panel exam-settings">
        <div className="select-field">
          <span>Prova</span>
          <CustomSelect
            ariaLabel="Prova"
            value={examId}
            onChange={chooseExam}
            options={exams.map((exam) => ({
              value: exam.id,
              label: exam.name,
            }))}
          />
        </div>
        <div className="select-field">
          <span>Tempo disponível</span>
          <CustomSelect
            ariaLabel="Tempo disponível"
            value={String(durationMinutes)}
            onChange={(value) => setDurationMinutes(Number(value))}
            options={
              selectedExam?.durationOptions.map((option) => ({
                value: String(option.minutes),
                label: option.label,
              })) ?? []
            }
          />
        </div>
        <div className="time-guidance">
          <Timer size={19} />
          <span>
            <strong>
              {targetMinutes}min {targetRemainingSeconds}s por questão
            </strong>
            <small>Média calculada para a prova completa</small>
            <small>30 minutos já reservados para preencher o gabarito</small>
          </span>
        </div>
      </section>

      <section className="mode-grid">
        <button
          className={`mode-card ${mode === "FULL" ? "selected" : ""}`}
          type="button"
          onClick={() => setMode("FULL")}
        >
          <span className="mode-check">
            {mode === "FULL" && <Check size={16} />}
          </span>
          <span className="mode-icon"><Layers3 size={25} /></span>
          <strong>Prova completa</strong>
          <p>
            {selectedExam?.questionCount ?? 0} questões na ordem original, com
            nota máxima de {selectedExam?.maxWeightedScore ?? 0} pontos.
          </p>
          <small><Timer size={15} /> Tempo para resolver: {formatDuration(durationMinutes)}</small>
        </button>
        <button
          className={`mode-card ${mode === "DISCIPLINE" ? "selected" : ""}`}
          type="button"
          onClick={() => setMode("DISCIPLINE")}
        >
          <span className="mode-check">
            {mode === "DISCIPLINE" && <Check size={16} />}
          </span>
          <span className="mode-icon coral"><BookOpen size={25} /></span>
          <strong>Treino por disciplina</strong>
          <p>Concentre a sessão em um único conteúdo e compare sua precisão.</p>
          <small><ClipboardList size={15} /> Sessão focada</small>
        </button>
      </section>

      {mode === "DISCIPLINE" && (
        <section className="panel discipline-picker">
          <div>
            <span className="eyebrow">Disciplina</span>
            <h2>Qual área precisa de atenção?</h2>
          </div>
          <div className="discipline-choice-grid">
            {disciplines.map((item) => (
              <label
                className={discipline === item.name ? "selected" : ""}
                key={item.name}
              >
                <input
                  type="radio"
                  name="discipline"
                  value={item.name}
                  checked={discipline === item.name}
                  onChange={() => setDiscipline(item.name)}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.questionCount} questões</small>
                </span>
                {item.progressStatus !== "NOT_STARTED" && (
                  <span
                    className={`discipline-progress ${item.progressStatus.toLowerCase()}`}
                    title={
                      item.progressStatus === "MASTERED"
                        ? "Área concluída com 100% de acertos"
                        : item.progressStatus === "GOOD"
                          ? `Melhor resultado: ${Math.round(item.bestPercentage ?? 0)}%`
                          : "Esta área precisa de revisão"
                    }
                  >
                    {item.progressStatus === "REVIEW" ? (
                      <RotateCcw size={13} />
                    ) : (
                      <Check size={14} />
                    )}
                    <em>
                      {item.progressStatus === "REVIEW"
                        ? "Revisar"
                        : `${Math.round(item.bestPercentage ?? 0)}%`}
                    </em>
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="start-strip">
        <div>
          <strong>
            {mode === "FULL"
              ? `${selectedExam?.name ?? "Prova"} · ${selectedExam?.questionCount ?? 0} questões`
              : `${discipline} · ${disciplines.find((item) => item.name === discipline)?.questionCount ?? 0} questões`}
          </strong>
          <span>O cronômetro começa ao abrir a primeira questão.</span>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={begin}
          disabled={
            isPending ||
            !examId ||
            (mode === "DISCIPLINE" && !discipline)
          }
        >
          {isPending ? "Criando tentativa..." : "Iniciar agora"}
          {!isPending && <ArrowRight size={18} />}
        </button>
      </section>
    </div>
  );
}
