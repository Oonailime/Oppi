import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SESSION_DURATION_MS } from "./auth.constants";
import type { AuthenticatedUser } from "./auth.types";
import { verifyPassword } from "./password";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function serializeUser(user: AuthenticatedUser): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException("Usuário ou senha inválidos.");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.prisma.$transaction([
      this.prisma.authSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.authSession.create({
        data: {
          tokenHash: tokenHash(token),
          userId: user.id,
          expiresAt,
        },
      }),
    ]);

    return { user: serializeUser(user), token, expiresAt };
  }

  async authenticate(token: string | null) {
    if (!token) return null;
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.authSession.deleteMany({
          where: { id: session.id },
        });
      }
      return null;
    }
    return serializeUser(session.user);
  }

  async logout(token: string | null) {
    if (!token) return;
    await this.prisma.authSession.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  }
}
