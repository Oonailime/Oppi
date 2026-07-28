import { BadRequestException } from "@nestjs/common";
import {
  AttemptMode,
  ContestType,
  ForeignLanguage,
} from "@prisma/client";
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
const contestId = "contest-1";

function enemDayQuestions(day: 1 | 2, languageVariants: boolean) {
  const commonCount = languageVariants ? 85 : 90;
  return [
    ...Array.from({ length: commonCount }, () => ({
      examDay: day,
      variant: "",
      weight: 1,
    })),
    ...(languageVariants
      ? Array.from({ length: 5 }, () => ({
          examDay: day,
          variant: ForeignLanguage.ENGLISH,
          weight: 1,
        }))
      : []),
    ...(languageVariants
      ? Array.from({ length: 5 }, () => ({
          examDay: day,
          variant: ForeignLanguage.SPANISH,
          weight: 1,
        }))
      : []),
  ];
}

describe("QuestionsService", () => {
  it("formata as durações oficial e adicional de uma prova", async () => {
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          exams: [
            {
              exam: {
                ...cebraspeExam,
                defaultDurationMinutes: 210,
                extendedDurationMinutes: 270,
                questions: [{ variant: "", weight: 1 }],
              },
            },
          ],
        }),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listExams(contestId);

    expect(result.at(0)?.durationOptions).toEqual([
      {
        minutes: 210,
        label: "3h30 para resolver (tempo regular)",
        extended: false,
      },
      {
        minutes: 270,
        label: "4h30 para resolver (tempo adicional)",
        extended: true,
      },
    ]);
  });

  it("expõe 90 questões e os tempos corretos por dia em 2016 e no formato atual", async () => {
    const exam = (
      year: number,
      day1HasLanguage: boolean,
      day2HasLanguage: boolean,
    ) => ({
      ...cebraspeExam,
      id: `enem-${year}`,
      name: `ENEM ${year}`,
      organization: "INEP",
      year,
      questions: [
        ...enemDayQuestions(1, day1HasLanguage),
        ...enemDayQuestions(2, day2HasLanguage),
      ],
    });
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          exams: [
            { exam: exam(2025, true, false) },
            { exam: exam(2016, false, true) },
          ],
        }),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listExams(contestId);
    const current = result.find((item) => item.year === 2025);
    const oldFormat = result.find((item) => item.year === 2016);

    expect(current?.dayOptions).toMatchObject([
      {
        day: 1,
        questionCount: 90,
        includesEssay: true,
        officialDurationMinutes: 330,
        objectiveDurationMinutes: 270,
        extendedObjectiveDurationMinutes: 330,
        hasLanguageVariants: true,
      },
      {
        day: 2,
        questionCount: 90,
        includesEssay: false,
        officialDurationMinutes: 300,
        objectiveDurationMinutes: 300,
        extendedObjectiveDurationMinutes: 360,
        hasLanguageVariants: false,
      },
    ]);
    expect(oldFormat?.dayOptions).toMatchObject([
      {
        day: 1,
        questionCount: 90,
        includesEssay: false,
        officialDurationMinutes: 270,
        objectiveDurationMinutes: 270,
      },
      {
        day: 2,
        questionCount: 90,
        includesEssay: true,
        officialDurationMinutes: 330,
        objectiveDurationMinutes: 270,
        hasLanguageVariants: true,
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
        findFirst: jest.fn().mockResolvedValue(cebraspeExam),
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
      contestId,
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

  it("agrega as disciplinas de todas as edições de um concurso recorrente", async () => {
    const groupBy = jest.fn().mockResolvedValue([
      { discipline: "Física", _count: { id: 130 } },
      { discipline: "Química", _count: { id: 198 } },
    ]);
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          type: ContestType.RECURRING,
          exams: [{ examId: "enem-2016" }, { examId: "enem-2025" }],
        }),
      },
      question: { groupBy },
      attemptAnswer: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listDisciplines(
      undefined,
      contestId,
    );

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { examId: { in: ["enem-2016", "enem-2025"] } },
      }),
    );
    expect(result).toEqual([
      {
        name: "Física",
        questionCount: 130,
        bestPercentage: null,
        progressStatus: "NOT_STARTED",
      },
      {
        name: "Química",
        questionCount: 198,
        bestPercentage: null,
        progressStatus: "NOT_STARTED",
      },
    ]);
  });

  it("retorna apenas C e E nas questões de uma prova Cebraspe", async () => {
    const transactionClient = {
      attempt: {
        create: jest.fn().mockResolvedValue({
          id: "attempt-1",
          mode: AttemptMode.FULL,
          discipline: null,
          foreignLanguage: null,
          startedAt: new Date(),
          timeLimitSeconds: 10800,
          targetSecondsPerQuestion: 90,
        }),
      },
      attemptQuestion: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    async function runTransaction<T>(
      callback: (client: typeof transactionClient) => Promise<T>,
    ) {
      return callback(transactionClient);
    }
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          name: "SERPRO",
          type: ContestType.STANDARD,
          exams: [{ exam: cebraspeExam }],
        }),
      },
      question: {
        count: jest
          .fn()
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(120),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 141,
            examId: cebraspeExam.id,
            number: 1,
            variant: "",
            discipline: "Língua Portuguesa",
            subject: "Interpretação de texto",
            weight: 1,
            sourcePage: 1,
            sourceImage: "/questions/serpro-2023/q-001.png",
            contextImage: "/questions/serpro-2023/context-basic-p-01.png",
            exam: cebraspeExam,
          },
        ]),
      },
      $transaction: jest.fn(runTransaction),
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start({
      examId: cebraspeExam.id,
      mode: AttemptMode.FULL,
      durationMinutes: 180,
    }, contestId);

    expect(result.questions).toHaveLength(1);
    expect(result.questions.at(0)?.options).toEqual(["C", "E"]);
  });

  it("rejeita alternativa que não pertence à prova", async () => {
    const prisma = {
      attempt: {
        findFirst: jest.fn().mockResolvedValue({
          id: "attempt-1",
          mode: AttemptMode.FULL,
          discipline: null,
          completedAt: null,
          questions: [
            {
              position: 1,
              question: {
                id: 141,
                number: 1,
                discipline: "Língua Portuguesa",
                subject: "Interpretação de texto",
                weight: 1,
                correctAnswer: "C",
                annulled: false,
                studyTopicId: null,
                studyTopic: null,
                exam: cebraspeExam,
              },
            },
          ],
        }),
      },
    } as unknown as PrismaService;

    const submission = new QuestionsService(prisma).submit(
      "attempt-1",
      {
        answers: [
          {
            questionId: 141,
            selectedAnswer: "A",
            timeSpentSeconds: 30,
          },
        ],
        durationSeconds: 30,
      },
      contestId,
    );

    await expect(submission).rejects.toBeInstanceOf(BadRequestException);
  });

  it("persiste a ordem por ano no treino recorrente de uma disciplina", async () => {
    const enem2016 = {
      ...cebraspeExam,
      id: "enem-2016",
      name: "ENEM 2016",
      organization: "INEP",
      year: 2016,
      answerOptions: ["A", "B", "C", "D", "E"],
      defaultDurationMinutes: 630,
      extendedDurationMinutes: 750,
    };
    const enem2017 = { ...enem2016, id: "enem-2017", name: "ENEM 2017", year: 2017 };
    const attemptCreate = jest.fn(
      async (input: {
        data: {
          examId: string | null | undefined;
          mode: AttemptMode;
          discipline: string | undefined;
          foreignLanguage: ForeignLanguage | undefined;
        };
      }) => {
        void input;
        return {
          id: "attempt-all",
          mode: AttemptMode.ALL_YEARS,
          discipline: "Língua Inglesa",
          foreignLanguage: ForeignLanguage.ENGLISH,
          startedAt: new Date(),
          timeLimitSeconds: 360,
          targetSecondsPerQuestion: 180,
        };
      },
    );
    const attemptQuestionCreateMany = jest
      .fn()
      .mockResolvedValue({ count: 2 });
    const transactionClient = {
      attempt: { create: attemptCreate },
      attemptQuestion: { createMany: attemptQuestionCreateMany },
    };
    async function runTransaction<T>(
      callback: (client: typeof transactionClient) => Promise<T>,
    ) {
      return callback(transactionClient);
    }
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          name: "ENEM",
          type: ContestType.RECURRING,
          exams: [{ exam: enem2016 }, { exam: enem2017 }],
        }),
      },
      question: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            examId: enem2016.id,
            number: 1,
            variant: "ENGLISH",
            discipline: "Língua Inglesa",
            subject: "Interpretação",
            weight: 1,
            sourcePage: 2,
            sourceImage: "/questions/enem-2016/q-001-english.png",
            contextImage: null,
            exam: enem2016,
          },
          {
            id: 2,
            examId: enem2017.id,
            number: 1,
            variant: "ENGLISH",
            discipline: "Língua Inglesa",
            subject: "Interpretação",
            weight: 1,
            sourcePage: 2,
            sourceImage: "/questions/enem-2017/q-001-english.png",
            contextImage: null,
            exam: enem2017,
          },
        ]),
      },
      $transaction: jest.fn(runTransaction),
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start(
      {
        mode: AttemptMode.ALL_YEARS,
        discipline: "Língua Inglesa",
        durationMinutes: 6,
      },
      contestId,
    );

    expect(result.exam.id).toBe("all-years");
    expect(result.questions.map((question) => question.examYear)).toEqual([
      2016,
      2017,
    ]);
    expect(attemptCreate.mock.calls.at(0)?.at(0)?.data).toMatchObject({
      examId: null,
      mode: AttemptMode.ALL_YEARS,
      discipline: "Língua Inglesa",
      foreignLanguage: ForeignLanguage.ENGLISH,
    });
    expect(attemptQuestionCreateMany).toHaveBeenCalledWith({
      data: [
        { attemptId: "attempt-all", questionId: 1, position: 1 },
        { attemptId: "attempt-all", questionId: 2, position: 2 },
      ],
    });
  });

  it("inicia somente as 90 questões do dia escolhido na prova anual do ENEM", async () => {
    const enem2025 = {
      ...cebraspeExam,
      id: "enem-2025",
      name: "ENEM 2025",
      organization: "INEP",
      year: 2025,
      answerOptions: ["A", "B", "C", "D", "E"],
      defaultDurationMinutes: 630,
      extendedDurationMinutes: 750,
    };
    const questionRows = Array.from({ length: 90 }, (_, index) => ({
        id: index + 1,
        examId: enem2025.id,
        number: index + 91,
        examDay: 2,
        variant: "",
        discipline: "Matemática",
        subject: "Conhecimentos numéricos",
        weight: 1,
        sourcePage: 2,
        sourceImage: `/questions/enem-2025/q-${index + 91}.png`,
        contextImage: null,
        exam: enem2025,
      }));
    let findManyInput: { where: { examDay?: number } } | undefined;
    const questionFindMany = jest.fn(
      async (input: { where: { examDay?: number } }) => {
        findManyInput = input;
        return questionRows;
      },
    );
    let attemptCreateInput:
      | {
          data: {
            examDay?: number;
            totalQuestions: number;
            timeLimitSeconds: number;
            targetSecondsPerQuestion: number;
          };
        }
      | undefined;
    const attemptCreate = jest.fn(
      async (input: NonNullable<typeof attemptCreateInput>) => {
        attemptCreateInput = input;
        return {
        id: "attempt-day-2",
        mode: AttemptMode.FULL,
        examDay: 2,
        discipline: null,
        foreignLanguage: null,
        startedAt: new Date(),
        timeLimitSeconds: 18_000,
        targetSecondsPerQuestion: 200,
        };
      },
    );
    const transactionClient = {
      attempt: { create: attemptCreate },
      attemptQuestion: {
        createMany: jest.fn().mockResolvedValue({ count: 90 }),
      },
    };
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          name: "ENEM",
          type: ContestType.RECURRING,
          exams: [{ exam: enem2025 }],
        }),
      },
      question: {
        count: jest.fn().mockResolvedValue(0),
        findMany: questionFindMany,
      },
      $transaction: jest.fn(
        async <T>(
          callback: (client: typeof transactionClient) => Promise<T>,
        ) => callback(transactionClient),
      ),
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start(
      {
        examId: enem2025.id,
        examDay: 2,
        mode: AttemptMode.FULL,
        durationMinutes: 300,
      },
      contestId,
    );

    expect(findManyInput?.where.examDay).toBe(2);
    expect(attemptCreateInput?.data).toMatchObject({
      examDay: 2,
      totalQuestions: 90,
      timeLimitSeconds: 18_000,
      targetSecondsPerQuestion: 200,
    });
    expect(result.examDay).toBe(2);
    expect(result.questions).toHaveLength(90);
  });

  it("salva respostas, posição e tempos de um simulado para continuar depois", async () => {
    let updateInput:
      | {
          where: {
            id: string;
            contestId: string;
            completedAt: null;
          };
          data: {
            draftAnswers: Array<{
              questionId: number;
              selectedAnswer: string;
            }>;
            draftQuestionTimes: Array<{
              questionId: number;
              timeSpentSeconds: number;
            }>;
            draftCurrentIndex: number;
            draftElapsedSeconds: number;
            draftSavedAt: Date;
          };
        }
      | undefined;
    const updateMany = jest.fn(
      async (input: NonNullable<typeof updateInput>) => {
        updateInput = input;
        return { count: 1 };
      },
    );
    const prisma = {
      attempt: {
        findFirst: jest.fn().mockResolvedValue({
          completedAt: null,
          totalQuestions: 2,
          questions: [
            {
              questionId: 141,
              question: { exam: { answerOptions: ["C", "E"] } },
            },
            {
              questionId: 142,
              question: { exam: { answerOptions: ["C", "E"] } },
            },
          ],
        }),
        updateMany,
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).saveDraft(
      "attempt-1",
      {
        answers: [{ questionId: 141, selectedAnswer: "C" }],
        questionTimes: [
          { questionId: 141, timeSpentSeconds: 35 },
          { questionId: 142, timeSpentSeconds: 10 },
        ],
        currentIndex: 1,
        elapsedSeconds: 45,
      },
      contestId,
    );

    expect(updateInput).toMatchObject({
      where: {
        id: "attempt-1",
        contestId,
        completedAt: null,
      },
      data: {
        draftAnswers: [{ questionId: 141, selectedAnswer: "C" }],
        draftQuestionTimes: [
          { questionId: 141, timeSpentSeconds: 35 },
          { questionId: 142, timeSpentSeconds: 10 },
        ],
        draftCurrentIndex: 1,
        draftElapsedSeconds: 45,
      },
    });
    expect(updateInput?.data.draftSavedAt).toBeInstanceOf(Date);
    expect(result).toMatchObject({
      attemptId: "attempt-1",
      answeredQuestions: 1,
      currentIndex: 1,
      elapsedSeconds: 45,
    });
  });

  it("lista rascunhos incompletos com o progresso salvo", async () => {
    const prisma = {
      attempt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "attempt-draft",
            contest: { name: "SERPRO" },
            mode: AttemptMode.FULL,
            examDay: null,
            discipline: null,
            foreignLanguage: null,
            startedAt: new Date("2026-07-28T10:00:00.000Z"),
            draftSavedAt: new Date("2026-07-28T11:00:00.000Z"),
            draftAnswers: [
              { questionId: 141, selectedAnswer: "C" },
            ],
            draftQuestionTimes: [
              { questionId: 141, timeSpentSeconds: 35 },
            ],
            draftCurrentIndex: 1,
            draftElapsedSeconds: 45,
            totalQuestions: 2,
            questions: [
              { position: 1, question: { exam: cebraspeExam } },
              { position: 2, question: { exam: cebraspeExam } },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listDrafts(contestId);

    expect(result).toEqual([
      expect.objectContaining({
        id: "attempt-draft",
        answeredQuestions: 1,
        currentIndex: 1,
        elapsedSeconds: 45,
        totalQuestions: 2,
        lastSavedAt: new Date("2026-07-28T11:00:00.000Z"),
      }),
    ]);
  });
});
