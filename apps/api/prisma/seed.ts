import { PrismaClient } from "@prisma/client";
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
}

interface QuestionSeed {
  id: number;
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
}

const prisma = new PrismaClient();
const dataDirectory = path.join(__dirname, "data");
const EMILIANO_USER_ID = "00000000-0000-0000-0000-000000000001";
const DATAPREV_CONTEST_ID = "dataprev-2026-emiliano";

function readJson<T>(fileName: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(dataDirectory, fileName), "utf8"),
  ) as T;
}

async function main() {
  const topics = readJson<TopicSeed[]>("study-topics.json");
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
    },
    update: {
      userId: EMILIANO_USER_ID,
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
      },
    });
  }

  await prisma.contestStudyTopic.createMany({
    data: topics.map((topic) => ({
      contestId: DATAPREV_CONTEST_ID,
      studyTopicId: topic.id,
    })),
    skipDuplicates: true,
  });

  let questionCount = 0;
  for (const exam of exams) {
    const { questionsFile, ...examData } = exam;
    const questions = readJson<QuestionSeed[]>(questionsFile);

    await prisma.exam.upsert({
      where: { id: exam.id },
      create: examData,
      update: examData,
    });

    for (const question of questions) {
      const { id, ...questionData } = question;
      await prisma.question.upsert({
        where: {
          examId_number: {
            examId: exam.id,
            number: id,
          },
        },
        create: {
          examId: exam.id,
          number: id,
          ...questionData,
        },
        update: questionData,
      });
    }
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

  console.log(
    `Seed concluído para Emiliano: ${topics.length} tópicos, ${exams.length} provas e ${questionCount} questões.`,
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
