import { getSelectedContestId } from "@/lib/session";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const contestId = getSelectedContestId();
  const usesFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(!usesFormData ? { "Content-Type": "application/json" } : {}),
      ...(contestId ? { "X-Contest-Id": contestId } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(" ")
      : body?.message;
    throw new ApiError(
      message ?? "Não foi possível concluir a operação.",
      response.status,
    );
  }

  return response.json() as Promise<T>;
}
