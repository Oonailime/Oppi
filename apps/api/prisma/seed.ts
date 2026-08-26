import { ContestType, PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";
import { hashPassword } from "../src/auth/password";

interface TopicSeed {
  id: number;
  module: string;
  discipline: string;
  syllabusItem: string;
  subject: string;
  detail: string | null;
  page: string;
  suggestedPriority: string;
  topicCode?: string | null;
  topicTitle?: string | null;
  isGroup?: boolean;
  competencyCodes?: string[];
  skillCodes?: string[];
  sortOrder?: number;
}

interface QuestionSeed {
  id?: number;
  number?: number;
  examDay?: number;
  variant?: string;
  discipline: string;
  subject: string;
  weight: number;
  sourcePage: number;
  sourceImage: string;
  contextImage: string | null;
  correctAnswer: string | null;
  annulled: boolean;
  studyTopicId: number | null;
}

interface ExamSeed {
  id: string;
  name: string;
  organization: string;
  year: number;
  role: string | null;
  answerOptions: string[];
  defaultDurationMinutes: number;
  extendedDurationMinutes: number;
  questionsFile: string;
  contestId?: string;
}

const prisma = new PrismaClient();
const dataDirectory = path.join(__dirname, "data");
const EMILIANO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DATAPREV_CONTEST_ID = "dataprev-2026-emiliano";
const ENEM_CONTEST_ID = "enem-recorrente-emiliano";

function readJson<T>(fileName: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(dataDirectory, fileName), "utf8"),
  ) as T;
}

async function main() {
  const dataprevTopics = readJson<TopicSeed[]>("study-topics.json");
  const enemTopics = readJson<TopicSeed[]>("enem-study-topics.json");
  const topics = [...dataprevTopics, ...enemTopics];
  const exams = readJson<ExamSeed[]>("exams.json");
  const passwordHash = hashPassword("123");

  await prisma.user.upsert({
    where: { username: "Emiliano" },
    create: {
      id: EMILIANO_USER_ID,
      username: "Emiliano",
      displayName: "Emiliano",
      passwordHash,
    },
    update: {
      displayName: "Emiliano",
      passwordHash,
    },
  });

  await prisma.contest.upsert({
    where: { id: DATAPREV_CONTEST_ID },
    create: {
      id: DATAPREV_CONTEST_ID,
      userId: EMILIANO_USER_ID,
      name: "DATAPREV 2026",
      targetDate: new Date("2026-11-10T00:00:00.000Z"),
      systemManaged: true,
    },
    update: {
      systemManaged: true,
      type: ContestType.STANDARD,
    },
  });

  await prisma.contest.upsert({
    where: { id: ENEM_CONTEST_ID },
    create: {
      id: ENEM_CONTEST_ID,
      userId: EMILIANO_USER_ID,
      name: "ENEM",
      targetDate: new Date("2026-11-08T00:00:00.000Z"),
      type: ContestType.RECURRING,
      systemManaged: true,
    },
    update: {
      name: "ENEM",
      targetDate: new Date("2026-11-08T00:00:00.000Z"),
      type: ContestType.RECURRING,
      systemManaged: true,
    },
  });

  for (const topic of topics) {
    await prisma.studyTopic.upsert({
      where: { id: topic.id },
      create: topic,
      update: {
        module: topic.module,
        discipline: topic.discipline,
        syllabusItem: topic.syllabusItem,
        subject: topic.subject,
        detail: topic.detail,
        page: topic.page,
        suggestedPriority: topic.suggestedPriority,
        topicCode: topic.topicCode,
        topicTitle: topic.topicTitle,
        isGroup: topic.isGroup ?? false,
        competencyCodes: topic.competencyCodes ?? [],
        skillCodes: topic.skillCodes ?? [],
        sortOrder: topic.sortOrder ?? 0,
      },
    });
  }

  await prisma.contestStudyTopic.createMany({
    data: dataprevTopics.map((topic) => ({
      contestId: DATAPREV_CONTEST_ID,
      studyTopicId: topic.id,
    })),
    skipDuplicates: true,
  });

  await prisma.contestStudyTopic.createMany({
    data: enemTopics.map((topic) => ({
      contestId: ENEM_CONTEST_ID,
      studyTopicId: topic.id,
    })),
    skipDuplicates: true,
  });

  let questionCount = 0;
  for (const exam of exams) {
    const {
      questionsFile,
      contestId = DATAPREV_CONTEST_ID,
      ...examData
    } = exam;
    const questions = readJson<QuestionSeed[]>(questionsFile);

    await prisma.exam.upsert({
      where: { id: exam.id },
      create: examData,
      update: examData,
    });

    for (const question of questions) {
      const {
        id,
        number: explicitNumber,
        examDay: explicitExamDay,
        variant = "",
        ...questionData
      } = question;
      const number = explicitNumber ?? id;
      if (number === undefined) {
        throw new Error(`${exam.id}: questão sem número.`);
      }
      const examDay =
        explicitExamDay ??
        (exam.id.startsWith("enem-") ? (number <= 90 ? 1 : 2) : null);
      await prisma.question.upsert({
        where: {
          examId_number_variant: {
            examId: exam.id,
            number,
            variant,
          },
        },
        create: {
          examId: exam.id,
          number,
          examDay,
          variant,
          ...questionData,
        },
        update: {
          examDay,
          variant,
          ...questionData,
        },
      });
    }

    await prisma.contestExam.upsert({
      where: {
        contestId_examId: {
          contestId,
          examId: exam.id,
        },
      },
      create: {
        contestId,
        examId: exam.id,
      },
      update: {},
    });
    questionCount += questions.length;
  }

  await prisma.$queryRaw`
    SELECT setval(
      pg_get_serial_sequence('"Question"', 'id'),
      GREATEST(COALESCE(MAX("id"), 1), 1),
      COUNT(*) > 0
    )
    FROM "Question"
  `;

  await prisma.$executeRaw`
    UPDATE "ContestStudyTopic"
    SET "questionsCompleted" = 0,
        "correctAnswers" = 0
  `;
  await prisma.$executeRaw`
    UPDATE "ContestStudyTopic" AS progress
    SET "questionsCompleted" = stats.total,
        "correctAnswers" = stats.correct,
        "status" = CASE
          WHEN progress."status" = 'NOT_STARTED'::"StudyStatus"
            THEN 'IN_PROGRESS'::"StudyStatus"
          ELSE progress."status"
        END,
        "progress" = CASE
          WHEN progress."status" = 'NOT_STARTED'::"StudyStatus" THEN 50
          ELSE progress."progress"
        END,
        "startedAt" = COALESCE(progress."startedAt", stats.started_at)
    FROM (
      SELECT
        attempt."contestId" AS contest_id,
        question."studyTopicId" AS topic_id,
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE answer."isCorrect")::INTEGER AS correct,
        MIN(attempt."startedAt") AS started_at
      FROM "AttemptAnswer" AS answer
      JOIN "Attempt" AS attempt ON attempt.id = answer."attemptId"
      JOIN "Question" AS question ON question.id = answer."questionId"
      WHERE attempt."completedAt" IS NOT NULL
        AND NOT question."annulled"
        AND question."studyTopicId" IS NOT NULL
      GROUP BY attempt."contestId", question."studyTopicId"
    ) AS stats
    WHERE progress."contestId" = stats.contest_id
      AND progress."studyTopicId" = stats.topic_id
  `;

  console.log(
    `Seed concluído para Emiliano: ${dataprevTopics.length} tópicos DATAPREV, ${enemTopics.length} tópicos ENEM 2026, ${exams.length} provas e ${questionCount} questões.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
