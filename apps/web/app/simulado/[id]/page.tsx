"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useState,
  useTransition,
} from "react";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { apiFetch } from "@/lib/api";
import type { Option, StartedAttempt } from "@/lib/types";

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return [hours, minutes, remaining]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function ActiveSimulationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<StartedAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<number, Option>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const persistState = useEffectEvent(() => {
    localStorage.setItem(
      `attempt-state:${id}`,
      JSON.stringify({ answers, currentIndex, seconds, questionTimes }),
    );
  });

  useEffect(() => {
    let active = true;
    const stateKey = `attempt-state:${id}`;
    const rawState =
      localStorage.getItem(stateKey) ?? sessionStorage.getItem(stateKey);
    apiFetch<StartedAttempt & { completed?: boolean }>(`/simulations/${id}`)
      .then((response) => {
        if (!active) return;
        if (response.completed) {
          localStorage.removeItem(`attempt-state:${id}`);
          localStorage.removeItem(`attempt:${id}`);
          sessionStorage.removeItem(`attempt-state:${id}`);
          sessionStorage.removeItem(`attempt:${id}`);
          router.replace(`/resultados/${id}`);
          return;
        }
        setAttempt(response);
        localStorage.setItem(`attempt:${id}`, JSON.stringify(response));
        if (rawState) {
          const stored = JSON.parse(rawState) as {
            answers?: Record<number, Option>;
            currentIndex?: number;
            seconds?: number;
            questionTimes?: Record<number, number>;
          };
          setAnswers(stored.answers ?? {});
          setCurrentIndex(stored.currentIndex ?? 0);
          setSeconds(stored.seconds ?? 0);
          setQuestionTimes(stored.questionTimes ?? {});
          localStorage.setItem(stateKey, rawState);
          sessionStorage.removeItem(stateKey);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível recuperar a tentativa.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [id, router]);

  useEffect(() => {
    if (!attempt) return;
    const questionId = attempt.questions[currentIndex]?.id;
    if (!questionId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setSeconds((value) => value + 1);
      setQuestionTimes((current) => ({
        ...current,
        [questionId]: (current[questionId] ?? 0) + 1,
      }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, currentIndex]);

  useEffect(() => {
    if (attempt) persistState();
  }, [answers, attempt, currentIndex, questionTimes, seconds]);

  if (error) {
    return (
      <div className="page-stack">
        <ErrorState message={error} />
        <Link href="/simulado" className="button primary inline-button">
          <ArrowLeft size={17} />
          Novo simulado
        </Link>
      </div>
    );
  }
  if (!attempt) return <LoadingState label="Abrindo a prova" />;

  const question = attempt.questions[currentIndex];
  if (!question) return <ErrorState message="Questão não encontrada." />;

  const answeredCount = Object.keys(answers).length;
  const progress = ((currentIndex + 1) / attempt.totalQuestions) * 100;
  const currentQuestionSeconds = questionTimes[question.id] ?? 0;
  const currentQuestionIsSlow =
    currentQuestionSeconds > attempt.targetSecondsPerQuestion;
  const testIsOvertime = seconds > attempt.timeLimitSeconds;

  function submit() {
    if (!attempt) return;
    const unanswered = attempt.totalQuestions - answeredCount;
    if (
      unanswered > 0 &&
      !window.confirm(
        `Ainda há ${unanswered} questão${unanswered === 1 ? "" : "ões"} sem resposta. Deseja finalizar mesmo assim?`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/simulations/${id}/submit`, {
          method: "POST",
          body: JSON.stringify({
            durationSeconds: seconds,
            answers: attempt.questions.map((item) => ({
              questionId: item.id,
              selectedAnswer: answers[item.id],
              timeSpentSeconds: questionTimes[item.id] ?? 0,
            })),
          }),
        });
        localStorage.removeItem(`attempt-state:${id}`);
        localStorage.removeItem(`attempt:${id}`);
        sessionStorage.removeItem(`attempt-state:${id}`);
        sessionStorage.removeItem(`attempt:${id}`);
        router.push(`/resultados/${id}`);
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Falha ao finalizar a prova.",
        );
      }
    });
  }

  return (
    <div className="simulation-layout">
      <section className="simulation-main">
        <header className="simulation-topbar">
          <Link href="/simulado" aria-label="Sair do simulado">
            <ChevronLeft size={20} />
          </Link>
          <div className="simulation-progress">
            <span>
              Questão {currentIndex + 1} de {attempt.totalQuestions}
            </span>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className={`timer-chip ${testIsOvertime ? "over-limit" : ""}`}>
            <Timer size={17} />
            {formatTime(seconds)}
          </div>
        </header>

        {error && <ErrorState message={error} />}

        <article className="question-card">
          <header className="question-meta">
            <div>
              <span className="question-number">
                {String(question.number).padStart(2, "0")}
              </span>
              <span>
                <strong>{question.discipline}</strong>
                <small>{question.subject}</small>
              </span>
            </div>
            <div className="question-side-meta">
              <span className="weight-badge">
                Peso {String(question.weight).replace(".", ",")}
              </span>
              <div className="question-time-status">
                <span className={currentQuestionIsSlow ? "slow" : ""}>
                  {currentQuestionIsSlow ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Timer size={14} />
                  )}
                  {formatTime(currentQuestionSeconds)}
                </span>
                <small>
                  média {formatTime(attempt.targetSecondsPerQuestion)}
                </small>
              </div>
            </div>
          </header>

          {question.contextImage && (
            <details className="source-context" open>
              <summary>
                <BookOpenText size={18} />
                Texto-base da questão
              </summary>
              <div className="source-context-scroll">
                <img
                  src={question.contextImage}
                  alt={`Texto-base para a questão ${question.number}`}
                />
              </div>
            </details>
          )}

          <div className="question-source">
            <img
              src={question.sourceImage}
              alt={`Questão ${question.number}: ${question.subject}`}
            />
          </div>

          <fieldset className="answer-fieldset">
            <legend>Marque sua resposta</legend>
            <div className="answer-options">
              {question.options.map((option) => (
                <label
                  className={answers[question.id] === option ? "selected" : ""}
                  key={option}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: option,
                      }))
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </article>

        <footer className="question-actions">
          <button
            className="button secondary"
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((value) => value - 1)}
          >
            <ChevronLeft size={18} />
            Anterior
          </button>
          {currentIndex < attempt.totalQuestions - 1 ? (
            <button
              className="button primary"
              type="button"
              onClick={() => setCurrentIndex((value) => value + 1)}
            >
              Próxima
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="button primary"
              type="button"
              onClick={submit}
              disabled={isPending}
            >
              {isPending ? "Corrigindo..." : "Finalizar"}
              {!isPending && <Send size={17} />}
            </button>
          )}
        </footer>
      </section>

      <aside className="question-map-panel">
        <div>
          <span className="eyebrow">Mapa da prova</span>
          <strong>{answeredCount} respondidas</strong>
        </div>
        <div className="question-map">
          {attempt.questions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={[
                index === currentIndex ? "current" : "",
                answers[item.id] ? "answered" : "",
                (questionTimes[item.id] ?? 0) >
                attempt.targetSecondsPerQuestion
                  ? "slow"
                  : "",
              ].join(" ")}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ir para a questão ${item.number}`}
            >
              {item.number}
            </button>
          ))}
        </div>
        <div className="map-legend">
          <span><i className="answered-dot" /> Respondida</span>
          <span><i className="current-dot" /> Atual</span>
          <span><i className="slow-dot" /> Tempo acima da média</span>
        </div>
        <button
          className="button finish-button"
          type="button"
          onClick={submit}
          disabled={isPending}
        >
          <Flag size={17} />
          Finalizar simulado
        </button>
        <div className="mobile-map-nav">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((value) => value - 1)}
          >
            <ArrowLeft size={17} />
          </button>
          <span>{answeredCount}/{attempt.totalQuestions}</span>
          <button
            type="button"
            disabled={currentIndex === attempt.totalQuestions - 1}
            onClick={() => setCurrentIndex((value) => value + 1)}
          >
            <ArrowRight size={17} />
          </button>
        </div>
      </aside>
    </div>
  );
}
