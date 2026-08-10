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

  it("deriva o status de cada disciplina pela cobertura acumulada de acertos", async () => {
    const answer = (
      attemptId: string,
      questionId: number,
      discipline: string,
      isCorrect: boolean,
    ) => ({
      attemptId,
      isCorrect,
      question: { id: questionId, annulled: false, discipline },
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
          answer("attempt-1", 1, "Português", true),
          answer("attempt-1", 2, "Português", true),
          answer("attempt-1", 3, "Segurança", true),
          answer("attempt-1", 4, "Segurança", true),
          answer("attempt-1", 5, "Segurança", true),
          answer("attempt-1", 6, "Segurança", false),
          answer("attempt-2", 3, "Segurança", true),
          answer("attempt-2", 4, "Segurança", true),
          answer("attempt-2", 5, "Segurança", true),
          answer("attempt-2", 6, "Segurança", true),
          answer("attempt-2", 7, "Segurança", false),
          answer("attempt-2", 8, "Governança", false),
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

  it("não marca a disciplina como dominada por um simulado filtrado de uma questão", async () => {
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue(cebraspeExam),
      },
      question: {
        groupBy: jest.fn().mockResolvedValue([
          {
            discipline: "Língua Portuguesa",
            _count: { id: 12 },
          },
        ]),
      },
      attemptAnswer: {
        findMany: jest.fn().mockResolvedValue([
          {
            isCorrect: true,
            question: {
              id: 141,
              annulled: false,
              discipline: "Língua Portuguesa",
            },
          },
        ]),
      },
    } as unknown as PrismaService;

    const [result] = await new QuestionsService(prisma).listDisciplines(
      cebraspeExam.id,
      contestId,
    );

    expect(result).toMatchObject({
      bestPercentage: 8.33,
      progressStatus: "REVIEW",
    });
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
        where: {
          examId: { in: ["enem-2016", "enem-2025"] },
          annulled: false,
        },
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

  it("lista assuntos com o total disponível e desconta questões já acertadas", async () => {
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          exams: [{ examId: "enem-2024" }, { examId: "enem-2025" }],
        }),
      },
      question: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            studyTopic: {
              id: 11202,
              subject: "Movimento, forças e equilíbrio",
              detail: "Mecânica.",
              topicCode: "CN-FIS2",
              topicTitle: "Movimento, equilíbrio e leis físicas",
              competencyCodes: ["CN-C6"],
              skillCodes: ["CN-H20"],
              sortOrder: 1,
            },
          },
          {
            id: 2,
            studyTopic: {
              id: 11202,
              subject: "Movimento, forças e equilíbrio",
              detail: "Mecânica.",
              topicCode: "CN-FIS2",
              topicTitle: "Movimento, equilíbrio e leis físicas",
              competencyCodes: ["CN-C6"],
              skillCodes: ["CN-H20"],
              sortOrder: 1,
            },
          },
          {
            id: 3,
            studyTopic: {
              id: 11207,
              subject: "Calor e fenômenos térmicos",
              detail: "Termologia.",
              topicCode: "CN-FIS7",
              topicTitle: "Calor e fenômenos térmicos",
              competencyCodes: ["CN-C6"],
              skillCodes: ["CN-H21"],
              sortOrder: 1,
            },
          },
        ]),
      },
      attemptAnswer: {
        findMany: jest.fn().mockResolvedValue([{ questionId: 1 }]),
      },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).listSubjects(
      "Física",
      contestId,
    );

    expect(result).toMatchObject([
      {
        id: 11202,
        name: "Movimento, forças e equilíbrio",
        questionCount: 2,
        correctQuestionCount: 1,
        unmasteredQuestionCount: 1,
      },
      {
        id: 11207,
        name: "Calor e fenômenos térmicos",
        questionCount: 1,
        correctQuestionCount: 0,
        unmasteredQuestionCount: 1,
      },
    ]);
  });

  it("limita os assuntos à prova selecionada quando o filtro é específico", async () => {
    const questionFindMany = jest.fn(
      async (query: { where: { examId: { in: string[] } } }) => {
        void query;
        return [];
      },
    );
    const prisma = {
      exam: {
        findFirst: jest.fn().mockResolvedValue(cebraspeExam),
      },
      question: {
        findMany: questionFindMany,
      },
      attemptAnswer: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    await new QuestionsService(prisma).listSubjects(
      "Língua Portuguesa",
      contestId,
      cebraspeExam.id,
    );

    expect(questionFindMany.mock.calls[0]?.[0].where.examId).toEqual({
      in: [cebraspeExam.id],
    });
  });

  it("limita o cronômetro do treino DATAPREV ao total de questões da disciplina", async () => {
    const dataprevExam = {
      ...cebraspeExam,
      id: "dataprev-2024",
      name: "DATAPREV 2024",
      organization: "DATAPREV",
      answerOptions: ["A", "B", "C", "D", "E"],
      defaultDurationMinutes: 210,
      extendedDurationMinutes: 270,
    };
    const disciplineQuestions = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      examId: dataprevExam.id,
      number: index + 1,
      examDay: null,
      variant: "",
      discipline: "Língua Portuguesa",
      subject: "Interpretação de texto",
      weight: 1,
      sourcePage: 1,
      sourceImage: `/questions/q-${index + 1}.png`,
      contextImage: null,
      exam: dataprevExam,
    }));
    let attemptData:
      | {
          timeLimitSeconds: number;
          targetSecondsPerQuestion: number;
          totalQuestions: number;
        }
      | undefined;
    const transactionClient = {
      attempt: {
        create: jest.fn(
          async (input: {
            data: NonNullable<typeof attemptData> & {
              mode: AttemptMode;
              discipline?: string;
            };
          }) => {
            attemptData = input.data;
            return {
              id: "attempt-discipline",
              mode: AttemptMode.DISCIPLINE,
              examDay: null,
              discipline: input.data.discipline,
              foreignLanguage: null,
              startedAt: new Date(),
              timeLimitSeconds: input.data.timeLimitSeconds,
              targetSecondsPerQuestion: input.data.targetSecondsPerQuestion,
            };
          },
        ),
      },
      attemptQuestion: {
        createMany: jest.fn().mockResolvedValue({ count: 12 }),
      },
    };
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          name: "DATAPREV 2026",
          type: ContestType.STANDARD,
          exams: [{ exam: dataprevExam }],
        }),
      },
      question: {
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(70),
        findMany: jest.fn().mockResolvedValue(disciplineQuestions),
      },
      $transaction: jest.fn(
        async <T>(
          callback: (client: typeof transactionClient) => Promise<T>,
        ) => callback(transactionClient),
      ),
    } as unknown as PrismaService;

    await new QuestionsService(prisma).start(
      {
        examId: dataprevExam.id,
        mode: AttemptMode.DISCIPLINE,
        discipline: "Língua Portuguesa",
        durationMinutes: 210,
      },
      contestId,
    );

    expect(attemptData).toMatchObject({
      totalQuestions: 12,
      targetSecondsPerQuestion: 180,
      timeLimitSeconds: 2160,
    });
  });

  it("sorteia 10 questões de um assunto sem reutilizar as já acertadas", async () => {
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
    const availableQuestions = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      examId: enem2025.id,
      number: index + 91,
      examDay: 2,
      variant: "",
      discipline: "Física",
      subject: "Movimento, forças e equilíbrio",
      weight: 1,
      sourcePage: 2,
      sourceImage: `/questions/enem-2025/q-${index + 91}.png`,
      contextImage: null,
      exam: enem2025,
    }));
    const attemptCreate = jest.fn(
      async (input: {
        data: {
          trainingTopicId?: number;
          includeCorrectAnswers?: boolean;
          totalQuestions: number;
          timeLimitSeconds: number;
        };
      }) => {
        void input;
        return {
          id: "attempt-topic",
          mode: AttemptMode.ALL_YEARS,
          examDay: null,
          discipline: "Física",
          foreignLanguage: null,
          startedAt: new Date(),
          timeLimitSeconds: 1800,
          targetSecondsPerQuestion: 180,
        };
      },
    );
    const attemptQuestionCreateMany = jest.fn(
      async (input: {
        data: Array<{
          attemptId: string;
          questionId: number;
          position: number;
        }>;
      }) => {
        void input;
        return { count: 10 };
      },
    );
    const transactionClient = {
      attempt: { create: attemptCreate },
      attemptQuestion: { createMany: attemptQuestionCreateMany },
    };
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          name: "ENEM",
          type: ContestType.RECURRING,
          exams: [{ exam: enem2025 }],
        }),
      },
      studyTopic: {
        findFirst: jest.fn().mockResolvedValue({
          id: 11202,
          discipline: "Física",
          subject: "Movimento, forças e equilíbrio",
          topicCode: "CN-FIS2",
          topicTitle: "Movimento, equilíbrio e leis físicas",
        }),
      },
      question: {
        findMany: jest.fn().mockResolvedValue(availableQuestions),
      },
      attemptAnswer: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ questionId: 1 }, { questionId: 2 }]),
      },
      $transaction: jest.fn(
        async <T>(
          callback: (client: typeof transactionClient) => Promise<T>,
        ) => callback(transactionClient),
      ),
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start(
      {
        mode: AttemptMode.ALL_YEARS,
        discipline: "Física",
        studyTopicId: 11202,
        includeCorrectAnswers: false,
        durationMinutes: 30,
      },
      contestId,
    );

    expect(result.questions).toHaveLength(10);
    expect(result.questions.map((question) => question.id)).not.toContain(1);
    expect(result.questions.map((question) => question.id)).not.toContain(2);
    expect(attemptCreate.mock.calls.at(0)?.at(0)?.data).toMatchObject({
        trainingTopicId: 11202,
        includeCorrectAnswers: false,
        totalQuestions: 10,
        timeLimitSeconds: 1800,
    });
    expect(
      attemptQuestionCreateMany.mock.calls.at(0)?.at(0)?.data,
    ).toHaveLength(10);
    expect(
      attemptQuestionCreateMany.mock.calls.at(0)?.at(0)?.data.at(0),
    ).toMatchObject({
      attemptId: "attempt-topic",
      position: 1,
    });
  });

  it("reúne questões do assunto em todas as provas no treino padrão", async () => {
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
    const enem2024 = {
      ...enem2025,
      id: "enem-2024",
      name: "ENEM 2024",
      year: 2024,
    };
    const availableQuestions = Array.from({ length: 3 }, (_, index) => ({
      exam: index === 0 ? enem2024 : enem2025,
      id: index + 1,
      examId: index === 0 ? enem2024.id : enem2025.id,
      number: index + 1,
      examDay: 1,
      variant: "",
      discipline: "Língua Portuguesa",
      subject: "Interpretação de texto",
      weight: 1,
      sourcePage: 2,
      sourceImage: `/questions/enem-2025/q-${index + 1}.png`,
      contextImage: null,
    }));
    let attemptData:
      | { totalQuestions: number; examId?: string | null }
      | undefined;
    const attemptQuestionCreateMany = jest.fn(
      async (input: {
        data: Array<{
          attemptId: string;
          questionId: number;
          position: number;
        }>;
      }) => {
        void input;
        return { count: 3 };
      },
    );
    const transactionClient = {
      attempt: {
        create: jest.fn(async (input: {
          data: { totalQuestions: number; examId?: string | null };
        }) => {
          attemptData = input.data;
          return {
            id: "attempt-small-topic",
            mode: AttemptMode.DISCIPLINE,
            examDay: null,
            discipline: "Língua Portuguesa",
            foreignLanguage: null,
            startedAt: new Date(),
            timeLimitSeconds: 540,
            targetSecondsPerQuestion: 180,
          };
        }),
      },
      attemptQuestion: {
        createMany: attemptQuestionCreateMany,
      },
    };
    const prisma = {
      contest: {
        findUnique: jest.fn().mockResolvedValue({
          name: "ENEM",
          type: ContestType.STANDARD,
          exams: [{ exam: enem2025 }, { exam: enem2024 }],
        }),
      },
      studyTopic: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          discipline: "Língua Portuguesa",
          subject: "Interpretação de texto",
          topicCode: "LC-PORT1",
          topicTitle: "Leitura e interpretação",
        }),
      },
      question: {
        findMany: jest.fn().mockResolvedValue(availableQuestions),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(
        async <T>(
          callback: (client: typeof transactionClient) => Promise<T>,
        ) => callback(transactionClient),
      ),
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start(
      {
        mode: AttemptMode.DISCIPLINE,
        allExams: true,
        discipline: "Língua Portuguesa",
        studyTopicId: 1,
        includeCorrectAnswers: true,
        durationMinutes: 9,
      },
      contestId,
    );

    expect(result.questions).toHaveLength(3);
    expect(result.questions.map((question) => question.id).sort()).toEqual([
      1, 2, 3,
    ]);
    expect(attemptData).toMatchObject({ totalQuestions: 3, examId: null });
    expect(
      attemptQuestionCreateMany.mock.calls.at(0)?.at(0)?.data,
    ).toHaveLength(3);
    expect(
      attemptQuestionCreateMany.mock.calls.at(0)?.at(0)?.data.at(0),
    ).toMatchObject({ attemptId: "attempt-small-topic" });
  });

  it("sorteia 10 questões ainda não acertadas entre todos os assuntos", async () => {
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
    const availableQuestions = Array.from({ length: 18 }, (_, index) => ({
      id: index + 1,
      examId: enem2025.id,
      number: index + 91,
      examDay: 2,
      variant: "",
      discipline: "Física",
      subject: index % 2 === 0 ? "Mecânica" : "Termologia",
      weight: 1,
      sourcePage: 2,
      sourceImage: `/questions/enem-2025/q-${index + 91}.png`,
      contextImage: null,
      exam: enem2025,
    }));
    let attemptData:
      | {
          trainingTopicId?: number;
          totalQuestions: number;
          timeLimitSeconds: number;
          targetSecondsPerQuestion: number;
        }
      | undefined;
    const transactionClient = {
      attempt: {
        create: jest.fn(
          async (input: { data: NonNullable<typeof attemptData> }) => {
            attemptData = input.data;
            return {
              id: "attempt-random-all-subjects",
              mode: AttemptMode.ALL_YEARS,
              examDay: null,
              discipline: "Física",
              foreignLanguage: null,
              startedAt: new Date(),
              timeLimitSeconds: input.data.timeLimitSeconds,
              targetSecondsPerQuestion: input.data.targetSecondsPerQuestion,
            };
          },
        ),
      },
      attemptQuestion: {
        createMany: jest.fn().mockResolvedValue({ count: 10 }),
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
        findMany: jest.fn().mockResolvedValue(availableQuestions),
      },
      attemptAnswer: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ questionId: 1 }, { questionId: 2 }]),
      },
      $transaction: jest.fn(
        async <T>(
          callback: (client: typeof transactionClient) => Promise<T>,
        ) => callback(transactionClient),
      ),
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).start(
      {
        mode: AttemptMode.ALL_YEARS,
        discipline: "Física",
        randomizeQuestions: true,
        durationMinutes: 30,
      },
      contestId,
    );

    expect(result.questions).toHaveLength(10);
    expect(result.questions.map((question) => question.id)).not.toContain(1);
    expect(result.questions.map((question) => question.id)).not.toContain(2);
    expect(attemptData).toMatchObject({
      totalQuestions: 10,
      timeLimitSeconds: 1800,
      targetSecondsPerQuestion: 180,
    });
    expect(attemptData?.trainingTopicId).toBeUndefined();
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

  it("exclui somente um simulado não finalizado do concurso atual", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      attempt: { deleteMany },
    } as unknown as PrismaService;

    const result = await new QuestionsService(prisma).deleteDraft(
      "attempt-draft",
      contestId,
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: "attempt-draft",
        contestId,
        completedAt: null,
      },
    });
    expect(result).toEqual({ id: "attempt-draft" });
  });
});
