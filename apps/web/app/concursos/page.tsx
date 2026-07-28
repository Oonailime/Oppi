"use client";

import {
  ArrowRight,
  CalendarDays,
  FileUp,
  LogOut,
  Mail,
  Repeat2,
  Search,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import {
  countdownLabel,
  daysUntilExam,
  examDateLabel,
  useApp,
} from "@/components/app-context";
import { apiFetch } from "@/lib/api";
import type { ReusableExam } from "@/lib/types";

export default function ContestsPage() {
  const router = useRouter();
  const {
    user,
    contests,
    selectedContest,
    selectContest,
    logout,
  } = useApp();
  const [requesting, setRequesting] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [desiredArea, setDesiredArea] = useState("");
  const [description, setDescription] = useState("");
  const [previousExam, setPreviousExam] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [notice, setNotice] = useState<File | null>(null);
  const [reusableExams, setReusableExams] = useState<ReusableExam[]>([]);
  const [selectedExams, setSelectedExams] = useState<Record<string, string>>(
    {},
  );
  const [examSearch, setExamSearch] = useState("");
  const deferredExamSearch = useDeferredValue(examSearch);
  const [loadingExams, setLoadingExams] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailOpened, setEmailOpened] = useState(false);

  function openRequestDialog() {
    setLoadingExams(true);
    setEmailOpened(false);
    setRequesting(true);
  }

  useEffect(() => {
    if (!requesting) return;
    let active = true;
    const params = new URLSearchParams();
    if (deferredExamSearch.trim()) {
      params.set("search", deferredExamSearch.trim());
    }
    apiFetch<ReusableExam[]>(`/contests/reusable-exams?${params}`)
      .then((response) => {
        if (active) setReusableExams(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível listar as provas internas.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingExams(false);
      });
    return () => {
      active = false;
    };
  }, [requesting, deferredExamSearch]);

  function enter(contestId: string) {
    selectContest(contestId);
    router.push("/");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!previousExam || !answerKey || !notice) {
      setError("Envie a prova, o gabarito e o edital em PDF.");
      return;
    }
    const documents = [previousExam, answerKey, notice];
    if (
      documents.some(
        (document) =>
          document.type !== "application/pdf" &&
          !document.name.toLowerCase().endsWith(".pdf"),
      )
    ) {
      setError("Os três documentos obrigatórios precisam estar em PDF.");
      return;
    }
    const selectedExamNames = Object.values(selectedExams);
    const body = [
      "SOLICITAÇÃO DE NOVO CONCURSO",
      "",
      `Solicitante: ${user?.displayName ?? user?.username ?? "Não identificado"}`,
      `Concurso: ${name}`,
      `Data da prova: ${targetDate || "A definir"}`,
      `Área/cargo desejado: ${desiredArea}`,
      "",
      "Descrição:",
      description,
      "",
      "Provas internas que desejo aproveitar:",
      selectedExamNames.length > 0
        ? selectedExamNames.map((exam) => `- ${exam}`).join("\n")
        : "- Nenhuma; iniciar em branco",
      "",
      "PDFs obrigatórios selecionados (anexar antes de enviar):",
      `- Prova anterior ou similar: ${previousExam.name}`,
      `- Gabarito correspondente: ${answerKey.name}`,
      `- Edital: ${notice.name}`,
      "",
      "Importante: os arquivos precisam ser anexados manualmente à mensagem.",
    ].join("\n");
    const subject = `Solicitação de concurso — ${name}`;
    window.location.href =
      `mailto:emilianocalado@hotmail.com?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    setEmailOpened(true);
  }

  async function exit() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="contest-picker-page">
      <header className="contest-picker-topbar">
        <div className="brand">
          <span className="brand-mark">E</span>
          <span>
            <strong>Estuda</strong>
            <small>Seus objetivos</small>
          </span>
        </div>
        <div className="contest-account">
          <span><UserRound size={16} /> {user?.displayName}</span>
          <button type="button" onClick={exit}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <section className="contest-picker-content">
        <header className="contest-picker-heading">
          <span className="eyebrow">Escolha seu foco</span>
          <h1>Qual concurso você vai estudar agora?</h1>
          <p>
            Cada concurso mantém seu próprio progresso, histórico de
            simulados e tempo de estudo.
          </p>
        </header>

        <div className="contest-card-grid">
          {contests.map((contest) => {
            const days = daysUntilExam(contest.targetDate);
            return (
              <button
                className={`contest-card ${
                  selectedContest?.id === contest.id ? "selected" : ""
                }`}
                type="button"
                key={contest.id}
                onClick={() => enter(contest.id)}
              >
                <span className="contest-card-icon">
                  {contest.type === "RECURRING" ? (
                    <Repeat2 size={23} />
                  ) : (
                    <Target size={23} />
                  )}
                </span>
                <span className="contest-card-copy">
                  <small>
                    {contest.type === "RECURRING"
                      ? "Concurso recorrente"
                      : "Concurso"}
                  </small>
                  <strong>{contest.name}</strong>
                  <span>
                    {contest.type === "RECURRING" ? (
                      <>
                        <Repeat2 size={15} />
                        Realizado todos os anos
                      </>
                    ) : (
                      <>
                        <CalendarDays size={15} />
                        {examDateLabel(contest.targetDate)}
                      </>
                    )}
                  </span>
                </span>
                <span className="contest-card-countdown">
                  {contest.type === "RECURRING"
                    ? "10 edições"
                    : countdownLabel(days)}
                </span>
                <ArrowRight size={20} />
              </button>
            );
          })}

          <button
            className="contest-card new-contest-card"
            type="button"
            onClick={openRequestDialog}
          >
            <span className="contest-card-icon"><Mail size={23} /></span>
            <span className="contest-card-copy">
              <small>Novo objetivo</small>
              <strong>Solicitar concurso</strong>
              <span>Envie os dados para análise por e-mail</span>
            </span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {requesting && (
        <div
          className="contest-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setRequesting(false);
          }}
        >
          <form className="contest-dialog" onSubmit={submit}>
            <header>
              <div>
                <span className="eyebrow">Funcionalidade temporária</span>
                <h2>Solicitar concurso</h2>
              </div>
              <button
                type="button"
                onClick={() => setRequesting(false)}
                aria-label="Fechar"
              >
                <X size={19} />
              </button>
            </header>
            <label>
              <span>Nome do concurso</span>
              <input
                required
                minLength={2}
                placeholder="Ex.: TCE Bahia 2027"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              <span>Data da prova (opcional)</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
              />
            </label>
            <label>
              <span>Área ou cargo desejado</span>
              <input
                required
                minLength={2}
                maxLength={120}
                placeholder="Ex.: Analista de TI — Desenvolvimento"
                value={desiredArea}
                onChange={(event) => setDesiredArea(event.target.value)}
              />
            </label>
            <label>
              <span>Descrição do objetivo</span>
              <textarea
                required
                minLength={3}
                maxLength={2000}
                placeholder="Descreva o cargo, a banca e o foco deste plano."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <fieldset className="contest-document-picker">
              <legend>Documentos obrigatórios</legend>
              <p>
                Selecione os três PDFs para validar a solicitação. Seu
                aplicativo de e-mail será aberto e você deverá anexá-los
                manualmente antes de enviar.
              </p>
              {[
                {
                  id: "previous-exam",
                  label: "Prova anterior ou similar",
                  file: previousExam,
                  setFile: setPreviousExam,
                },
                {
                  id: "answer-key",
                  label: "Gabarito correspondente",
                  file: answerKey,
                  setFile: setAnswerKey,
                },
                {
                  id: "notice",
                  label: "Edital",
                  file: notice,
                  setFile: setNotice,
                },
              ].map((document) => (
                <label key={document.id} className={document.file ? "ready" : ""}>
                  <FileUp size={18} />
                  <span>
                    <strong>{document.label}</strong>
                    <small>
                      {document.file?.name ?? "Selecionar arquivo PDF"}
                    </small>
                  </span>
                  <input
                    required
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) =>
                      document.setFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
              ))}
            </fieldset>
            <fieldset className="reusable-exam-picker">
              <legend>Quais provas internas deseja aproveitar?</legend>
              <p>
                Sua preferência será incluída na solicitação. Se não selecionar
                nenhuma, será pedido um concurso totalmente em branco.
              </p>
              <label className="reusable-exam-search">
                <Search size={17} />
                <input
                  type="search"
                  placeholder="Pesquisar por concurso, banca, ano ou cargo"
                  value={examSearch}
                  onChange={(event) => {
                    setLoadingExams(true);
                    setExamSearch(event.target.value);
                  }}
                />
              </label>
              {loadingExams ? (
                <span className="muted">Carregando provas disponíveis...</span>
              ) : (
                <div>
                  {reusableExams.length === 0 && (
                    <span className="muted">
                      Nenhuma prova interna encontrada para esta pesquisa.
                    </span>
                  )}
                  {reusableExams.map((exam) => (
                    <label key={exam.id}>
                      <input
                        type="checkbox"
                        checked={exam.id in selectedExams}
                        onChange={(event) =>
                          setSelectedExams((current) => {
                            if (event.target.checked) {
                              return {
                                ...current,
                                [exam.id]: `${exam.name} (${exam.year})`,
                              };
                            }
                            const next = { ...current };
                            delete next[exam.id];
                            return next;
                          })
                        }
                      />
                      <span>
                        <strong>{exam.name}</strong>
                        <small>
                          {exam.questionCount} questões ·{" "}
                          {exam.sources.map((source) => source.name).join(", ")}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <p>
              Nenhum concurso será criado automaticamente. A criação direta
              está desativada até a implementação da próxima versão.
            </p>
            {emailOpened && (
              <p className="auth-success">
                A mensagem foi preparada para emilianocalado@hotmail.com.
                Anexe os três PDFs no aplicativo de e-mail e confirme o envio.
              </p>
            )}
            {error && <p className="auth-error">{error}</p>}
            <button className="button primary" type="submit">
              Abrir solicitação no e-mail
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
