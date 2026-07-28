const SELECTED_CONTEST_KEY = "estuda:selected-contest";

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
