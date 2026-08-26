"use client";

import { ArrowRight, AtSign, CalendarDays, IdCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useApp } from "@/components/app-context";

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function FirstAccessPage() {
  const router = useRouter();
  const { user, completeProfile } = useApp();
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await completeProfile({ username, birthDate, cpf });
        router.replace("/concursos");
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível concluir seu cadastro.",
        );
      }
    });
  }

  return (
    <div className="profile-onboarding-page">
      <section className="profile-onboarding-intro">
        <div className="brand auth-brand">
          <span className="brand-mark">O</span>
          <span>
            <strong>Oppi</strong>
            <small>Seu espaço de estudos</small>
          </span>
        </div>
        <div>
          <span className="eyebrow light">Última etapa</span>
          <h1>Vamos completar seu perfil.</h1>
          <p>
            Essas informações identificam sua conta e mantêm seu progresso
            separado dos demais estudantes.
          </p>
        </div>
        <small>Conta Google conectada como {user?.displayName}.</small>
      </section>

      <section className="profile-onboarding-form-column">
        <form className="auth-card profile-onboarding-card" onSubmit={submit}>
          <header>
            <span className="eyebrow">Primeiro acesso</span>
            <h2>Escolha como aparecer no Oppi.</h2>
            <p>Você preencherá estes dados apenas uma vez.</p>
          </header>

          <label className="auth-field">
            <span>Nome de usuário</span>
            <div>
              <AtSign size={18} />
              <input
                required
                autoComplete="username"
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9._-]+"
                placeholder="ex.: edu.silva"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase())
                }
              />
            </div>
            <small>Esse nome será exibido como @{username || "usuario"}.</small>
          </label>

          <label className="auth-field">
            <span>Data de nascimento</span>
            <div>
              <CalendarDays size={18} />
              <input
                required
                type="date"
                autoComplete="bday"
                min="1900-01-01"
                max={today}
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>CPF</span>
            <div>
              <IdCard size={18} />
              <input
                required
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
              />
            </div>
            <small>O CPF não será exibido publicamente.</small>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            className="button primary auth-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Salvando..." : "Concluir cadastro"}
            {!isPending && <ArrowRight size={18} />}
          </button>
        </form>
      </section>
    </div>
  );
}
