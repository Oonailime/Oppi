import { BadRequestException } from "@nestjs/common";
import { AttemptMode } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { QuestionsService } from "../src/questions/questions.service";

const cebraspeExam = {
  id: "serpro-2023",
  name: "SERPRO 2023",
  organization: "SERPRO",
  year: 2023,
  role: "Analista - Tecnologia",
  answerOptions: ["C", "E"],
  defaultDurationMinutes: 180,
  extendedDurationMinutes: 240,
  createdAt: new Date(),
};

describe("QuestionsService", () => {
  it("formata as durações oficial e adicional de uma prova", async () => {
    const prisma = {
      exam: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...cebraspeExam,
            defaultDurationMinutes: 210,
            extendedDurationMinutes: 270,
            questions: [{ weight: 1 }],
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listExams();

    expect(result.at(0)?.durationOptions).toEqual([
      {
        minutes: 210,
        label: "3h30 para resolver (tempo regular)",
        extended: false,
      },
      {
        minutes: 270,
        label: "4h30 para resolver (com 1h adicional)",
        extended: true,
      },
    ]);
  });

  it("deriva o melhor status de cada disciplina pelo histórico de respostas", async () => {
    const answer = (
      attemptId: string,
      discipline: string,
      isCorrect: boolean,
    ) => ({
      attemptId,
      isCorrect,
      question: { annulled: false, discipline },
    });
    const prisma = {
      exam: {
        findUnique: jest.fn().mockResolvedValue(cebraspeExam),
      },
      question: {
        groupBy: jest.fn().mockResolvedValue([
          { discipline: "Governança", _count: { id: 1 } },
          { discipline: "Português", _count: { id: 2 } },
          { discipline: "Redes", _count: { id: 5 } },
          { discipline: "Segurança", _count: { id: 5 } },
        ]),
      },
      attemptAnswer: {
        findMany: jest.fn().mockResolvedValue([
          answer("attempt-1", "Português", true),
          answer("attempt-1", "Português", true),
          answer("attempt-1", "Segurança", true),
          answer("attempt-1", "Segurança", true),
          answer("attempt-1", "Segurança", true),
          answer("attempt-1", "Segurança", false),
          answer("attempt-2", "Segurança", true),
          answer("attempt-2", "Segurança", true),
          answer("attempt-2", "Segurança", true),
          answer("attempt-2", "Segurança", true),
          answer("attempt-2", "Segurança", false),
          answer("attempt-2", "Governança", false),
        ]),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listDisciplines(
      cebraspeExam.id,
    );

    expect(result).toEqual([
      {
        name: "Governança",
        questionCount: 1,
        bestPercentage: 0,
        progressStatus: "REVIEW",
      },
      {
        name: "Português",
        questionCount: 2,
        bestPercentage: 100,
        progressStatus: "MASTERED",
      },
      {
        name: "Redes",
        questionCount: 5,
        bestPercentage: null,
        progressStatus: "NOT_STARTED",
      },
      {
        name: "Segurança",
        questionCount: 5,
        bestPercentage: 80,
        progressStatus: "GOOD",
      },
    ]);
  });

  it("retorna apenas C e E nas questões de uma prova Cebraspe", async () => {
    const prisma = {
      exam: {
        findUnique: jest.fn().mockResolvedValue(cebraspeExam),
      },
      question: {
        count: jest.fn().mockResolvedValue(120),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 141,
            number: 1,
            discipline: "Língua Portuguesa",
            subject: "Interpretação de texto",
            weight: 1,
            sourcePage: 1,
            sourceImage: "/questions/serpro-2023/q-001.png",
            contextImage: "/questions/serpro-2023/context-basic-p-01.png",
          },
        ]),
      },
      attempt: {
        create: jest.fn().mockResolvedValue({
          id: "attempt-1",
          mode: AttemptMode.FULL,
          discipline: null,
          startedAt: new Date(),
          timeLimitSeconds: 10800,
          targetSecondsPerQuestion: 90,
        }),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start({
      examId: cebraspeExam.id,
      mode: AttemptMode.FULL,
      durationMinutes: 180,
    });

    expect(result.questions).toHaveLength(1);
    expect(result.questions.at(0)?.options).toEqual(["C", "E"]);
  });

  it("rejeita alternativa que não pertence à prova", async () => {
    const prisma = {
      attempt: {
        findUnique: jest.fn().mockResolvedValue({
          id: "attempt-1",
          examId: cebraspeExam.id,
          mode: AttemptMode.FULL,
          discipline: null,
          completedAt: null,
          exam: cebraspeExam,
        }),
      },
      question: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 141,
            number: 1,
            discipline: "Língua Portuguesa",
            subject: "Interpretação de texto",
            weight: 1,
            correctAnswer: "C",
            annulled: false,
            studyTopicId: null,
            studyTopic: null,
          },
        ]),
      },
    } as unknown as PrismaService;

    const submission = new QuestionsService(prisma).submit("attempt-1", {
      answers: [
        {
          questionId: 141,
          selectedAnswer: "A",
          timeSpentSeconds: 30,
        },
      ],
      durationSeconds: 30,
    });

    await expect(submission).rejects.toBeInstanceOf(BadRequestException);
  });
});
