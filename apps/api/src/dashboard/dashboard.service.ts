import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface TimedAttempt {
  completedAt: Date | null;
  durationSeconds: number | null;
}

interface StudySessionTime {
  startedAt: Date;
  endedAt: Date | null;
}

function secondsBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

export function summarizeStudyTime(
  attempts: TimedAttempt[],
  sessions: StudySessionTime[],
  now = new Date(),
) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const questionTotalSeconds = attempts.reduce(
    (total, attempt) => total + (attempt.durationSeconds ?? 0),
    0,
  );
  const questionTodaySeconds = attempts.reduce(
    (total, attempt) =>
      attempt.completedAt && attempt.completedAt >= todayStart
        ? total + (attempt.durationSeconds ?? 0)
        : total,
    0,
  );
  let manualTotalSeconds = 0;
  let manualTodaySeconds = 0;

  for (const session of sessions) {
    const end = session.endedAt ?? now;
    manualTotalSeconds += secondsBetween(session.startedAt, end);
    if (end > todayStart) {
      manualTodaySeconds += secondsBetween(
        session.startedAt > todayStart ? session.startedAt : todayStart,
        end,
      );
    }
  }

  const runningSession = sessions.find((session) => session.endedAt === null);
  return {
    calculatedAt: now,
    todaySeconds: questionTodaySeconds + manualTodaySeconds,
    totalSeconds: questionTotalSeconds + manualTotalSeconds,
    questionTodaySeconds,
    manualTodaySeconds,
    manualRunning: Boolean(runningSession),
    manualStartedAt: runningSession?.startedAt ?? null,
  };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(contestId: string) {
    const [
      attempts,
      answers,
      topicCount,
      completedTopicCount,
      nextTopics,
      studySessions,
    ] = await Promise.all([
        this.prisma.attempt.findMany({
          where: { contestId, completedAt: { not: null } },
          orderBy: { completedAt: "asc" },
        }),
        this.prisma.attemptAnswer.findMany({
          where: {
            attempt: { contestId, completedAt: { not: null } },
          },
          include: { question: true },
        }),
        this.prisma.contestStudyTopic.count({
          where: { contestId, studyTopic: { isGroup: false } },
        }),
        this.prisma.contestStudyTopic.count({
          where: {
            contestId,
            status: "COMPLETED",
            studyTopic: { isGroup: false },
          },
        }),
        this.prisma.contestStudyTopic.findMany({
          where: {
            contestId,
            status: { not: "COMPLETED" },
            studyTopic: { isGroup: false },
          },
          include: { studyTopic: true },
          orderBy: [
            { questionsCompleted: "desc" },
            { studyTopic: { suggestedPriority: "asc" } },
            { studyTopicId: "asc" },
          ],
          take: 5,
        }),
        this.prisma.studySession.findMany({
          where: { contestId },
          orderBy: { startedAt: "asc" },
        }),
      ]);

    const disciplineMap = new Map<
      string,
      { total: number; correct: number }
    >();
    for (const answer of answers) {
      if (answer.question.annulled) continue;
      const item = disciplineMap.get(answer.question.discipline) ?? {
        total: 0,
        correct: 0,
      };
      item.total += 1;
      item.correct += Number(answer.isCorrect);
      disciplineMap.set(answer.question.discipline, item);
    }

    const scores = attempts.map((attempt) =>
      Number(attempt.weightedPercentage ?? 0),
    );
    const averageScore =
      scores.length === 0
        ? 0
        : scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
      attempts: attempts.length,
      averageScore,
      bestScore: scores.length === 0 ? 0 : Math.max(...scores),
      lastScore: scores.at(-1) ?? 0,
      studyProgress:
        topicCount === 0 ? 0 : (completedTopicCount / topicCount) * 100,
      completedTopics: completedTopicCount,
      totalTopics: topicCount,
      trend: attempts.slice(-10).map((attempt, index) => ({
        label: `S${Math.max(1, attempts.length - 9 + index)}`,
        score: Number(attempt.weightedPercentage),
        completedAt: attempt.completedAt,
      })),
      disciplines: [...disciplineMap.entries()]
        .map(([name, value]) => ({
          name,
          attempts: value.total,
          accuracy:
            value.total === 0 ? 0 : (value.correct / value.total) * 100,
        }))
        .sort((a, b) => a.accuracy - b.accuracy),
      nextTopics: nextTopics.map(({ studyTopic, ...progress }) => ({
        ...studyTopic,
        ...progress,
      })),
      studyTime: summarizeStudyTime(attempts, studySessions),
    };
  }

  async startStudyTimer(contestId: string) {
    const runningSession = await this.prisma.studySession.findFirst({
      where: { contestId, endedAt: null },
    });
    if (!runningSession) {
      await this.prisma.studySession.create({ data: { contestId } });
    }
    return this.getStudyTime(contestId);
  }

  async pauseStudyTimer(contestId: string) {
    await this.prisma.studySession.updateMany({
      where: { contestId, endedAt: null },
      data: { endedAt: new Date() },
    });
    return this.getStudyTime(contestId);
  }

  private async getStudyTime(contestId: string) {
    const [attempts, sessions] = await Promise.all([
      this.prisma.attempt.findMany({
        where: { contestId, completedAt: { not: null } },
        select: { completedAt: true, durationSeconds: true },
      }),
      this.prisma.studySession.findMany({
        where: { contestId },
        orderBy: { startedAt: "asc" },
      }),
    ]);
    return summarizeStudyTime(attempts, sessions);
  }
}
