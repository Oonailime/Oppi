"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleAlert,
  Clock3,
  Eye,
  Gauge,
  RotateCcw,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { QuestionReport } from "@/components/question-report";
import { apiFetch } from "@/lib/api";
import type { AttemptResult } from "@/lib/types";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
}

function formatQuestionDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}min ${String(remainingSeconds).padStart(2, "0")}s`;
}

function formatTimeBalance(seconds: number) {
  if (seconds === 0) return "No ritmo recomendado";
  return `${formatQuestionDuration(Math.abs(seconds))} ${
    seconds > 0 ? "ganhos" : "perdidos"
  }`;
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [openedAnswer, setOpenedAnswer] = useState<
    AttemptResult["answers"][number] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AttemptResult>(`/simulations/${id}`)
      .then(setResult)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Erro desconhecido."),
      );
  }, [id]);

  useEffect(() => {
    if (!openedAnswer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedAnswer(null);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openedAnswer]);

  if (error) return <ErrorState message={error} />;
  if (!result) return <LoadingState label="Calculando o resultado" />;
  if (!result.completed) {
    return <ErrorState message="Esta tentativa ainda não foi finalizada." />;
  }

  const roundedScore = Math.round(result.weightedPercentage);
  const circumference = 2 * Math.PI * 68;
  const dash = (roundedScore / 100) * circumference;

  return (
    <div className="page-stack result-page">
      <header className="result-hero">
        <div className="score-ring">
          <svg viewBox="0 0 160 160" role="img" aria-label={`${roundedScore}%`}>
            <circle className="ring-base" cx="80" cy="80" r="68" />
            <circle
              className="ring-value"
              cx="80"
              cy="80"
              r="68"
              strokeDasharray={`${dash} ${circumference - dash}`}
            />
          </svg>
          <span><strong>{roundedScore}</strong>%</span>
        </div>
        <div>
          <span className="eyebrow light">
            {result.exam.name}
            {result.examDay ? ` · Dia ${result.examDay}` : ""} concluída
          </span>
          <h1>
            {roundedScore >= 80
              ? "Ótimo domínio. Refine os detalhes."
              : roundedScore >= 60
                ? "A base está formada. Agora reduza as lacunas."
                : "O diagnóstico está pronto. Foque no essencial."}
          </h1>
          <p>
            Você alcançou <strong>{result.weightedScore}</strong> de{" "}
            <strong>{result.maxWeightedScore}</strong> pontos ponderados.
          </p>
          <div className="result-facts">
            <span><Trophy size={17} /> {result.correctAnswers} acertos válidos</span>
            <span><Clock3 size={17} /> {formatDuration(result.durationSeconds)}</span>
            <span><CircleAlert size={17} /> {result.annulledQuestions} anuladas</span>
          </div>
        </div>
      </header>

      <section className="content-grid wide-left">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Por disciplina</span>
              <h2>Onde você ganhou e perdeu pontos</h2>
            </div>
          </div>
          <div className="discipline-result-list">
            {result.disciplines.map((discipline) => (
              <div key={discipline.name}>
                <div>
                  <strong>{discipline.name}</strong>
                  <span>
                    {discipline.correct}/{discipline.total} ·{" "}
                    {Math.round(discipline.percentage)}%
                  </span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${discipline.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel recommendation-panel">
          <span className="eyebrow">Próxima revisão</span>
          <h2>O que estudar agora</h2>
          {result.recommendations.length === 0 ? (
            <p className="muted">
              Nenhuma lacuna encontrada nesta tentativa.
            </p>
          ) : (
            <div className="recommendation-list">
              {result.recommendations.map((item, index) => (
                <Link href={`/plano?search=${encodeURIComponent(item.subject)}`} key={item.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{item.subject}</strong>
                    <small>{item.discipline}</small>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel time-analysis-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Gestão do tempo</span>
            <h2>Ritmo questão a questão</h2>
          </div>
          <Gauge size={21} />
        </div>
        <div className="time-analysis-grid">
          <div>
            <small>Tempo para resolver</small>
            <strong>{formatDuration(result.timeLimitSeconds)}</strong>
          </div>
          <div>
            <small>Média recomendada</small>
            <strong>
              {formatQuestionDuration(result.targetSecondsPerQuestion)}
            </strong>
          </div>
          <div className={result.timingAvailable ? "positive" : ""}>
            <small>Acima da média de ritmo</small>
            <strong>
              {result.timingAvailable
                ? `${result.fasterQuestionCount} questões`
                : "Indisponível"}
            </strong>
          </div>
          <div className={result.timeBalanceSeconds < 0 ? "attention" : "positive"}>
            <small>Saldo do simulado</small>
            <strong>{formatTimeBalance(result.timeBalanceSeconds)}</strong>
          </div>
        </div>
        {!result.timingAvailable && (
          <p className="time-analysis-note">
            Este simulado foi concluído antes do registro de tempo por questão.
            O saldo usa o tempo total, que permaneceu preservado.
          </p>
        )}
      </section>

      <section className="panel review-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Gabarito comentado pelo desempenho</span>
            <h2>Revisão questão a questão</h2>
          </div>
          <span className="muted">{result.answers.length} itens</span>
        </div>
        <div className="answer-review-grid">
          {result.answers.map((answer) => (
            <button
              type="button"
              className={[
                answer.annulled
                  ? "annulled"
                  : answer.isCorrect
                    ? "correct"
                    : "wrong",
                result.timingAvailable && answer.exceededTarget ? "slow" : "",
              ].join(" ")}
              key={answer.questionId}
              onClick={() => setOpenedAnswer(answer)}
              aria-label={`Abrir questão ${answer.questionNumber} de ${answer.examYear}`}
            >
              <span className="review-number">{answer.questionNumber}</span>
              <span>
                <strong>{answer.subject}</strong>
                {result.mode === "ALL_YEARS" && (
                  <small>{answer.examName}</small>
                )}
                <small>
                  {answer.annulled
                    ? "Questão anulada"
                    : answer.isCorrect
                      ? `Resposta ${answer.correctAnswer}`
                      : `Você: ${answer.selectedAnswer ?? "em branco"} · Gabarito: ${answer.correctAnswer}`}
                </small>
                <small
                  className={
                    result.timingAvailable && answer.exceededTarget
                      ? "review-time slow"
                      : "review-time"
                  }
                >
                  <Clock3 size={12} />
                  {result.timingAvailable
                    ? formatQuestionDuration(answer.timeSpentSeconds)
                    : "Tempo por questão não registrado"}
                  {result.timingAvailable &&
                    answer.exceededTarget &&
                    " · tempo acima da média"}
                </small>
              </span>
              {answer.annulled ? (
                <CircleAlert size={18} />
              ) : answer.isCorrect ? (
                <Check size={18} />
              ) : (
                <X size={18} />
              )}
              <Eye className="review-open-icon" size={15} />
            </button>
          ))}
        </div>
      </section>

      {openedAnswer && (
        <div
          className="question-review-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenedAnswer(null);
          }}
        >
          <section
            className="question-review-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-review-title"
          >
            <header>
              <div>
                <span className="eyebrow">{openedAnswer.discipline}</span>
                <h2 id="question-review-title">
                  Questão {openedAnswer.questionNumber}
                </h2>
                <p>
                  {result.mode === "ALL_YEARS"
                    ? `${openedAnswer.examName} · treino de ${openedAnswer.discipline} · ${openedAnswer.subject}`
                    : openedAnswer.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenedAnswer(null)}
                aria-label="Fechar questão"
              >
                <X size={19} />
              </button>
            </header>
            <div className="question-review-image">
              <img
                src={openedAnswer.sourceImage}
                alt={`Enunciado da questão ${openedAnswer.questionNumber}`}
              />
            </div>
            <div className="question-review-selection">
              <span>Sua marcação</span>
              <div className="question-review-options">
                {result.exam.answerOptions.map((option) => (
                  <span
                    className={[
                      openedAnswer.selectedAnswer === option ? "selected" : "",
                      openedAnswer.selectedAnswer === option &&
                      !openedAnswer.isCorrect
                        ? "wrong"
                        : "",
                    ].join(" ")}
                    key={option}
                  >
                    {option}
                  </span>
                ))}
              </div>
              {openedAnswer.selectedAnswer === null && (
                <p>Você deixou esta questão em branco.</p>
              )}
              <small>
                O gabarito permanece oculto nesta visualização para você
                reconsiderar a resposta.
              </small>
              <QuestionReport
                attemptId={result.id}
                question={{
                  questionId: openedAnswer.questionId,
                  questionNumber: openedAnswer.questionNumber,
                  examId: openedAnswer.examId,
                  examName: openedAnswer.examName,
                  examYear: openedAnswer.examYear,
                  examDay: openedAnswer.examDay,
                  discipline: openedAnswer.discipline,
                  subject: openedAnswer.subject,
                  sourcePage: openedAnswer.sourcePage,
                  sourceImage: openedAnswer.sourceImage,
                  selectedAnswer: openedAnswer.selectedAnswer,
                  correctAnswer: openedAnswer.correctAnswer,
                }}
              />
            </div>
          </section>
        </div>
      )}

      <div className="result-actions">
        <Link href="/simulado" className="button primary">
          <RotateCcw size={17} />
          Fazer novo simulado
        </Link>
        <Link href="/plano" className="button secondary">
          <BookOpenCheck size={17} />
          Abrir plano de estudos
        </Link>
      </div>
    </div>
  );
}
