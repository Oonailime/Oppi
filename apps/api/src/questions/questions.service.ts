import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AttemptMode, Prisma, StudyStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StartAttemptDto } from "./dto/start-attempt.dto";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";
import { calculateAttemptScore } from "./scoring";
import {
  calculateTargetSecondsPerQuestion,
  calculateTimePerformance,
} from "./timing";

const questionSelection = {
  id: true,
  number: true,
  discipline: true,
  subject: true,
  weight: true,
  sourcePage: true,
  sourceImage: true,
  contextImage: true,
} satisfies Prisma.QuestionSelect;

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listExams() {
    const exams = await this.prisma.exam.findMany({
      include: {
        questions: {
          select: { weight: true },
        },
      },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    });

    return exams.map(({ questions, ...exam }) => ({
      ...exam,
      questionCount: questions.length,
      maxWeightedScore: questions.reduce(
        (total, question) => total + Number(question.weight),
        0,
      ),
      durationOptions: [
        {
          minutes: exam.defaultDurationMinutes,
          label: `${formatDuration(exam.defaultDurationMinutes)} para resolver (tempo regular)`,
          extended: false,
        },
        {
          minutes: exam.extendedDurationMinutes,
          label: `${formatDuration(exam.extendedDurationMinutes)} para resolver (com 1h adicional)`,
          extended: true,
        },
      ],
    }));
  }

  async listDisciplines(examId: string, contestId: string) {
    await this.getExam(examId);
    const [rows, answerHistory] = await Promise.all([
      this.prisma.question.groupBy({
        by: ["discipline"],
        where: { examId },
        _count: { id: true },
        orderBy: { discipline: "asc" },
      }),
      this.prisma.attemptAnswer.findMany({
        where: {
          attempt: {
            contestId,
            examId,
            completedAt: { not: null },
          },
        },
        select: {
          attemptId: true,
          isCorrect: true,
          question: {
            select: {
              annulled: true,
              discipline: true,
            },
          },
        },
      }),
    ]);

    const statsByAttempt = new Map<
      string,
      Map<string, { correct: number; total: number }>
    >();
    for (const answer of answerHistory) {
      if (answer.question.annulled) continue;
      const disciplines =
        statsByAttempt.get(answer.attemptId) ??
        new Map<string, { correct: number; total: number }>();
      const stats = disciplines.get(answer.question.discipline) ?? {
        correct: 0,
        total: 0,
      };
      stats.total += 1;
      stats.correct += Number(answer.isCorrect);
      disciplines.set(answer.question.discipline, stats);
      statsByAttempt.set(answer.attemptId, disciplines);
    }

    const bestPercentageByDiscipline = new Map<string, number>();
    for (const disciplines of statsByAttempt.values()) {
      for (const [discipline, stats] of disciplines) {
        if (stats.total === 0) continue;
        const percentage = (stats.correct / stats.total) * 100;
        bestPercentageByDiscipline.set(
          discipline,
          Math.max(bestPercentageByDiscipline.get(discipline) ?? 0, percentage),
        );
      }
    }

    return rows.map((row) => {
      const bestPercentage = bestPercentageByDiscipline.get(row.discipline);
      return {
        name: row.discipline,
        questionCount: row._count.id,
        bestPercentage:
          bestPercentage === undefined
            ? null
            : Math.round(bestPercentage * 100) / 100,
        progressStatus:
          bestPercentage === undefined
            ? "NOT_STARTED"
            : bestPercentage === 100
              ? "MASTERED"
              : bestPercentage > 75
                ? "GOOD"
                : "REVIEW",
      };
    });
  }

  async start(dto: StartAttemptDto, contestId: string) {
    if (dto.mode === AttemptMode.DISCIPLINE && !dto.discipline) {
      throw new BadRequestException(
        "A disciplina é obrigatória para o treino por disciplina.",
      );
    }

    const exam = await this.getExam(dto.examId);
    const validDurations = [
      exam.defaultDurationMinutes,
      exam.extendedDurationMinutes,
    ];
    if (!validDurations.includes(dto.durationMinutes)) {
      throw new BadRequestException("Duração inválida para esta prova.");
    }

    const totalExamQuestions = await this.prisma.question.count({
      where: { examId: exam.id },
    });
    const questions = await this.prisma.question.findMany({
      where: {
        examId: exam.id,
        discipline:
          dto.mode === AttemptMode.DISCIPLINE
            ? dto.discipline
            : undefined,
      },
      select: questionSelection,
      orderBy: { number: "asc" },
    });

    if (questions.length === 0) {
      throw new BadRequestException("Nenhuma questão encontrada para o filtro.");
    }

    const attempt = await this.prisma.attempt.create({
      data: {
        contestId,
        examId: exam.id,
        mode: dto.mode,
        discipline: dto.discipline,
        timeLimitSeconds: dto.durationMinutes * 60,
        targetSecondsPerQuestion: calculateTargetSecondsPerQuestion(
          dto.durationMinutes,
          totalExamQuestions,
        ),
        totalQuestions: questions.length,
      },
    });

    return {
      attemptId: attempt.id,
      exam: this.serializeExam(exam),
      mode: attempt.mode,
      discipline: attempt.discipline,
      startedAt: attempt.startedAt,
      timeLimitSeconds: attempt.timeLimitSeconds,
      targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
      totalQuestions: questions.length,
      questions: questions.map((question) => ({
        ...question,
        weight: Number(question.weight),
        options: exam.answerOptions,
      })),
    };
  }

  async submit(
    attemptId: string,
    dto: SubmitAttemptDto,
    contestId: string,
  ) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, contestId },
      include: { exam: true },
    });

    if (!attempt) {
      throw new NotFoundException("Tentativa não encontrada.");
    }
    if (attempt.completedAt) {
      throw new ConflictException("Esta tentativa já foi finalizada.");
    }

    const questions = await this.prisma.question.findMany({
      where: {
        examId: attempt.examId,
        discipline:
          attempt.mode === AttemptMode.DISCIPLINE
            ? attempt.discipline ?? undefined
            : undefined,
      },
      include: { studyTopic: true },
      orderBy: { number: "asc" },
    });
    const submittedAnswerMap = new Map(
      dto.answers.map((answer) => [answer.questionId, answer]),
    );
    const answerMap = new Map(
      dto.answers.map((answer) => [answer.questionId, answer.selectedAnswer]),
    );
    const validQuestionIds = new Set(questions.map((question) => question.id));
    const hasInvalidQuestion = dto.answers.some(
      (answer) => !validQuestionIds.has(answer.questionId),
    );
    const hasInvalidOption = dto.answers.some(
      (answer) =>
        answer.selectedAnswer !== undefined &&
        !attempt.exam.answerOptions.includes(answer.selectedAnswer),
    );

    if (
      hasInvalidQuestion ||
      hasInvalidOption ||
      answerMap.size !== dto.answers.length
    ) {
      throw new BadRequestException(
        "As respostas contêm questões, alternativas ou duplicidades inválidas.",
      );
    }

    const score = calculateAttemptScore(
      questions.map((question) => ({
        id: question.id,
        weight: Number(question.weight),
        annulled: question.annulled,
        correctAnswer: question.correctAnswer,
      })),
      answerMap,
    );
    const rows = score.answers.map((answer) => ({
      attemptId,
      questionId: answer.questionId,
      selectedAnswer: answer.selectedAnswer,
      isCorrect: answer.isCorrect,
      awardedPoints: new Prisma.Decimal(answer.awardedPoints),
      timeSpentSeconds:
        submittedAnswerMap.get(answer.questionId)?.timeSpentSeconds ?? 0,
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.attemptAnswer.createMany({ data: rows });
      await tx.attempt.update({
        where: { id: attemptId },
        data: {
          completedAt: new Date(),
          durationSeconds: dto.durationSeconds,
          answeredQuestions: score.answeredQuestions,
          correctAnswers: score.correctAnswers,
          annulledQuestions: score.annulledQuestions,
          rawPercentage: score.rawPercentage,
          weightedScore: score.weightedScore,
          maxWeightedScore: score.maxWeightedScore,
          weightedPercentage: score.weightedPercentage,
        },
      });

      for (const row of rows) {
        const question = questions.find((item) => item.id === row.questionId);
        if (!question?.studyTopicId || question.annulled) continue;

        const topicProgress = await tx.contestStudyTopic.upsert({
          where: {
            contestId_studyTopicId: {
              contestId,
              studyTopicId: question.studyTopicId,
            },
          },
          create: {
            contestId,
            studyTopicId: question.studyTopicId,
          },
          update: {},
        });

        await tx.contestStudyTopic.update({
          where: {
            contestId_studyTopicId: {
              contestId,
              studyTopicId: question.studyTopicId,
            },
          },
          data: {
            questionsCompleted: { increment: 1 },
            correctAnswers: row.isCorrect ? { increment: 1 } : undefined,
            status:
              topicProgress.status === StudyStatus.NOT_STARTED
                ? StudyStatus.IN_PROGRESS
                : undefined,
            progress:
              topicProgress.status === StudyStatus.NOT_STARTED
                ? 50
                : undefined,
            startedAt: topicProgress.startedAt ?? new Date(),
          },
        });
      }
    });

    return this.getResult(attemptId, contestId);
  }

  async getResult(attemptId: string, contestId: string) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, contestId },
      include: {
        exam: true,
        answers: {
          include: {
            question: {
              include: { studyTopic: true },
            },
          },
          orderBy: { question: { number: "asc" } },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException("Tentativa não encontrada.");
    }
    if (!attempt.completedAt) {
      const questions = await this.prisma.question.findMany({
        where: {
          examId: attempt.examId,
          discipline:
            attempt.mode === AttemptMode.DISCIPLINE
              ? attempt.discipline ?? undefined
              : undefined,
        },
        select: questionSelection,
        orderBy: { number: "asc" },
      });
      return {
        attemptId: attempt.id,
        completed: false,
        exam: this.serializeExam(attempt.exam),
        mode: attempt.mode,
        discipline: attempt.discipline,
        startedAt: attempt.startedAt,
        timeLimitSeconds: attempt.timeLimitSeconds,
        targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
        totalQuestions: questions.length,
        questions: questions.map((question) => ({
          ...question,
          weight: Number(question.weight),
          options: attempt.exam.answerOptions,
        })),
      };
    }

    const disciplineMap = new Map<
      string,
      { total: number; correct: number; points: number; maxPoints: number }
    >();
    const missedTopicMap = new Map<
      number,
      {
        id: number;
        discipline: string;
        subject: string;
        detail: string | null;
        misses: number;
      }
    >();

    for (const answer of attempt.answers) {
      const question = answer.question;
      const stats = disciplineMap.get(question.discipline) ?? {
        total: 0,
        correct: 0,
        points: 0,
        maxPoints: 0,
      };
      if (!question.annulled) {
        stats.total += 1;
        stats.correct += Number(answer.isCorrect);
      }
      stats.points += Number(answer.awardedPoints);
      stats.maxPoints += Number(question.weight);
      disciplineMap.set(question.discipline, stats);

      if (
        !answer.isCorrect &&
        !question.annulled &&
        question.studyTopic
      ) {
        const current = missedTopicMap.get(question.studyTopic.id);
        missedTopicMap.set(question.studyTopic.id, {
          id: question.studyTopic.id,
          discipline: question.studyTopic.discipline,
          subject: question.studyTopic.subject,
          detail: question.studyTopic.detail,
          misses: (current?.misses ?? 0) + 1,
        });
      }
    }

    const disciplines = [...disciplineMap.entries()]
      .map(([name, stats]) => ({
        name,
        ...stats,
        percentage:
          stats.total === 0 ? 100 : (stats.correct / stats.total) * 100,
      }))
      .sort((a, b) => a.percentage - b.percentage);
    const timePerformance = calculateTimePerformance(
      attempt.targetSecondsPerQuestion,
      attempt.totalQuestions,
      attempt.durationSeconds ?? 0,
      attempt.answers.map((answer) => answer.timeSpentSeconds),
    );

    return {
      id: attempt.id,
      completed: true,
      exam: this.serializeExam(attempt.exam),
      mode: attempt.mode,
      discipline: attempt.discipline,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      durationSeconds: attempt.durationSeconds ?? 0,
      timeLimitSeconds: attempt.timeLimitSeconds,
      targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
      ...timePerformance,
      totalQuestions: attempt.totalQuestions,
      answeredQuestions: attempt.answeredQuestions,
      correctAnswers: attempt.correctAnswers,
      annulledQuestions: attempt.annulledQuestions,
      rawPercentage: Number(attempt.rawPercentage),
      weightedScore: Number(attempt.weightedScore),
      maxWeightedScore: Number(attempt.maxWeightedScore),
      weightedPercentage: Number(attempt.weightedPercentage),
      disciplines,
      recommendations: [...missedTopicMap.values()]
        .sort((a, b) => b.misses - a.misses)
        .slice(0, 6),
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        questionNumber: answer.question.number,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.question.correctAnswer,
        isCorrect: answer.isCorrect,
        annulled: answer.question.annulled,
        discipline: answer.question.discipline,
        subject: answer.question.subject,
        sourceImage: answer.question.sourceImage,
        timeSpentSeconds: answer.timeSpentSeconds,
        exceededTarget:
          answer.timeSpentSeconds > attempt.targetSecondsPerQuestion,
      })),
    };
  }

  async listHistory(requestedLimit: number, contestId: string) {
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 50)
      : 12;
    const attempts = await this.prisma.attempt.findMany({
      where: { contestId, completedAt: { not: null } },
      include: { exam: true },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    return attempts.map((attempt) => ({
      id: attempt.id,
      exam: this.serializeExam(attempt.exam),
      mode: attempt.mode,
      discipline: attempt.discipline,
      completedAt: attempt.completedAt,
      totalQuestions: attempt.totalQuestions,
      correctAnswers: attempt.correctAnswers,
      weightedScore: Number(attempt.weightedScore),
      maxWeightedScore: Number(attempt.maxWeightedScore),
      weightedPercentage: Number(attempt.weightedPercentage),
      durationSeconds: attempt.durationSeconds,
      timeLimitSeconds: attempt.timeLimitSeconds,
      targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
    }));
  }

  private async getExam(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException("Prova não encontrada.");
    }

    return exam;
  }

  private serializeExam(exam: {
    id: string;
    name: string;
    organization: string;
    year: number;
    role: string | null;
    answerOptions: string[];
    defaultDurationMinutes: number;
    extendedDurationMinutes: number;
  }) {
    return {
      id: exam.id,
      name: exam.name,
      organization: exam.organization,
      year: exam.year,
      role: exam.role,
      answerOptions: exam.answerOptions,
      defaultDurationMinutes: exam.defaultDurationMinutes,
      extendedDurationMinutes: exam.extendedDurationMinutes,
    };
  }
}
