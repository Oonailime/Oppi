"use client";

import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  countdownLabel,
  daysUntilExam,
  examDateLabel,
  ExamTargetProvider,
  useExamTarget,
} from "@/components/exam-target-context";

const links = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/simulado", label: "Simulado", icon: ClipboardCheck },
  { href: "/plano", label: "Plano de estudos", icon: BookOpenCheck },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
];

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const { target, updateTarget } = useExamTarget();
  const [draftName, setDraftName] = useState(target.name);
  const [draftDate, setDraftDate] = useState(target.date);
  const daysLeft = daysUntilExam(target.date);

  function startEditingTarget() {
    setDraftName(target.name);
    setDraftDate(target.date);
    setEditingTarget(true);
  }

  function saveTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftName.trim() || !draftDate) return;
    updateTarget({ name: draftName, date: draftDate });
    setEditingTarget(false);
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">DP</span>
          <span>
            <strong>Rota DATAPREV</strong>
            <small>Perfil 2 · 2026</small>
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
              <span>Meta da prova</span>
              <label>
                <small>Prova</small>
                <input
                  required
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                />
              </label>
              <label>
                <small>Data</small>
                <input
                  required
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                />
              </label>
              <div className="exam-date-actions">
                <button type="submit">
                  <Check size={14} />
                  Salvar
                </button>
                <button type="button" onClick={() => setEditingTarget(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <>
              <span>Próxima prova</span>
              <strong>{target.name}</strong>
              <small className="exam-countdown">
                <CalendarDays size={14} />
                {countdownLabel(daysLeft)}
              </small>
              <small>{examDateLabel(target.date)}</small>
              <button
                className="exam-date-edit"
                type="button"
                onClick={startEditingTarget}
              >
                <Pencil size={13} />
                Alterar prova e data
              </button>
            </>
          )}
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
            <span className="brand-mark">DP</span>
            <strong>Rota DATAPREV</strong>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ExamTargetProvider>
      <AppShellContent>{children}</AppShellContent>
    </ExamTargetProvider>
  );
}
