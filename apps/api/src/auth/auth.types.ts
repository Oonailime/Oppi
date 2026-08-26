import type { Contest } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  profileCompleted: boolean;
  createdAt: Date;
}

export interface HttpRequest {
  headers: Record<string, string | string[] | undefined>;
}

export interface AuthenticatedRequest extends HttpRequest {
  user: AuthenticatedUser;
  contest?: Contest;
}
