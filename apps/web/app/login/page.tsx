"use client";

import { BookOpenCheck, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app-context";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  async function submitGoogle(credential: string) {
    setError(null);
    setGooglePending(true);
    try {
      const authenticatedUser = await loginWithGoogle(credential);
      router.replace(
        authenticatedUser.profileCompleted
          ? "/concursos"
          : "/primeiro-acesso",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível entrar com o Google.",
      );
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <main className="auth-page google-login-page">
      <section className="auth-intro google-login-intro">
        <div className="brand auth-brand">
          <span className="brand-mark">O</span>
          <span>
            <strong>Oppi</strong>
            <small>Preparação com direção</small>
          </span>
        </div>

        <div className="google-login-hero">
          <span className="eyebrow light">Seu estudo continua aqui</span>
          <h1>Preparação com foco. Evolução com clareza.</h1>
          <p>
            Entre no Oppi para acompanhar cada etapa da sua preparação, do
            primeiro plano de estudos até o dia da prova.
          </p>
        </div>

        <div className="google-login-benefits" aria-label="Recursos do Oppi">
          <article>
            <BookOpenCheck size={20} />
            <span>
              <strong>Estudo organizado</strong>
              <small>Concursos e planos reunidos em um só lugar.</small>
            </span>
          </article>
          <article>
            <ChartNoAxesCombined size={20} />
            <span>
              <strong>Evolução visível</strong>
              <small>Simulados, horas e desempenho sempre à mão.</small>
            </span>
          </article>
        </div>
      </section>

      <section className="google-login-panel">
        <div className="google-login-card">
          <span className="google-login-card-mark" aria-hidden="true">O</span>
          <header>
            <span className="eyebrow">Acesso ao Oppi</span>
            <h2>Boas-vindas.</h2>
            <p>
              Use sua conta Google para entrar com segurança e continuar de
              onde parou.
            </p>
          </header>

          <GoogleSignInButton
            disabled={googlePending}
            onCredential={submitGoogle}
            onError={setError}
          />

          {googlePending && (
            <p className="google-signin-status" aria-live="polite">
              Validando sua conta...
            </p>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <div className="google-login-trust">
            <ShieldCheck size={19} />
            <p>
              <strong>Acesso protegido</strong>
              <small>
                O Oppi não recebe sua senha do Google. Sua sessão permanece
                conectada neste navegador por até 30 dias.
              </small>
            </p>
          </div>
        </div>

        <small className="google-login-footnote">
          Uma conta para todos os seus concursos.
        </small>
      </section>
    </main>
  );
}
