"use client";

import {
  ArrowRight,
  CalendarDays,
  LogOut,
  Plus,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  countdownLabel,
  daysUntilExam,
  examDateLabel,
  useApp,
} from "@/components/app-context";

export default function ContestsPage() {
  const router = useRouter();
  const {
    user,
    contests,
    selectedContest,
    selectContest,
    createContest,
    logout,
  } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function enter(contestId: string) {
    selectContest(contestId);
    router.push("/");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const contest = await createContest({
          name,
          targetDate: targetDate || undefined,
        });
        selectContest(contest.id);
        router.push("/");
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível criar o concurso.",
        );
      }
    });
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
                <span className="contest-card-icon"><Target size={23} /></span>
                <span className="contest-card-copy">
                  <small>Concurso</small>
                  <strong>{contest.name}</strong>
                  <span>
                    <CalendarDays size={15} />
                    {examDateLabel(contest.targetDate)}
                  </span>
                </span>
                <span className="contest-card-countdown">
                  {countdownLabel(days)}
                </span>
                <ArrowRight size={20} />
              </button>
            );
          })}

          <button
            className="contest-card new-contest-card"
            type="button"
            onClick={() => setCreating(true)}
          >
            <span className="contest-card-icon"><Plus size={23} /></span>
            <span className="contest-card-copy">
              <small>Novo objetivo</small>
              <strong>Adicionar concurso</strong>
              <span>Comece um histórico separado</span>
            </span>
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {creating && (
        <div
          className="contest-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <form className="contest-dialog" onSubmit={submit}>
            <header>
              <div>
                <span className="eyebrow">Novo objetivo</span>
                <h2>Adicionar concurso</h2>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
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
            <p>
              O novo concurso começa sem tentativas e sem tempo acumulado.
            </p>
            {error && <p className="auth-error">{error}</p>}
            <button
              className="button primary"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Criando..." : "Criar e entrar"}
              {!isPending && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
