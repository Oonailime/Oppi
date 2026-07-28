"use client";

import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Check,
  Clock3,
  ClipboardList,
  Languages,
  Layers3,
  Play,
  RotateCcw,
  Save,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useApp } from "@/components/app-context";
import { CustomSelect } from "@/components/custom-select";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type {
  AttemptMode,
  DisciplineOption,
  DraftAttempt,
  ExamOption,
  ForeignLanguage,
  StartedAttempt,
} from "@/lib/types";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}min`
    : `${minutes}min`;
}

function savedAtLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SimulationSetupPage() {
  const router = useRouter();
  const { selectedContest } = useApp();
  const recurring = selectedContest?.type === "RECURRING";
  const [mode, setMode] = useState<AttemptMode>("FULL");
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [drafts, setDrafts] = useState<DraftAttempt[]>([]);
  const [examId, setExamId] = useState("");
  const [examDay, setExamDay] = useState<1 | 2>(1);
  const [durationMinutes, setDurationMinutes] = useState(300);
  const [foreignLanguage, setForeignLanguage] =
    useState<ForeignLanguage>("ENGLISH");
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([]);
  const [discipline, setDiscipline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      apiFetch<ExamOption[]>("/simulations/exams"),
      apiFetch<DraftAttempt[]>("/simulations/drafts"),
    ])
      .then(([examResponse, draftResponse]) => {
        setExams(examResponse);
        setDrafts(draftResponse);
        const firstExam = examResponse[0];
        setExamId(firstExam?.id ?? "");
        const firstDay = firstExam?.dayOptions[0];
        setExamDay(firstDay?.day ?? 1);
        setDurationMinutes(
          firstDay?.objectiveDurationMinutes ??
            firstExam?.extendedDurationMinutes ??
            300,
        );
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!recurring && !examId) return;
    apiFetch<DisciplineOption[]>(
      recurring
        ? "/simulations/disciplines"
        : `/simulations/disciplines?examId=${encodeURIComponent(examId)}`,
    )
      .then((response) => {
        setDisciplines(response);
        setDiscipline(response[0]?.name ?? "");
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, [examId, recurring]);

  const selectedExam = exams.find((exam) => exam.id === examId);
  const selectedDay = selectedExam?.dayOptions.find(
    (option) => option.day === examDay,
  );
  const allYearsQuestionCount =
    disciplines.find((item) => item.name === discipline)?.questionCount ?? 0;
  const allYearsDefaultDuration = Math.max(1, allYearsQuestionCount * 3);
  const allYearsExtendedDuration = Math.max(1, allYearsQuestionCount * 4);
  const allYearsDurationOptions = [
    {
      minutes: allYearsDefaultDuration,
      label: `${formatDuration(allYearsDefaultDuration)} · ritmo de 3 min por questão`,
    },
    {
      minutes: allYearsExtendedDuration,
      label: `${formatDuration(allYearsExtendedDuration)} · ritmo de 4 min por questão`,
    },
  ];
  const durationOptions =
    mode === "ALL_YEARS"
      ? allYearsDurationOptions
      : recurring && mode === "FULL" && selectedDay
        ? selectedDay.durationOptions
        : (selectedExam?.durationOptions ?? []);
  const selectedQuestionCount =
    mode === "ALL_YEARS"
      ? allYearsQuestionCount
      : mode === "DISCIPLINE"
        ? (disciplines.find((item) => item.name === discipline)
            ?.questionCount ?? 0)
        : recurring && selectedDay
          ? selectedDay.questionCount
          : (selectedExam?.questionCount ?? 0);
  const selectedHasLanguageVariants =
    mode !== "ALL_YEARS" &&
    (recurring && mode === "FULL"
      ? (selectedDay?.hasLanguageVariants ?? false)
      : (selectedExam?.hasLanguageVariants ?? false));
  const targetSeconds =
    selectedQuestionCount > 0
      ? Math.round((durationMinutes * 60) / selectedQuestionCount)
      : 0;
  const targetMinutes = Math.floor(targetSeconds / 60);
  const targetRemainingSeconds = targetSeconds % 60;

  function chooseExam(nextExamId: string) {
    const nextExam = exams.find((exam) => exam.id === nextExamId);
    const nextDay = nextExam?.dayOptions[0];
    setExamId(nextExamId);
    setExamDay(nextDay?.day ?? 1);
    setDurationMinutes(
      nextDay?.objectiveDurationMinutes ??
        nextExam?.extendedDurationMinutes ??
        300,
    );
  }

  function chooseMode(nextMode: AttemptMode) {
    setMode(nextMode);
    if (nextMode === "ALL_YEARS") {
      setDurationMinutes(allYearsExtendedDuration);
    } else {
      setDurationMinutes(
        selectedDay?.objectiveDurationMinutes ??
          selectedExam?.extendedDurationMinutes ??
          300,
      );
    }
  }

  function chooseExamDay(value: string) {
    const nextDay = Number(value) as 1 | 2;
    const option = selectedExam?.dayOptions.find(
      (candidate) => candidate.day === nextDay,
    );
    setExamDay(nextDay);
    setDurationMinutes(
      option?.objectiveDurationMinutes ??
        selectedExam?.extendedDurationMinutes ??
        300,
    );
  }

  function chooseDiscipline(nextDiscipline: string) {
    setDiscipline(nextDiscipline);
    if (mode === "ALL_YEARS") {
      const questionCount =
        disciplines.find((item) => item.name === nextDiscipline)
          ?.questionCount ?? 0;
      setDurationMinutes(Math.max(1, questionCount * 4));
    }
  }

  function begin() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await apiFetch<StartedAttempt>("/simulations", {
          method: "POST",
          body: JSON.stringify({
            examId: mode === "ALL_YEARS" ? undefined : examId,
            examDay: recurring && mode === "FULL" ? examDay : undefined,
            mode,
            durationMinutes,
            discipline:
              mode === "DISCIPLINE" || mode === "ALL_YEARS"
                ? discipline
                : undefined,
            foreignLanguage: selectedHasLanguageVariants
              ? foreignLanguage
              : undefined,
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

  if (exams.length === 0) {
    return (
      <div className="page-stack setup-page">
        <header className="page-heading">
          <span className="eyebrow">Central de treino</span>
          <h1>Este concurso ainda está em branco.</h1>
          <p>
            Nenhuma prova interna foi associada a ele. Os dados de outros
            concursos permanecem separados.
          </p>
        </header>
        {error && <ErrorState message={error} />}
      </div>
    );
  }

  return (
    <div className="page-stack setup-page">
      <header className="page-heading">
        <span className="eyebrow">
          {recurring ? "ConcursoRecorrente" : "Central de treino"}
        </span>
        <h1>
          {recurring
            ? "Escolha uma edição ou treine uma disciplina."
            : "Escolha como você quer praticar."}
        </h1>
        <p>
          {recurring
            ? "Resolva um dos dois dias de uma edição do ENEM ou pratique a mesma matéria com questões das dez edições, de 2016 a 2025."
            : "Escolha uma prova, ajuste o tempo disponível e pratique o conteúdo completo ou uma disciplina específica."}
        </p>
      </header>

      {error && <ErrorState message={error} />}

      {drafts.length > 0 && (
        <section className="panel draft-attempts-panel">
          <header>
            <div>
              <span className="eyebrow">Salvos automaticamente</span>
              <h2>Simulados em andamento</h2>
              <p>
                Retome exatamente da questão em que parou, com respostas e
                tempo acumulado preservados.
              </p>
            </div>
            <Save size={22} />
          </header>
          <div className="draft-attempt-list">
            {drafts.map((draft) => {
              const percentage =
                draft.totalQuestions === 0
                  ? 0
                  : (draft.answeredQuestions / draft.totalQuestions) * 100;
              return (
                <button
                  type="button"
                  key={draft.id}
                  onClick={() => router.push(`/simulado/${draft.id}`)}
                >
                  <span className="draft-attempt-icon">
                    <Play size={18} />
                  </span>
                  <span className="draft-attempt-copy">
                    <strong>
                      {draft.exam.name}
                      {draft.examDay ? ` · Dia ${draft.examDay}` : ""}
                    </strong>
                    <small>
                      {draft.mode === "ALL_YEARS"
                        ? `Treino por disciplina · ${draft.discipline}`
                        : draft.discipline ?? "Prova completa"}
                    </small>
                    <span className="progress-track">
                      <span style={{ width: `${percentage}%` }} />
                    </span>
                  </span>
                  <span className="draft-attempt-stats">
                    <strong>
                      {draft.answeredQuestions}/{draft.totalQuestions}
                    </strong>
                    <small>
                      Questão {draft.currentIndex + 1} ·{" "}
                      <Clock3 size={12} /> {formatElapsed(draft.elapsedSeconds)}
                    </small>
                    <small>Salvo em {savedAtLabel(draft.lastSavedAt)}</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel exam-settings">
        {mode !== "ALL_YEARS" && (
          <div className="select-field">
            <span>{recurring ? "Ano da prova" : "Prova"}</span>
            <CustomSelect
              ariaLabel={recurring ? "Ano da prova" : "Prova"}
              value={examId}
              onChange={chooseExam}
              options={exams.map((exam) => ({
                value: exam.id,
                label: exam.name,
              }))}
            />
          </div>
        )}
        {mode === "ALL_YEARS" && (
          <div className="all-years-summary">
            <BookOpen size={20} />
            <span>
              <strong>{discipline || "Escolha uma disciplina"}</strong>
              <small>
                {exams.length} edições ·{" "}
                {allYearsQuestionCount} questões categorizadas
              </small>
            </span>
          </div>
        )}
        {recurring && mode === "FULL" && selectedExam && (
          <div className="select-field">
            <span>Dia da prova</span>
            <CustomSelect
              ariaLabel="Dia da prova do ENEM"
              value={String(examDay)}
              onChange={chooseExamDay}
              options={selectedExam.dayOptions.map((option) => ({
                value: String(option.day),
                label: `${option.label} · ${option.questionCount} questões`,
              }))}
            />
          </div>
        )}
        <div className="select-field">
          <span>Tempo disponível</span>
          <CustomSelect
            ariaLabel="Tempo disponível"
            value={String(durationMinutes)}
            onChange={(value) => setDurationMinutes(Number(value))}
            options={durationOptions.map((option) => ({
              value: String(option.minutes),
              label: option.label,
            }))}
          />
        </div>
        <div className="time-guidance">
          <Timer size={19} />
          <span>
            <strong>
              {targetMinutes}min {targetRemainingSeconds}s por questão
            </strong>
            <small>Média calculada para a seleção completa</small>
          </span>
        </div>
      </section>

      {recurring && mode === "FULL" && selectedDay && (
        <section className="panel language-picker">
          <div>
            <CalendarRange size={20} />
            <span>
              <strong>
                {selectedDay.label} · {selectedDay.areas.join(", ")}
              </strong>
              <small>
                Duração oficial:{" "}
                {formatDuration(selectedDay.officialDurationMinutes)}.
                {selectedDay.includesEssay
                  ? " O cronômetro das questões reserva 1h para a redação."
                  : " Este dia não contém redação."}
              </small>
            </span>
          </div>
          <strong>{selectedDay.questionCount} questões</strong>
        </section>
      )}

      {selectedHasLanguageVariants && (
        <section className="panel language-picker">
          <div>
            <Languages size={20} />
            <span>
              <strong>Idioma estrangeiro</strong>
              <small>As cinco questões de idioma mudam conforme a opção.</small>
            </span>
          </div>
          <CustomSelect
            ariaLabel="Idioma estrangeiro"
            value={foreignLanguage}
            onChange={(value) =>
              setForeignLanguage(value as ForeignLanguage)
            }
            options={[
              { value: "ENGLISH", label: "Inglês" },
              { value: "SPANISH", label: "Espanhol" },
            ]}
          />
        </section>
      )}

      <section className="mode-grid">
        <button
          className={`mode-card ${mode === "FULL" ? "selected" : ""}`}
          type="button"
          onClick={() => chooseMode("FULL")}
        >
          <span className="mode-check">
            {mode === "FULL" && <Check size={16} />}
          </span>
          <span className="mode-icon">
            {recurring ? <CalendarRange size={25} /> : <Layers3 size={25} />}
          </span>
          <strong>{recurring ? "Prova por ano" : "Prova completa"}</strong>
          <p>
            {recurring
              ? `${selectedDay?.questionCount ?? 0} questões do Dia ${examDay}, na ordem original da edição escolhida.`
              : `${selectedExam?.questionCount ?? 0} questões na ordem original.`}
          </p>
          <small>
            <Timer size={15} /> Tempo para resolver:{" "}
            {formatDuration(
              mode === "FULL"
                ? durationMinutes
                : (selectedExam?.extendedDurationMinutes ?? 0),
            )}
          </small>
        </button>

        {recurring ? (
          <button
            className={`mode-card ${mode === "ALL_YEARS" ? "selected" : ""}`}
            type="button"
            onClick={() => chooseMode("ALL_YEARS")}
            disabled={disciplines.length === 0}
          >
            <span className="mode-check">
              {mode === "ALL_YEARS" && <Check size={16} />}
            </span>
            <span className="mode-icon coral"><BookOpen size={25} /></span>
            <strong>Treino por disciplina</strong>
            <p>
              Misture questões da mesma matéria entre 2016 e 2025 e acompanhe
              sua evolução sem misturar conteúdos.
            </p>
            <small>
              <ClipboardList size={15} /> Matéria de todos os anos
            </small>
          </button>
        ) : (
          <button
            className={`mode-card ${mode === "DISCIPLINE" ? "selected" : ""}`}
            type="button"
            onClick={() => chooseMode("DISCIPLINE")}
          >
            <span className="mode-check">
              {mode === "DISCIPLINE" && <Check size={16} />}
            </span>
            <span className="mode-icon coral"><BookOpen size={25} /></span>
            <strong>Treino por disciplina</strong>
            <p>Concentre a sessão em um único conteúdo e compare sua precisão.</p>
            <small><ClipboardList size={15} /> Sessão focada</small>
          </button>
        )}
      </section>

      {(mode === "DISCIPLINE" || mode === "ALL_YEARS") && (
        <section className="panel discipline-picker">
          <div>
            <span className="eyebrow">Disciplina</span>
            <h2>
              {mode === "ALL_YEARS"
                ? "Qual matéria você quer treinar nos dez anos?"
                : "Qual área precisa de atenção?"}
            </h2>
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
                  onChange={() => chooseDiscipline(item.name)}
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
            {mode === "ALL_YEARS"
              ? `${discipline} · ${allYearsQuestionCount} questões de ${exams.length} anos`
              : mode === "FULL"
                ? `${selectedExam?.name ?? "Prova"}${recurring ? ` · Dia ${examDay}` : ""} · ${selectedQuestionCount} questões`
                : `${discipline} · ${selectedQuestionCount} questões`}
          </strong>
          <span>O cronômetro começa ao abrir a primeira questão.</span>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={begin}
          disabled={
            isPending ||
            (mode !== "ALL_YEARS" && !examId) ||
            (recurring && mode === "FULL" && !selectedDay) ||
            ((mode === "DISCIPLINE" || mode === "ALL_YEARS") && !discipline)
          }
        >
          {isPending ? "Criando tentativa..." : "Iniciar agora"}
          {!isPending && <ArrowRight size={18} />}
        </button>
      </section>
    </div>
  );
}
