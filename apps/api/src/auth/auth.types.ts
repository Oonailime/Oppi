import type { Contest, User } from "@prisma/client";

export type AuthenticatedUser = Pick<
  User,
  "id" | "username" | "displayName" | "createdAt"
>;

export interface HttpRequest {
  headers: Record<string, string | string[] | undefined>;
}

export interface AuthenticatedRequest extends HttpRequest {
  user: AuthenticatedUser;
  contest?: Contest;
}
