"use client";

import { CheckCircle2, Flag, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Option } from "@/lib/types";

export interface ReportableQuestion {
  questionId: number;
  questionNumber: number;
  examId: string;
  examName: string;
  examYear: number;
  examDay?: number | null;
  discipline: string;
  subject: string;
  sourcePage?: number;
  sourceImage: string;
  selectedAnswer?: Option | null;
  correctAnswer?: Option | null;
}

const issueTypes = [
  {
    value: "IMAGE",
    label: "Erro na imagem",
    hint: "Imagem cortada, ilegível, vazia ou com parte do enunciado ausente.",
  },
  {
    value: "CATEGORY",
    label: "Erro na categoria",
    hint: "Disciplina ou assunto não corresponde ao conteúdo da questão.",
  },
  {
    value: "ANSWER_KEY",
    label: "Erro no gabarito",
    hint: "Resposta oficial incorreta, ausente ou questão anulada indevidamente.",
  },
  {
    value: "INCOMPLETE",
    label: "Texto ou alternativas incompletos",
    hint: "Enunciado, texto-base, tabela ou alguma alternativa está faltando.",
  },
  {
    value: "DUPLICATE",
    label: "Questão duplicada",
    hint: "A mesma questão aparece mais de uma vez no simulado.",
  },
  {
    value: "NUMBERING",
    label: "Erro na numeração",
    hint: "O número, ano, dia ou posição da questão não corresponde à prova.",
  },
  {
    value: "OTHER",
    label: "Outro erro",
    hint: "Qualquer problema não contemplado nas opções anteriores.",
  },
] as const;

export function QuestionReport({
  question,
  attemptId,
}: {
  question: ReportableQuestion;
  attemptId: string;
}) {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] =
    useState<(typeof issueTypes)[number]["value"]>("IMAGE");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedIssue = issueTypes.find((item) => item.value === issueType)!;

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openReport() {
    setDescription("");
    setSubmitted(false);
    setError(null);
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(
        `/simulations/${attemptId}/questions/${question.questionId}/reports`,
        {
          method: "POST",
          body: JSON.stringify({
            issueType,
            description,
            selectedAnswer: question.selectedAnswer ?? undefined,
            screenUrl: window.location.href,
          }),
        },
      );
      setSubmitted(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar o problema.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="question-report-trigger"
        type="button"
        onClick={openReport}
      >
        <Flag size={14} />
        Reportar problema
      </button>

      {open && (
        <div
          className="question-report-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <form
            className="question-report-dialog"
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-report-title"
          >
            <header>
              <div>
                <span className="eyebrow">Colabore com a correção</span>
                <h2 id="question-report-title">Reportar problema</h2>
                <p>
                  {question.examName} · questão {question.questionNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar relatório"
              >
                <X size={19} />
              </button>
            </header>

            <label>
              <span>Qual é o problema?</span>
              <select
                value={issueType}
                onChange={(event) =>
                  setIssueType(
                    event.target.value as (typeof issueTypes)[number]["value"],
                  )
                }
              >
                {issueTypes.map((item) => (
                  <option value={item.value} key={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <small>{selectedIssue.hint}</small>
            </label>

            <label>
              <span>Detalhes do erro</span>
              <textarea
                required
                minLength={5}
                maxLength={1500}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique o que precisa ser corrigido e, se possível, onde está o erro."
              />
            </label>

            <div className="question-report-summary">
              <strong>Dados incluídos automaticamente</strong>
              <span>
                ID {question.questionId}, prova, ano, dia, número, categoria,
                página, imagem, tentativa e usuário.
              </span>
            </div>

            {submitted && (
              <p className="auth-success">
                <CheckCircle2 size={16} /> Problema adicionado à lista de
                questões reportadas.
              </p>
            )}

            {error && <p className="form-error">{error}</p>}

            <button
              className="button primary"
              type="submit"
              disabled={submitting || submitted}
            >
              {submitted ? <CheckCircle2 size={17} /> : <Send size={17} />}
              {submitting
                ? "Registrando..."
                : submitted
                  ? "Problema registrado"
                  : "Adicionar à lista de problemas"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
