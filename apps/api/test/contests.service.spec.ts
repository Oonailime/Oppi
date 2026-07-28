import { BadRequestException } from "@nestjs/common";
import {
  ContestDocumentKind,
  ContestType,
} from "@prisma/client";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ContestsService } from "../src/contests/contests.service";
import { PrismaService } from "../src/prisma/prisma.service";

const userId = "user-1";
const uploadRoot = path.join("/tmp", "estuda-contest-upload-tests");
const createdContest = {
  id: "contest-1",
  userId,
  name: "Novo concurso",
  targetDate: null,
  type: ContestType.STANDARD,
  systemManaged: false,
  desiredArea: "Tecnologia da Informação",
  description: "Foco no cargo de desenvolvimento.",
  storageDirectory: "contest-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

type ContestCreateCall = {
  data: {
    id: string;
    userId: string;
    name: string;
    targetDate: Date | null;
    desiredArea: string;
    description: string;
    storageDirectory: string;
    documents: {
      create: Array<{
        kind: ContestDocumentKind;
        storedName: string;
      }>;
    };
    exams?: {
      create: Array<{ examId: string }>;
    };
  };
};

function pdf(originalname: string) {
  const buffer = Buffer.from("%PDF-1.7\narquivo de teste");
  return {
    originalname,
    mimetype: "application/pdf",
    size: buffer.length,
    buffer,
  };
}

const documents = {
  previousExam: [pdf("prova.pdf")],
  answerKey: [pdf("gabarito.pdf")],
  notice: [pdf("edital.pdf")],
};
const contestInput = {
  name: "Novo concurso",
  desiredArea: "Tecnologia da Informação",
  description: "Foco no cargo de desenvolvimento.",
};

describe("ContestsService", () => {
  beforeEach(async () => {
    process.env.CONTEST_UPLOAD_ROOT = uploadRoot;
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  afterAll(async () => {
    await fs.rm(uploadRoot, { recursive: true, force: true });
    delete process.env.CONTEST_UPLOAD_ROOT;
  });

  it("cria um concurso sem provas reutilizadas, mas com os três PDFs isolados", async () => {
    let createCall: ContestCreateCall | undefined;
    const create = jest.fn(async (input: ContestCreateCall) => {
      createCall = input;
      return createdContest;
    });
    const prisma = {
      exam: { count: jest.fn() },
      contest: { create },
    } as unknown as PrismaService;

    await new ContestsService(prisma).create(
      userId,
      contestInput,
      documents,
    );

    const createData = createCall?.data;
    expect(typeof createData?.id).toBe("string");
    expect(createData).toMatchObject({
      userId,
      name: "Novo concurso",
      targetDate: null,
      desiredArea: "Tecnologia da Informação",
      description: "Foco no cargo de desenvolvimento.",
    });
    expect(
      createData?.documents.create.map(({ kind, storedName }) => ({
        kind,
        storedName,
      })),
    ).toEqual([
      {
        kind: ContestDocumentKind.PREVIOUS_EXAM,
        storedName: "prova-anterior.pdf",
      },
      {
        kind: ContestDocumentKind.ANSWER_KEY,
        storedName: "gabarito.pdf",
      },
      {
        kind: ContestDocumentKind.NOTICE,
        storedName: "edital.pdf",
      },
    ]);
    expect(createData?.exams).toBeUndefined();
    if (!createData) throw new Error("Criação do concurso não foi chamada.");
    const storedFiles = await fs.readdir(
      path.join(uploadRoot, createData.storageDirectory),
    );
    expect(storedFiles.sort()).toEqual([
      "descricao.json",
      "edital.pdf",
      "gabarito.pdf",
      "prova-anterior.pdf",
    ]);
  });

  it("associa somente as provas internas escolhidas antes da criação", async () => {
    let createCall: ContestCreateCall | undefined;
    const create = jest.fn(async (input: ContestCreateCall) => {
      createCall = input;
      return createdContest;
    });
    const count = jest.fn().mockResolvedValue(2);
    const prisma = {
      exam: { count },
      contest: { create },
    } as unknown as PrismaService;

    await new ContestsService(prisma).create(
      userId,
      {
        ...contestInput,
        examIds: ["dataprev-2024", "enem-2025"],
      },
      documents,
    );

    expect(count).toHaveBeenCalledWith({
      where: {
        id: { in: ["dataprev-2024", "enem-2025"] },
        systemManaged: true,
      },
    });
    expect(createCall?.data.exams).toEqual({
      create: [
        { examId: "dataprev-2024" },
        { examId: "enem-2025" },
      ],
    });
  });

  it("rejeita uma prova que não foi criada pelo desenvolvimento", async () => {
    const prisma = {
      exam: { count: jest.fn().mockResolvedValue(0) },
      contest: { create: jest.fn() },
    } as unknown as PrismaService;

    await expect(
      new ContestsService(prisma).create(
        userId,
        {
          ...contestInput,
          examIds: ["prova-externa"],
        },
        documents,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("exige prova, gabarito e edital em PDF válido", async () => {
    const prisma = {
      exam: { count: jest.fn() },
      contest: { create: jest.fn() },
    } as unknown as PrismaService;

    await expect(
      new ContestsService(prisma).create(userId, contestInput, {
        previousExam: documents.previousExam,
      }),
    ).rejects.toThrow("Envie o PDF de gabarito correspondente.");
  });
});
