import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { AuthService, isValidCpf } from "../src/auth/auth.service";
import { GoogleIdentityService } from "../src/auth/google-identity.service";
import { PrismaService } from "../src/prisma/prisma.service";

const googleIdentity = {
  subject: "112233445566778899",
  email: "pessoa@example.com",
  displayName: "Pessoa de Teste",
  avatarUrl: "https://example.com/avatar.png",
};

interface TestUser {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string | null;
  email: string | null;
  googleSubject: string | null;
  avatarUrl: string | null;
  birthDate: Date | null;
  cpf: string | null;
  profileCompletedAt: Date | null;
  createdAt: Date;
}

interface UserCreateArgs {
  data: Omit<TestUser, "id" | "createdAt">;
}

interface UserUpdateArgs {
  where: { id: string };
  data: Partial<TestUser>;
}

interface AuthSessionCreateArgs {
  data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  };
}

function user(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "user-id",
    username: "pessoa",
    displayName: "Pessoa",
    passwordHash: null,
    email: null,
    googleSubject: null,
    avatarUrl: null,
    birthDate: null,
    cpf: null,
    profileCompletedAt: null,
    createdAt: new Date("2026-08-26T00:00:00.000Z"),
    ...overrides,
  };
}

function setup() {
  const prisma = {
    user: {
      findFirst: jest.fn<Promise<TestUser | null>, [unknown]>(),
      findUnique: jest.fn<Promise<TestUser | null>, [unknown]>(),
      create: jest.fn<Promise<TestUser>, [UserCreateArgs]>(),
      update: jest.fn<Promise<TestUser>, [UserUpdateArgs]>(),
    },
    authSession: {
      deleteMany: jest.fn(),
      create: jest.fn<Promise<unknown>, [AuthSessionCreateArgs]>(),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const google = {
    verifyIdToken: jest.fn().mockResolvedValue(googleIdentity),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    google as unknown as GoogleIdentityService,
  );
  return { google, prisma, service };
}

describe("AuthService Google login", () => {
  it("registra uma conta Google nova e cria a sessão interna", async () => {
    const { prisma, service } = setup();
    const createdUser = user({
      username: `google-${createHash("sha256")
        .update(googleIdentity.subject)
        .digest("hex")
        .slice(0, 24)}`,
      displayName: googleIdentity.displayName,
      email: googleIdentity.email,
      googleSubject: googleIdentity.subject,
      avatarUrl: googleIdentity.avatarUrl,
    });
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValue(createdUser);

    const result = await service.loginWithGoogle("credential");

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        username: createdUser.username,
        displayName: googleIdentity.displayName,
        email: googleIdentity.email,
        googleSubject: googleIdentity.subject,
        passwordHash: null,
        avatarUrl: googleIdentity.avatarUrl,
        profileCompletedAt: null,
      },
    });
    const sessionInput = prisma.authSession.create.mock.calls[0]?.[0];
    expect(sessionInput?.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(sessionInput?.data.userId).toBe(createdUser.id);
    expect(sessionInput?.data.expiresAt).toBeInstanceOf(Date);
    expect(result.user).toEqual({
      id: createdUser.id,
      username: createdUser.username,
      displayName: createdUser.displayName,
      profileCompleted: false,
      createdAt: createdUser.createdAt,
    });
  });

  it("vincula a identidade Google a um usuário com e-mail verificado igual", async () => {
    const { prisma, service } = setup();
    const existingUser = user({
      id: "legacy-user",
      email: googleIdentity.email,
      passwordHash: "hash-legado",
    });
    const linkedUser = user({
      ...existingUser,
      displayName: googleIdentity.displayName,
      googleSubject: googleIdentity.subject,
      avatarUrl: googleIdentity.avatarUrl,
    });
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingUser);
    prisma.user.update.mockResolvedValue(linkedUser);

    await service.loginWithGoogle("credential");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: {
        googleSubject: googleIdentity.subject,
        email: googleIdentity.email,
        displayName: googleIdentity.displayName,
        avatarUrl: googleIdentity.avatarUrl,
      },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("recusa juntar duas contas diferentes pelo mesmo e-mail", async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique
      .mockResolvedValueOnce(user({ id: "subject-user" }))
      .mockResolvedValueOnce(user({ id: "email-user" }));

    await expect(service.loginWithGoogle("credential")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("AuthService profile completion", () => {
  it("valida os dígitos verificadores do CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("salva usuário normalizado, nascimento e CPF no primeiro acesso", async () => {
    const { prisma, service } = setup();
    const completedAt = new Date("2026-08-26T12:00:00.000Z");
    prisma.user.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValue(
      user({
        username: "edu.silva",
        birthDate: new Date("1995-05-20T00:00:00.000Z"),
        cpf: "52998224725",
        profileCompletedAt: completedAt,
      }),
    );

    const result = await service.completeProfile("user-id", {
      username: "  EDU.SILVA  ",
      birthDate: "1995-05-20",
      cpf: "529.982.247-25",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-id" },
      data: {
        username: "edu.silva",
        birthDate: new Date("1995-05-20T00:00:00.000Z"),
        cpf: "52998224725",
        profileCompletedAt: expect.any(Date) as Date,
      },
    });
    expect(result).toMatchObject({
      username: "edu.silva",
      profileCompleted: true,
    });
  });

  it("recusa CPF inválido antes de consultar o banco", async () => {
    const { prisma, service } = setup();

    await expect(
      service.completeProfile("user-id", {
        username: "edu.silva",
        birthDate: "1995-05-20",
        cpf: "111.111.111-11",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it("recusa nome de usuário já utilizado", async () => {
    const { prisma, service } = setup();
    prisma.user.findFirst
      .mockResolvedValueOnce(user({ id: "other-user" }))
      .mockResolvedValueOnce(null);

    await expect(
      service.completeProfile("user-id", {
        username: "pessoa",
        birthDate: "1995-05-20",
        cpf: "529.982.247-25",
      }),
    ).rejects.toThrow("Este nome de usuário já está em uso.");
  });
});

describe("GoogleIdentityService", () => {
  it("falha de forma explícita quando o Client ID não está configurado", async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) };
    const service = new GoogleIdentityService(
      config as unknown as ConfigService,
    );

    await expect(service.verifyIdToken("credential")).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
