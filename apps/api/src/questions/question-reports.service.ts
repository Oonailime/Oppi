import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { ReportQuestionDto } from "./dto/report-question.dto";

type StoredQuestionReport = {
  id: string;
  reportedAt: string;
  status: "OPEN";
  issueType: ReportQuestionDto["issueType"];
  description: string;
  question: {
    id: number;
    number: number;
    examDay: number | null;
    variant: string;
    discipline: string;
    subject: string;
    studyTopicId: number | null;
    studyTopic: string | null;
    sourcePage: number;
    sourceImage: string;
    contextImage: string | null;
    correctAnswer: string | null;
    annulled: boolean;
    exam: {
      id: string;
      name: string;
      year: number;
      organization: string;
    };
  };
  context: {
    contestId: string;
    contestName: string;
    userId: string;
    username: string;
    attemptId: string;
    attemptCompleted: boolean;
    selectedAnswer: string | null;
    screenUrl: string | null;
  };
};

@Injectable()
export class QuestionReportsService {
  private writeQueue = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  async report(
    attemptId: string,
    questionId: number,
    dto: ReportQuestionDto,
    contestId: string,
  ) {
    const attemptQuestion = await this.prisma.attemptQuestion.findFirst({
      where: {
        attemptId,
        questionId,
        attempt: { contestId },
      },
      include: {
        attempt: {
          include: {
            contest: {
              include: { user: true },
            },
          },
        },
        question: {
          include: {
            exam: true,
            studyTopic: true,
          },
        },
      },
    });
    if (!attemptQuestion) {
      throw new NotFoundException(
        "A questão não pertence a esta tentativa ou concurso.",
      );
    }

    const { attempt, question } = attemptQuestion;
    const report: StoredQuestionReport = {
      id: randomUUID(),
      reportedAt: new Date().toISOString(),
      status: "OPEN",
      issueType: dto.issueType,
      description: dto.description.trim(),
      question: {
        id: question.id,
        number: question.number,
        examDay: question.examDay,
        variant: question.variant,
        discipline: question.discipline,
        subject: question.subject,
        studyTopicId: question.studyTopicId,
        studyTopic: question.studyTopic?.subject ?? null,
        sourcePage: question.sourcePage,
        sourceImage: question.sourceImage,
        contextImage: question.contextImage,
        correctAnswer: question.correctAnswer,
        annulled: question.annulled,
        exam: {
          id: question.exam.id,
          name: question.exam.name,
          year: question.exam.year,
          organization: question.exam.organization,
        },
      },
      context: {
        contestId: attempt.contest.id,
        contestName: attempt.contest.name,
        userId: attempt.contest.user.id,
        username: attempt.contest.user.username,
        attemptId: attempt.id,
        attemptCompleted: attempt.completedAt !== null,
        selectedAnswer: dto.selectedAnswer ?? null,
        screenUrl: dto.screenUrl ?? null,
      },
    };

    await this.append(report);
    return { id: report.id, reportedAt: report.reportedAt };
  }

  private reportsFile() {
    return (
      process.env.QUESTION_REPORTS_FILE ??
      resolve(__dirname, "..", "..", "data", "reported-question-errors.json")
    );
  }

  private async append(report: StoredQuestionReport) {
    this.writeQueue = this.writeQueue.catch(() => undefined).then(async () => {
      const file = this.reportsFile();
      await mkdir(dirname(file), { recursive: true });
      let reports: StoredQuestionReport[] = [];
      try {
        const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
        if (!Array.isArray(parsed)) {
          throw new Error("O arquivo de relatos deve conter uma lista JSON.");
        }
        reports = parsed as StoredQuestionReport[];
      } catch (reason) {
        if ((reason as NodeJS.ErrnoException).code !== "ENOENT") throw reason;
      }
      reports.push(report);
      await writeFile(file, `${JSON.stringify(reports, null, 2)}\n`, "utf8");
    });
    await this.writeQueue;
  }
}
