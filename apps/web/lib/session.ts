const SELECTED_CONTEST_KEY = "estuda:selected-contest";
const SIMULATION_PREFERENCES_PREFIX = "estuda:simulation-preferences:";

export interface SimulationPreferences {
  mode?: "FULL" | "DISCIPLINE" | "ALL_YEARS";
  examId?: string;
  trainingExamId?: string;
  examDays?: Record<string, 1 | 2>;
  discipline?: string;
  studyTopicId?: string;
  allYearsScope?: "RANDOM" | "ALL";
  includeCorrectAnswers?: boolean;
  foreignLanguage?: "ENGLISH" | "SPANISH";
  durations?: Record<string, number>;
}

export function getSelectedContestId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_CONTEST_KEY);
}

export function storeSelectedContestId(contestId: string | null) {
  if (typeof window === "undefined") return;
  if (contestId) {
    localStorage.setItem(SELECTED_CONTEST_KEY, contestId);
  } else {
    localStorage.removeItem(SELECTED_CONTEST_KEY);
  }
}

export function getSimulationPreferences(contestId?: string | null) {
  if (typeof window === "undefined") return {} as SimulationPreferences;
  const resolvedContestId = contestId ?? getSelectedContestId();
  if (!resolvedContestId) return {} as SimulationPreferences;
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(
        `${SIMULATION_PREFERENCES_PREFIX}${resolvedContestId}`,
      ) ?? "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as SimulationPreferences)
      : {};
  } catch {
    return {};
  }
}

export function updateSimulationPreferences(
  contestId: string | null | undefined,
  patch: SimulationPreferences,
) {
  if (typeof window === "undefined") return;
  const resolvedContestId = contestId ?? getSelectedContestId();
  if (!resolvedContestId) return;
  const current = getSimulationPreferences(resolvedContestId);
  localStorage.setItem(
    `${SIMULATION_PREFERENCES_PREFIX}${resolvedContestId}`,
    JSON.stringify({
      ...current,
      ...patch,
      examDays: { ...current.examDays, ...patch.examDays },
      durations: { ...current.durations, ...patch.durations },
    }),
  );
}
