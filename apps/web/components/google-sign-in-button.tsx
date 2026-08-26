"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

export function GoogleSignInButton({
  disabled = false,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandler = useRef(onCredential);

  useEffect(() => {
    credentialHandler.current = onCredential;
  }, [onCredential]);

  const renderButton = useCallback(() => {
    const container = containerRef.current;
    if (!GOOGLE_CLIENT_ID || !container || !window.google) return;

    container.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) => credentialHandler.current(credential),
    });
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width:
        container.clientWidth > 0
          ? Math.min(Math.floor(container.clientWidth), 400)
          : 400,
      locale: "pt-BR",
    });
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="google-signin google-signin-unconfigured">
        <button type="button" disabled>
          <span aria-hidden="true">G</span>
          Continuar com Google
        </button>
        <small>Configuração do Google pendente.</small>
      </div>
    );
  }

  return (
    <div
      className={`google-signin${disabled ? " is-disabled" : ""}`}
      aria-busy={disabled}
    >
      <div ref={containerRef} />
      <Script
        src="https://accounts.google.com/gsi/client?hl=pt-BR"
        strategy="afterInteractive"
        onReady={renderButton}
        onError={() =>
          onError("Não foi possível carregar o login do Google.")
        }
      />
    </div>
  );
}
