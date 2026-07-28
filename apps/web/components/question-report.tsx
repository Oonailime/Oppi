"use client";

import { Flag, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/app-context";
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
  const { user, selectedContest } = useApp();
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] =
    useState<(typeof issueTypes)[number]["value"]>("IMAGE");
  const [description, setDescription] = useState("");
  const [emailOpened, setEmailOpened] = useState(false);
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
    setEmailOpened(false);
    setOpen(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const imageUrl = new URL(
      question.sourceImage,
      window.location.origin,
    ).href;
    const body = [
      "RELATÓRIO DE PROBLEMA EM QUESTÃO",
      "",
      `Tipo do problema: ${selectedIssue.label}`,
      `Descrição: ${description}`,
      "",
      "DADOS DA QUESTÃO",
      `ID interno: ${question.questionId}`,
      `Prova: ${question.examName}`,
      `ID da prova: ${question.examId}`,
      `Ano: ${question.examYear}`,
      `Dia: ${question.examDay ?? "Não se aplica"}`,
      `Número: ${question.questionNumber}`,
      `Disciplina atual: ${question.discipline}`,
      `Assunto atual: ${question.subject}`,
      `Página de origem: ${question.sourcePage ?? "Não informada"}`,
      `Imagem: ${imageUrl}`,
      "",
      "CONTEXTO",
      `Concurso: ${selectedContest?.name ?? "Não identificado"}`,
      `Tentativa: ${attemptId}`,
      `Resposta marcada: ${question.selectedAnswer ?? "Em branco"}`,
      `Gabarito disponível: ${question.correctAnswer ?? "Não informado"}`,
      `Usuário: ${user?.displayName ?? user?.username ?? "Não identificado"}`,
      `Tela: ${window.location.href}`,
    ].join("\n");
    const subject =
      `[Problema em questão] ${question.examName} — questão ${question.questionNumber}`;
    window.location.href =
      `mailto:emilianocalado@hotmail.com?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    setEmailOpened(true);
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

            {emailOpened && (
              <p className="auth-success">
                O relatório foi preparado para emilianocalado@hotmail.com.
                Revise e confirme o envio no aplicativo de e-mail.
              </p>
            )}

            <button className="button primary" type="submit">
              <Mail size={17} />
              Abrir relatório no e-mail
            </button>
          </form>
        </div>
      )}
    </>
  );
}
