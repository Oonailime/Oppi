"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type ExamTarget = {
  name: string;
  date: string;
};

const DEFAULT_TARGET: ExamTarget = {
  name: "DATAPREV 2026",
  date: "2026-11-10",
};

const STORAGE_KEY = "dataprev:exam-target";
const CHANGE_EVENT = "dataprev:exam-target-change";
const DEFAULT_TARGET_SNAPSHOT = JSON.stringify(DEFAULT_TARGET);

type ExamTargetContextValue = {
  target: ExamTarget;
  updateTarget: (target: ExamTarget) => void;
};

const ExamTargetContext = createContext<ExamTargetContextValue | null>(null);

function isExamTarget(value: unknown): value is ExamTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as Partial<ExamTarget>;
  return (
    typeof target.name === "string" &&
    target.name.trim().length > 0 &&
    typeof target.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(target.date)
  );
}

function targetFromSnapshot(snapshot: string) {
  try {
    const stored = JSON.parse(snapshot);
    return isExamTarget(stored) ? stored : DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
}

function subscribeToTarget(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

function getTargetSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TARGET_SNAPSHOT;
}

export function ExamTargetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    subscribeToTarget,
    getTargetSnapshot,
    () => DEFAULT_TARGET_SNAPSHOT,
  );
  const target = targetFromSnapshot(snapshot);

  function updateTarget(nextTarget: ExamTarget) {
    const normalized = {
      name: nextTarget.name.trim(),
      date: nextTarget.date,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <ExamTargetContext value={{ target, updateTarget }}>
      {children}
    </ExamTargetContext>
  );
}

export function useExamTarget() {
  const context = useContext(ExamTargetContext);
  if (!context) {
    throw new Error("useExamTarget deve ser usado dentro de ExamTargetProvider.");
  }
  return context;
}

export function daysUntilExam(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function countdownLabel(days: number) {
  if (days < 0) return "Data encerrada";
  if (days === 0) return "É hoje";
  return `${days} dia${days === 1 ? "" : "s"}`;
}

export function examDateLabel(date: string) {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
