"use client";

import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Repeat2,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  AppProvider,
  countdownLabel,
  daysUntilExam,
  examDateLabel,
  useApp,
} from "@/components/app-context";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";

const links = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/simulado", label: "Simulado", icon: ClipboardCheck },
  { href: "/topicos", label: "Tópicos", icon: BookOpen },
  { href: "/plano", label: "Plano de estudos", icon: BookOpenCheck },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
];

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    selectedContest,
    updateContest,
    logout,
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [draftName, setDraftName] = useState(selectedContest?.name ?? "");
  const [draftDate, setDraftDate] = useState(
    selectedContest?.targetDate ?? "",
  );
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!selectedContest || !user) return null;
  const daysLeft = daysUntilExam(selectedContest.targetDate);

  function startEditingTarget() {
    setDraftName(selectedContest?.name ?? "");
    setDraftDate(selectedContest?.targetDate ?? "");
    setTargetError(null);
    setEditingTarget(true);
  }

  function saveTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftName.trim() || !selectedContest) return;
    startTransition(async () => {
      try {
        await updateContest(selectedContest.id, {
          name: draftName,
          targetDate: draftDate || undefined,
        });
        setEditingTarget(false);
      } catch (reason) {
        setTargetError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível salvar o concurso.",
        );
      }
    });
  }

  async function exit() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">O</span>
          <span>
            <strong>Oppi</strong>
            <small>{selectedContest.name}</small>
          </span>
        </div>
        <button
          className="sidebar-close"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} />
        </button>
        <nav className="main-nav" aria-label="Navegação principal">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={19} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className={`exam-date ${editingTarget ? "is-editing" : ""}`}>
          {editingTarget ? (
            <form onSubmit={saveTarget}>
              <span>Concurso atual</span>
              <label>
                <small>Concurso</small>
                <input
                  required
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </label>
              <label>
                <small>Data da prova</small>
                <input
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                />
              </label>
              {targetError && <small className="form-error">{targetError}</small>}
              <div className="exam-date-actions">
                <button type="submit" disabled={isPending}>
                  <Check size={14} />
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setEditingTarget(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <span>Concurso atual</span>
              <strong>{selectedContest.name}</strong>
              <small className="exam-countdown">
                {selectedContest.type === "RECURRING" ? (
                  <>
                    <Repeat2 size={14} />
                    Concurso anual
                  </>
                ) : (
                  <>
                    <CalendarDays size={14} />
                    {countdownLabel(daysLeft)}
                  </>
                )}
              </small>
              <small>
                {selectedContest.type === "RECURRING"
                  ? "Edições de 2016 a 2025"
                  : examDateLabel(selectedContest.targetDate)}
              </small>
              <button
                className="exam-date-edit"
                type="button"
                onClick={startEditingTarget}
              >
                <Pencil size={13} />
                Alterar nome e data
              </button>
              <Link
                className="exam-date-edit"
                href="/concursos"
                onClick={() => setMenuOpen(false)}
              >
                <Repeat2 size={13} />
                Trocar concurso
              </Link>
            </>
          )}
        </div>
        <div className="sidebar-user">
          <span><UserRound size={16} /></span>
          <div>
            <strong>{user.displayName}</strong>
            <small>@{user.username}</small>
          </div>
          <button type="button" onClick={exit} aria-label="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="menu-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="page-column">
        <header className="mobile-header">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="brand compact">
            <span className="brand-mark">O</span>
            <strong>Oppi</strong>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

function AppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, sessionError, retrySession, user, selectedContest } =
    useApp();
  const accessPage = pathname === "/login";
  const contestPage = pathname === "/concursos";
  const onboardingPage = pathname === "/primeiro-acesso";

  useEffect(() => {
    if (loading || sessionError) return;
    if (!user) {
      if (!accessPage) router.replace("/login");
      return;
    }

    if (!user.profileCompleted) {
      if (!onboardingPage) router.replace("/primeiro-acesso");
      return;
    }

    if (onboardingPage || accessPage) {
      router.replace("/concursos");
      return;
    }

    if (!selectedContest && !contestPage) {
      router.replace("/concursos");
    }
  }, [
    accessPage,
    contestPage,
    loading,
    onboardingPage,
    router,
    sessionError,
    selectedContest,
    user,
  ]);

  if (loading) {
    return (
      <div className="standalone-loading">
        <LoadingState label="Abrindo seu espaço de estudos" />
      </div>
    );
  }
  if (sessionError) {
    return (
      <div className="standalone-loading">
        <ErrorState message={sessionError} onRetry={retrySession} />
      </div>
    );
  }
  if (!user) {
    return accessPage ? children : null;
  }
  if (!user.profileCompleted) {
    return onboardingPage ? (
      <main className="standalone-page">{children}</main>
    ) : null;
  }
  if (accessPage) return null;
  if (onboardingPage) return null;
  if (contestPage) return <main className="standalone-page">{children}</main>;
  if (!selectedContest) return null;
  return <AppShellContent>{children}</AppShellContent>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppGate>{children}</AppGate>
    </AppProvider>
  );
}
