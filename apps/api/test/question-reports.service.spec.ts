import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaService } from "../src/prisma/prisma.service";
import { QuestionReportsService } from "../src/questions/question-reports.service";

describe("QuestionReportsService", () => {
  let reportDirectory: string;
  let reportsFile: string;

  beforeEach(async () => {
    reportDirectory = await mkdtemp(join(tmpdir(), "dataprev-reports-"));
    reportsFile = join(
      reportDirectory,
      "reported-question-errors.json",
    );
    process.env.QUESTION_REPORTS_FILE = reportsFile;
  });

  afterEach(async () => {
    delete process.env.QUESTION_REPORTS_FILE;
    await rm(reportDirectory, { recursive: true });
  });

  it("adiciona a questão verificada e o contexto do relato ao arquivo JSON", async () => {
    const prisma = {
      attemptQuestion: {
        findFirst: jest.fn().mockResolvedValue({
          attempt: {
            id: "attempt-1",
            completedAt: null,
            contest: {
              id: "contest-1",
              name: "DATAPREV 2026",
              user: { id: "user-1", username: "emiliano" },
            },
          },
          question: {
            id: 141,
            number: 1,
            examDay: null,
            variant: "",
            discipline: "Língua Portuguesa",
            subject: "Compreensão e interpretação de textos",
            studyTopicId: 1,
            studyTopic: {
              subject: "Compreensão e interpretação de textos",
            },
            sourcePage: 2,
            sourceImage: "/questions/dataprev-2024/q-1.png",
            contextImage: null,
            correctAnswer: "B",
            annulled: false,
            exam: {
              id: "dataprev-2024",
              name: "DATAPREV 2024",
              year: 2024,
              organization: "DATAPREV",
            },
          },
        }),
      },
    } as unknown as PrismaService;

    await new QuestionReportsService(prisma).report(
      "attempt-1",
      141,
      {
        issueType: "ANSWER_KEY",
        description: "  O gabarito parece incorreto.  ",
        selectedAnswer: "A",
        screenUrl: "http://localhost:3000/simulado/attempt-1",
      },
      "contest-1",
    );

    const reports: unknown = JSON.parse(
      await readFile(reportsFile, "utf8"),
    );
    expect(Array.isArray(reports)).toBe(true);
    const [report] = reports as Array<{
      status: string;
      issueType: string;
      description: string;
      question: {
        id: number;
        studyTopicId: number | null;
        correctAnswer: string | null;
        exam: { id: string };
      };
      context: {
        contestId: string;
        userId: string;
        attemptId: string;
        selectedAnswer: string | null;
      };
    }>;
    expect(report).toMatchObject({
      status: "OPEN",
      issueType: "ANSWER_KEY",
      description: "O gabarito parece incorreto.",
      question: {
        id: 141,
        studyTopicId: 1,
        correctAnswer: "B",
        exam: { id: "dataprev-2024" },
      },
      context: {
        contestId: "contest-1",
        userId: "user-1",
        attemptId: "attempt-1",
        selectedAnswer: "A",
      },
    });
  });
});
