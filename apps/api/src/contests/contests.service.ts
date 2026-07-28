import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContestDocumentKind,
  Prisma,
  type Contest,
} from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContestDto } from "./dto/create-contest.dto";
import { UpdateContestDto } from "./dto/update-contest.dto";

interface UploadedPdf {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ContestDocumentFiles {
  previousExam?: UploadedPdf[];
  answerKey?: UploadedPdf[];
  notice?: UploadedPdf[];
}

const DOCUMENT_DEFINITIONS = [
  {
    field: "previousExam",
    kind: ContestDocumentKind.PREVIOUS_EXAM,
    storedName: "prova-anterior.pdf",
    label: "prova anterior ou similar",
  },
  {
    field: "answerKey",
    kind: ContestDocumentKind.ANSWER_KEY,
    storedName: "gabarito.pdf",
    label: "gabarito correspondente",
  },
  {
    field: "notice",
    kind: ContestDocumentKind.NOTICE,
    storedName: "edital.pdf",
    label: "edital",
  },
] as const;

function parseTargetDate(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function serializeContest(contest: Contest) {
  return {
    ...contest,
    targetDate: contest.targetDate?.toISOString().slice(0, 10) ?? null,
  };
}

@Injectable()
export class ContestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const contests = await this.prisma.contest.findMany({
      where: { userId },
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    });
    return contests.map(serializeContest);
  }

  async create(
    userId: string,
    dto: CreateContestDto,
    files: ContestDocumentFiles = {},
  ) {
    const documents = this.validateDocuments(files);
    const examIds = dto.examIds ?? [];
    if (examIds.length > 0) {
      const reusableCount = await this.prisma.exam.count({
        where: {
          id: { in: examIds },
          systemManaged: true,
        },
      });
      if (reusableCount !== examIds.length) {
        throw new BadRequestException(
          "Uma ou mais provas internas selecionadas não estão disponíveis.",
        );
      }
    }

    const contestId = randomUUID();
    const uploadRoot =
      process.env.CONTEST_UPLOAD_ROOT ??
      path.resolve(__dirname, "../../../../uploads/concursos");
    const storageDirectory = path.join(uploadRoot, contestId);

    await fs.mkdir(storageDirectory, { recursive: true });
    try {
      const storedDocuments = await Promise.all(
        documents.map(async ({ definition, file }) => {
          await fs.writeFile(
            path.join(storageDirectory, definition.storedName),
            file.buffer,
            { flag: "wx" },
          );
          return {
            kind: definition.kind,
            originalName: path.basename(file.originalname),
            storedName: definition.storedName,
            mimeType: "application/pdf",
            sizeBytes: file.size,
            sha256: createHash("sha256").update(file.buffer).digest("hex"),
          };
        }),
      );
      await fs.writeFile(
        path.join(storageDirectory, "descricao.json"),
        JSON.stringify(
          {
            contestId,
            name: dto.name.trim(),
            desiredArea: dto.desiredArea.trim(),
            description: dto.description.trim(),
            documents: storedDocuments.map((document) => ({
              kind: document.kind,
              originalName: document.originalName,
              storedName: document.storedName,
              sizeBytes: document.sizeBytes,
              sha256: document.sha256,
            })),
          },
          null,
          2,
        ),
        { encoding: "utf8", flag: "wx" },
      );

      const contest = await this.prisma.contest.create({
        data: {
          id: contestId,
          userId,
          name: dto.name.trim(),
          targetDate: parseTargetDate(dto.targetDate),
          desiredArea: dto.desiredArea.trim(),
          description: dto.description.trim(),
          storageDirectory: contestId,
          documents: {
            create: storedDocuments,
          },
          exams:
            examIds.length === 0
              ? undefined
              : {
                  create: examIds.map((examId) => ({ examId })),
                },
        },
      });
      return serializeContest(contest);
    } catch (error) {
      await fs.rm(storageDirectory, { recursive: true, force: true });
      throw error;
    }
  }

  async listReusableExams(searchValue?: string) {
    const search = searchValue?.trim();
    const numericYear = /^\d{4}$/.test(search ?? "")
      ? Number(search)
      : undefined;
    const searchWhere: Prisma.ExamWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { organization: { contains: search, mode: "insensitive" } },
            { role: { contains: search, mode: "insensitive" } },
            ...(numericYear ? [{ year: numericYear }] : []),
          ],
        }
      : undefined;
    const exams = await this.prisma.exam.findMany({
      where: {
        systemManaged: true,
        AND: searchWhere,
      },
      select: {
        id: true,
        name: true,
        organization: true,
        year: true,
        role: true,
        contestAssignments: {
          where: {
            contest: { systemManaged: true },
          },
          select: {
            contest: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        questions: {
          select: { variant: true },
        },
      },
      orderBy: [{ organization: "asc" }, { year: "desc" }, { name: "asc" }],
    });

    return exams.map(({ contestAssignments, questions, ...exam }) => ({
      ...exam,
      questionCount: questions.filter(
        (question) => question.variant !== "SPANISH",
      ).length,
      sources: contestAssignments.map(({ contest }) => contest),
    }));
  }

  private validateDocuments(files: ContestDocumentFiles) {
    return DOCUMENT_DEFINITIONS.map((definition) => {
      const candidates = files[definition.field] ?? [];
      if (candidates.length !== 1 || !candidates[0]) {
        throw new BadRequestException(
          `Envie o PDF de ${definition.label}.`,
        );
      }
      const file = candidates[0];
      const hasPdfSignature =
        file.buffer.length >= 5 &&
        file.buffer
          .subarray(0, Math.min(file.buffer.length, 1024))
          .includes(Buffer.from("%PDF-"));
      if (
        file.mimetype !== "application/pdf" ||
        !file.originalname.toLowerCase().endsWith(".pdf") ||
        !hasPdfSignature
      ) {
        throw new BadRequestException(
          `O arquivo de ${definition.label} deve ser um PDF válido.`,
        );
      }
      return { definition, file };
    });
  }

  async update(userId: string, id: string, dto: UpdateContestDto) {
    await this.findOwned(userId, id);
    const contest = await this.prisma.contest.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        targetDate:
          dto.targetDate === undefined
            ? undefined
            : parseTargetDate(dto.targetDate),
      },
    });
    return serializeContest(contest);
  }

  async findOwned(userId: string, id: string) {
    const contest = await this.prisma.contest.findFirst({
      where: { id, userId },
    });
    if (!contest) {
      throw new NotFoundException("Concurso não encontrado para este usuário.");
    }
    return contest;
  }
}
