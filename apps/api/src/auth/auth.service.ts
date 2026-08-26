import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { SESSION_DURATION_MS } from "./auth.constants";
import type { AuthenticatedUser } from "./auth.types";
import type { CompleteProfileDto } from "./dto/complete-profile.dto";
import {
  GoogleIdentityService,
  type GoogleIdentity,
} from "./google-identity.service";
import { verifyPassword } from "./password";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type SerializableUser = Pick<
  User,
  "id" | "username" | "displayName" | "profileCompletedAt" | "createdAt"
>;

function serializeUser(user: SerializableUser): AuthenticatedUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    profileCompleted: user.profileCompletedAt !== null,
    createdAt: user.createdAt,
  };
}

export function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10])
  );
}

function parseBirthDate(value: string) {
  const birthDate = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.toISOString().slice(0, 10) !== value ||
    birthDate > new Date() ||
    birthDate < new Date("1900-01-01T00:00:00.000Z")
  ) {
    throw new BadRequestException("Informe uma data de nascimento válida.");
  }
  return birthDate;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleIdentity: GoogleIdentityService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException("Usuário ou senha inválidos.");
    }

    return this.createSession(user);
  }

  async loginWithGoogle(credential: string) {
    const identity = await this.googleIdentity.verifyIdToken(credential);
    const user = await this.findOrCreateGoogleUser(identity);
    return this.createSession(user);
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const username = dto.username.trim().toLowerCase();
    const cpf = dto.cpf.replace(/\D/g, "");
    if (!isValidCpf(cpf)) {
      throw new BadRequestException("Informe um CPF válido.");
    }
    const birthDate = parseBirthDate(dto.birthDate);

    const [usernameOwner, cpfOwner] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          id: { not: userId },
          username: { equals: username, mode: "insensitive" },
        },
        select: { id: true },
      }),
      this.prisma.user.findFirst({
        where: { id: { not: userId }, cpf },
        select: { id: true },
      }),
    ]);
    if (usernameOwner) {
      throw new ConflictException("Este nome de usuário já está em uso.");
    }
    if (cpfOwner) {
      throw new ConflictException("Este CPF já está vinculado a uma conta.");
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          username,
          birthDate,
          cpf,
          profileCompletedAt: new Date(),
        },
      });
      return serializeUser(user);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Nome de usuário ou CPF já vinculado a outra conta.",
        );
      }
      throw error;
    }
  }

  private async findOrCreateGoogleUser(identity: GoogleIdentity) {
    const [subjectUser, emailUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { googleSubject: identity.subject },
      }),
      this.prisma.user.findUnique({ where: { email: identity.email } }),
    ]);

    if (subjectUser && emailUser && subjectUser.id !== emailUser.id) {
      throw new ConflictException(
        "Este e-mail já está vinculado a outra conta.",
      );
    }

    const existingUser = subjectUser ?? emailUser;
    if (existingUser) {
      if (
        existingUser.googleSubject &&
        existingUser.googleSubject !== identity.subject
      ) {
        throw new ConflictException(
          "Este e-mail já está vinculado a outra conta Google.",
        );
      }
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          googleSubject: identity.subject,
          email: identity.email,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
        },
      });
    }

    const usernameHash = createHash("sha256")
      .update(identity.subject)
      .digest("hex")
      .slice(0, 24);
    return this.prisma.user.create({
      data: {
        username: `google-${usernameHash}`,
        displayName: identity.displayName,
        passwordHash: null,
        email: identity.email,
        googleSubject: identity.subject,
        avatarUrl: identity.avatarUrl,
        profileCompletedAt: null,
      },
    });
  }

  private async createSession(user: User) {
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
