"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useApp } from "@/components/app-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useApp();
  const [username, setUsername] = useState("Emiliano");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await login(username, password);
        router.replace("/concursos");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Não foi possível entrar.",
        );
      }
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand auth-brand">
          <span className="brand-mark">E</span>
          <span>
            <strong>Estuda</strong>
            <small>Preparação com direção</small>
          </span>
        </div>
        <div>
          <span className="eyebrow light">Seu estudo, em um só lugar</span>
          <h1>Organize a preparação para cada concurso.</h1>
          <p>
            Seus planos, simulados, estatísticas e horas de estudo ficam
            vinculados à sua conta e separados por objetivo.
          </p>
        </div>
        <div className="auth-feature">
          <BookOpenCheck size={21} />
          <span>
            <strong>Continue exatamente de onde parou</strong>
            <small>Todo o histórico atual está preservado.</small>
          </span>
        </div>
      </section>

      <section className="auth-form-column">
        <form className="auth-card" onSubmit={submit}>
          <header>
            <span className="eyebrow">Acesso pessoal</span>
            <h2>Boas-vindas de volta.</h2>
            <p>Entre para escolher o concurso que você vai estudar.</p>
          </header>

          <label className="auth-field">
            <span>Usuário</span>
            <div>
              <UserRound size={18} />
              <input
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Senha</span>
            <div>
              <LockKeyhole size={18} />
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button
            className="button primary auth-submit"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Entrando..." : "Entrar"}
            {!isPending && <ArrowRight size={18} />}
          </button>

          <small className="auth-security-note">
            Sua sessão permanece conectada neste navegador por até 30 dias.
          </small>
        </form>
      </section>
    </main>
  );
}
