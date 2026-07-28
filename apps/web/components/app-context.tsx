"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, ApiError } from "@/lib/api";
import {
  getSelectedContestId,
  storeSelectedContestId,
} from "@/lib/session";
import type { Contest, User } from "@/lib/types";

type UpdateContestInput = {
  name?: string;
  targetDate?: string;
};

type AppContextValue = {
  loading: boolean;
  user: User | null;
  contests: Contest[];
  selectedContest: Contest | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectContest: (contestId: string | null) => void;
  updateContest: (
    contestId: string,
    input: UpdateContestInput,
  ) => Promise<Contest>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(
    null,
  );

  const loadContests = useCallback(async () => {
    const result = await apiFetch<Contest[]>("/contests");
    setContests(result);
    const storedId = getSelectedContestId();
    const validId = result.some((contest) => contest.id === storedId)
      ? storedId
      : null;
    storeSelectedContestId(validId);
    setSelectedContestId(validId);
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<{ user: User }>("/auth/me")
      .then(async ({ user: currentUser }) => {
        if (!active) return;
        setUser(currentUser);
        await loadContests();
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (!(reason instanceof ApiError) || reason.status === 401) {
          setUser(null);
          setContests([]);
          setSelectedContestId(null);
          storeSelectedContestId(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadContests]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await apiFetch<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      storeSelectedContestId(null);
      setSelectedContestId(null);
      setUser(result.user);
      await loadContests();
      storeSelectedContestId(null);
      setSelectedContestId(null);
    },
    [loadContests],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } finally {
      storeSelectedContestId(null);
      setSelectedContestId(null);
      setContests([]);
      setUser(null);
    }
  }, []);

  const selectContest = useCallback(
    (contestId: string | null) => {
      storeSelectedContestId(contestId);
      setSelectedContestId(contestId);
    },
    [],
  );

  const updateContest = useCallback(
    async (contestId: string, input: UpdateContestInput) => {
      const contest = await apiFetch<Contest>(`/contests/${contestId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      setContests((current) =>
        current.map((item) => (item.id === contest.id ? contest : item)),
      );
      return contest;
    },
    [],
  );

  const selectedContest =
    contests.find((contest) => contest.id === selectedContestId) ?? null;
  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      user,
      contests,
      selectedContest,
      login,
      logout,
      selectContest,
      updateContest,
    }),
    [
      loading,
      user,
      contests,
      selectedContest,
      login,
      logout,
      selectContest,
      updateContest,
    ],
  );

  return <AppContext value={value}>{children}</AppContext>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp deve ser usado dentro de AppProvider.");
  }
  return context;
}

export function daysUntilExam(date: string | null) {
  if (!date) return null;
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function countdownLabel(days: number | null) {
  if (days === null) return "Data a definir";
  if (days < 0) return "Data encerrada";
  if (days === 0) return "É hoje";
  return `${days} dia${days === 1 ? "" : "s"}`;
}

export function examDateLabel(date: string | null) {
  if (!date) return "Sem data definida";
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
