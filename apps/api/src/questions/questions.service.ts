import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AttemptMode,
  ContestType,
  ForeignLanguage,
  Prisma,
  StudyStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SaveAttemptDraftDto } from "./dto/save-attempt-draft.dto";
import { StartAttemptDto } from "./dto/start-attempt.dto";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";
import { calculateAttemptScore } from "./scoring";
import {
  calculateTargetSecondsPerQuestion,
  calculateTrainingTimeLimitSeconds,
  calculateTimePerformance,
} from "./timing";

const examSelection = {
  id: true,
  name: true,
  organization: true,
  year: true,
  role: true,
  answerOptions: true,
  defaultDurationMinutes: true,
  extendedDurationMinutes: true,
} satisfies Prisma.ExamSelect;

const questionSelection = {
  id: true,
  examId: true,
  number: true,
  examDay: true,
  variant: true,
  discipline: true,
  subject: true,
  weight: true,
  sourcePage: true,
  sourceImage: true,
  contextImage: true,
  exam: {
    select: examSelection,
  },
} satisfies Prisma.QuestionSelect;

type SelectedExam = Prisma.ExamGetPayload<{
  select: typeof examSelection;
}>;

type SelectedQuestion = Prisma.QuestionGetPayload<{
  select: typeof questionSelection;
}>;

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0
    ? `${hours}h`
    : `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
}

function languageVariant(language: ForeignLanguage | undefined) {
  return language ?? "";
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [
      result[swapIndex]!,
      result[index]!,
    ];
  }
  return result;
}

type EnemDay = 1 | 2;

function enemDaySchedule(year: number, day: EnemDay) {
  const essayDay: EnemDay = year === 2016 ? 2 : 1;
  const officialDurationMinutes =
    year <= 2017
      ? day === 1
        ? year === 2016
          ? 270
          : 330
        : year === 2016
          ? 330
          : 270
      : day === 1
        ? 330
        : 300;
  const includesEssay = day === essayDay;
  const essayReservedMinutes = includesEssay ? 60 : 0;
  const objectiveDurationMinutes =
    officialDurationMinutes - essayReservedMinutes;
  const extendedObjectiveDurationMinutes =
    officialDurationMinutes + 60 - essayReservedMinutes;
  const areas =
    year === 2016
      ? day === 1
        ? ["Ciências Humanas", "Ciências da Natureza"]
        : ["Linguagens", "Matemática", "Redação"]
      : day === 1
        ? ["Linguagens", "Ciências Humanas", "Redação"]
        : ["Ciências da Natureza", "Matemática"];

  return {
    day,
    label: `Dia ${day}`,
    areas,
    includesEssay,
    officialDurationMinutes,
    essayReservedMinutes,
    objectiveDurationMinutes,
    extendedObjectiveDurationMinutes,
  };
}

function parseDraftAnswers(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const questionId = item.questionId;
    const selectedAnswer = item.selectedAnswer;
    return typeof questionId === "number" &&
      typeof selectedAnswer === "string" &&
      ["A", "B", "C", "D", "E"].includes(selectedAnswer)
      ? [{ questionId, selectedAnswer }]
      : [];
  });
}

function parseDraftQuestionTimes(
  value: Prisma.JsonValue | null | undefined,
) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const questionId = item.questionId;
    const timeSpentSeconds = item.timeSpentSeconds;
    return typeof questionId === "number" &&
      typeof timeSpentSeconds === "number" &&
      timeSpentSeconds >= 0
      ? [{ questionId, timeSpentSeconds }]
      : [];
  });
}

function serializeDraft(attempt: {
  draftAnswers?: Prisma.JsonValue | null;
  draftQuestionTimes?: Prisma.JsonValue | null;
  draftCurrentIndex?: number;
  draftElapsedSeconds?: number;
  draftSavedAt?: Date | null;
}) {
  return {
    answers: parseDraftAnswers(attempt.draftAnswers),
    questionTimes: parseDraftQuestionTimes(attempt.draftQuestionTimes),
    currentIndex: attempt.draftCurrentIndex ?? 0,
    elapsedSeconds: attempt.draftElapsedSeconds ?? 0,
    savedAt: attempt.draftSavedAt ?? null,
  };
}

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listExams(contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        exams: {
          include: {
            exam: {
              include: {
                questions: {
                  select: {
                    examDay: true,
                    variant: true,
                    weight: true,
                  },
                },
              },
            },
          },
          orderBy: {
            exam: {
              year: "desc",
            },
          },
        },
      },
    });

    if (!contest) {
      throw new NotFoundException("Concurso não encontrado.");
    }

    return contest.exams.map(({ exam }) => {
      const effectiveQuestions = exam.questions.filter(
        (question) => question.variant !== ForeignLanguage.SPANISH,
      );
      const hasLanguageVariants = exam.questions.some(
        (question) => question.variant !== "",
      );
      const dayOptions = ([1, 2] as const).flatMap((day) => {
        const dayQuestions = exam.questions.filter(
          (question) => question.examDay === day,
        );
        if (dayQuestions.length === 0) return [];
        const effectiveDayQuestions = dayQuestions.filter(
          (question) => question.variant !== ForeignLanguage.SPANISH,
        );
        const schedule = enemDaySchedule(exam.year, day);
        const officialLabel = formatDuration(
          schedule.officialDurationMinutes,
        );
        const regularLabel = schedule.includesEssay
          ? `${formatDuration(schedule.objectiveDurationMinutes)} para 90 questões (${officialLabel} oficiais − 1h de redação)`
          : `${formatDuration(schedule.objectiveDurationMinutes)} para 90 questões (tempo regular)`;
        const extendedLabel = schedule.includesEssay
          ? `${formatDuration(schedule.extendedObjectiveDurationMinutes)} para 90 questões (tempo adicional − 1h de redação)`
          : `${formatDuration(schedule.extendedObjectiveDurationMinutes)} para 90 questões (tempo adicional)`;
        const dayHasLanguageVariants = dayQuestions.some(
          (question) => question.variant !== "",
        );
        return [
          {
            ...schedule,
            questionCount: effectiveDayQuestions.length,
            maxWeightedScore: effectiveDayQuestions.reduce(
              (total, question) => total + Number(question.weight),
              0,
            ),
            hasLanguageVariants: dayHasLanguageVariants,
            availableLanguages: dayHasLanguageVariants
              ? [ForeignLanguage.ENGLISH, ForeignLanguage.SPANISH]
              : [],
            durationOptions: [
              {
                minutes: schedule.objectiveDurationMinutes,
                label: regularLabel,
                extended: false,
              },
              {
                minutes: schedule.extendedObjectiveDurationMinutes,
                label: extendedLabel,
                extended: true,
              },
            ],
          },
        ];
      });
      return {
        ...this.serializeExam(exam),
        questionCount: effectiveQuestions.length,
        maxWeightedScore: effectiveQuestions.reduce(
          (total, question) => total + Number(question.weight),
          0,
        ),
        hasLanguageVariants,
        availableLanguages: hasLanguageVariants
          ? [ForeignLanguage.ENGLISH, ForeignLanguage.SPANISH]
          : [],
        durationOptions: this.durationOptions(exam),
        dayOptions,
      };
    });
  }

  async listDisciplines(examId: string | undefined, contestId: string) {
    let examIds: string[];
    if (examId) {
      await this.getAssignedExam(examId, contestId);
      examIds = [examId];
    } else {
      const contest = await this.prisma.contest.findUnique({
        where: { id: contestId },
        select: {
          type: true,
          exams: { select: { examId: true } },
        },
      });
      if (!contest) {
        throw new NotFoundException("Concurso não encontrado.");
      }
      examIds = contest.exams.map(({ examId: assignedExamId }) => assignedExamId);
    }

    const [rows, answerHistory] = await Promise.all([
      this.prisma.question.groupBy({
        by: ["discipline"],
        where: { examId: { in: examIds }, annulled: false },
        _count: { id: true },
        orderBy: { discipline: "asc" },
      }),
      this.prisma.attemptAnswer.findMany({
        where: {
          attempt: {
            contestId,
            completedAt: { not: null },
          },
          question: {
            examId: { in: examIds },
          },
        },
        select: {
          isCorrect: true,
          question: {
            select: {
              id: true,
              annulled: true,
              discipline: true,
            },
          },
        },
      }),
    ]);

    const progressByDiscipline = new Map<string, Set<number>>();
    for (const answer of answerHistory) {
      if (answer.question.annulled) continue;
      const progress =
        progressByDiscipline.get(answer.question.discipline) ?? new Set<number>();
      if (answer.isCorrect) progress.add(answer.question.id);
      progressByDiscipline.set(answer.question.discipline, progress);
    }

    return rows.map((row) => {
      const progress = progressByDiscipline.get(row.discipline);
      const bestPercentage = progress
        ? (progress.size / row._count.id) * 100
        : undefined;
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

  async listSubjects(
    discipline: string | undefined,
    contestId: string,
    examId?: string,
  ) {
    if (!discipline?.trim()) {
      throw new BadRequestException(
        "Selecione uma disciplina para listar os assuntos.",
      );
    }
    let examIds: string[];
    if (examId) {
      await this.getAssignedExam(examId, contestId);
      examIds = [examId];
    } else {
      const contest = await this.prisma.contest.findUnique({
        where: { id: contestId },
        select: {
          exams: { select: { examId: true } },
        },
      });
      if (!contest) {
        throw new NotFoundException("Concurso não encontrado.");
      }
      examIds = contest.exams.map(({ examId: assignedExamId }) => assignedExamId);
    }
    if (examIds.length === 0) return [];

    const [questions, correctAnswers] = await Promise.all([
      this.prisma.question.findMany({
        where: {
          examId: { in: examIds },
          discipline,
          annulled: false,
          studyTopicId: { not: null },
          studyTopic: { isGroup: false },
        },
        select: {
          id: true,
          studyTopic: {
            select: {
              id: true,
              subject: true,
              detail: true,
              topicCode: true,
              topicTitle: true,
              competencyCodes: true,
              skillCodes: true,
              sortOrder: true,
            },
          },
        },
      }),
      this.prisma.attemptAnswer.findMany({
        where: {
          isCorrect: true,
          attempt: {
            contestId,
            completedAt: { not: null },
          },
          question: {
            examId: { in: examIds },
            discipline,
            annulled: false,
          },
        },
        select: { questionId: true },
        distinct: ["questionId"],
      }),
    ]);

    const correctQuestionIds = new Set(
      correctAnswers.map(({ questionId }) => questionId),
    );
    const subjects = new Map<
      number,
      {
        id: number;
        name: string;
        detail: string | null;
        topicCode: string | null;
        topicTitle: string | null;
        competencyCodes: string[];
        skillCodes: string[];
        sortOrder: number;
        questionCount: number;
        correctQuestionCount: number;
      }
    >();
    for (const question of questions) {
      if (!question.studyTopic) continue;
      const current = subjects.get(question.studyTopic.id) ?? {
        id: question.studyTopic.id,
        name: question.studyTopic.subject,
        detail: question.studyTopic.detail,
        topicCode: question.studyTopic.topicCode,
        topicTitle: question.studyTopic.topicTitle,
        competencyCodes: question.studyTopic.competencyCodes,
        skillCodes: question.studyTopic.skillCodes,
        sortOrder: question.studyTopic.sortOrder,
        questionCount: 0,
        correctQuestionCount: 0,
      };
      current.questionCount += 1;
      current.correctQuestionCount += Number(
        correctQuestionIds.has(question.id),
      );
      subjects.set(question.studyTopic.id, current);
    }

    return [...subjects.values()]
      .map((subject) => ({
        ...subject,
        unmasteredQuestionCount:
          subject.questionCount - subject.correctQuestionCount,
      }))
      .sort(
        (left, right) =>
          (left.topicCode ?? "").localeCompare(
            right.topicCode ?? "",
            "pt-BR",
          ) ||
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(right.name, "pt-BR"),
      );
  }

  async start(dto: StartAttemptDto, contestId: string) {
    if (
      (dto.mode === AttemptMode.DISCIPLINE ||
        dto.mode === AttemptMode.ALL_YEARS) &&
      !dto.discipline
    ) {
      throw new BadRequestException(
        "A disciplina é obrigatória para o treino por disciplina.",
      );
    }
    if (dto.studyTopicId && dto.mode === AttemptMode.FULL) {
      throw new BadRequestException(
        "Selecione o modo de treino por disciplina para praticar um assunto.",
      );
    }
    if (dto.randomizeQuestions && dto.mode !== AttemptMode.ALL_YEARS) {
      throw new BadRequestException(
        "O sorteio entre todos os assuntos só está disponível em concursos recorrentes.",
      );
    }
    if (dto.randomizeQuestions && dto.studyTopicId) {
      throw new BadRequestException(
        "Escolha um assunto específico ou o sorteio entre todos os assuntos.",
      );
    }
    if (dto.allExams && dto.mode !== AttemptMode.DISCIPLINE) {
      throw new BadRequestException(
        "A união de todas as provas só está disponível no treino por disciplina.",
      );
    }

    const contest = await this.getContestWithExams(contestId);
    let exams: SelectedExam[];
    if (dto.mode === AttemptMode.ALL_YEARS) {
      if (contest.type !== ContestType.RECURRING) {
        throw new BadRequestException(
          "O treino com questões de todos os anos só está disponível em concursos recorrentes.",
        );
      }
      exams = contest.exams.map(({ exam }) => exam);
    } else if (dto.allExams) {
      exams = contest.exams.map(({ exam }) => exam);
    } else {
      if (!dto.examId) {
        throw new BadRequestException("Selecione a prova desejada.");
      }
      const assignment = contest.exams.find(
        ({ exam }) => exam.id === dto.examId,
      );
      if (!assignment) {
        throw new NotFoundException(
          "Esta prova não pertence ao concurso selecionado.",
        );
      }
      exams = [assignment.exam];
    }

    const trainingTopic = dto.studyTopicId
      ? await this.prisma.studyTopic.findFirst({
          where: {
            id: dto.studyTopicId,
            isGroup: false,
            discipline: dto.discipline,
            contestProgress: {
              some: { contestId },
            },
          },
        })
      : null;
    if (dto.studyTopicId && !trainingTopic) {
      throw new BadRequestException(
        "O assunto selecionado não pertence a esta disciplina ou concurso.",
      );
    }

    if (exams.length === 0) {
      throw new BadRequestException(
        "Este concurso ainda não possui provas internas.",
      );
    }

    const selectedExam = exams.at(0);
    const requiresExamDay =
      dto.mode === AttemptMode.FULL &&
      selectedExam !== undefined &&
      this.isEnemExam(selectedExam);
    if (requiresExamDay && dto.examDay !== 1 && dto.examDay !== 2) {
      throw new BadRequestException("Selecione o Dia 1 ou o Dia 2 do ENEM.");
    }
    if (dto.examDay !== undefined && !requiresExamDay) {
      throw new BadRequestException(
        "A seleção de dia só está disponível na prova anual do ENEM.",
      );
    }

    const examDay = requiresExamDay ? (dto.examDay as EnemDay) : undefined;
    const language = await this.resolveLanguage(dto, exams, examDay);
    const availableQuestions = await this.prisma.question.findMany({
      where: {
        examId: { in: exams.map((exam) => exam.id) },
        examDay,
        discipline:
          dto.mode === AttemptMode.DISCIPLINE ||
          dto.mode === AttemptMode.ALL_YEARS
            ? dto.discipline
            : undefined,
        studyTopicId: trainingTopic?.id,
        annulled: trainingTopic ? false : undefined,
        OR: [
          { variant: "" },
          { variant: languageVariant(language) },
        ],
      },
      select: questionSelection,
      orderBy: [
        { exam: { year: "asc" } },
        { number: "asc" },
        { variant: "asc" },
      ],
    });

    const filtersPreviouslyCorrectAnswers =
      (trainingTopic !== null || dto.randomizeQuestions === true) &&
      !dto.includeCorrectAnswers;
    const correctlyAnsweredQuestionIds = filtersPreviouslyCorrectAnswers
      ? new Set(
          (
            await this.prisma.attemptAnswer.findMany({
              where: {
                isCorrect: true,
                attempt: {
                  contestId,
                  completedAt: { not: null },
                },
                question: {
                  examId: { in: exams.map((exam) => exam.id) },
                  discipline: dto.randomizeQuestions
                    ? dto.discipline
                    : undefined,
                  studyTopicId: trainingTopic?.id,
                },
              },
              select: { questionId: true },
              distinct: ["questionId"],
            })
          ).map(({ questionId }) => questionId),
        )
      : new Set<number>();
    const eligibleQuestions = availableQuestions.filter(
      (question) => !correctlyAnsweredQuestionIds.has(question.id),
    );
    if (dto.randomizeQuestions && eligibleQuestions.length < 10) {
      throw new BadRequestException(
        dto.includeCorrectAnswers
          ? `Esta disciplina possui somente ${eligibleQuestions.length} questões disponíveis; são necessárias 10.`
          : `Restam somente ${eligibleQuestions.length} questões ainda não acertadas nesta disciplina. Ative a inclusão de questões já acertadas para completar o sorteio.`,
      );
    }
    const questions = trainingTopic
      ? dto.mode === AttemptMode.ALL_YEARS
        ? shuffled(eligibleQuestions).slice(0, 10)
        : shuffled(eligibleQuestions)
      : dto.randomizeQuestions
        ? shuffled(eligibleQuestions).slice(0, 10)
        : eligibleQuestions;

    if (questions.length === 0) {
      throw new BadRequestException("Nenhuma questão encontrada para o filtro.");
    }

    const daySchedule =
      examDay && selectedExam
        ? enemDaySchedule(selectedExam.year, examDay)
        : undefined;
    const defaultDurationMinutes = trainingTopic
      ? Math.max(1, questions.length * 3)
      : daySchedule
      ? daySchedule.objectiveDurationMinutes
      : dto.mode === AttemptMode.ALL_YEARS
        ? Math.max(1, questions.length * 3)
        : exams.reduce(
            (total, exam) => total + exam.defaultDurationMinutes,
            0,
          );
    const extendedDurationMinutes = trainingTopic
      ? Math.max(1, questions.length * 4)
      : daySchedule
      ? daySchedule.extendedObjectiveDurationMinutes
      : dto.mode === AttemptMode.ALL_YEARS
        ? Math.max(1, questions.length * 4)
        : exams.reduce(
            (total, exam) => total + exam.extendedDurationMinutes,
            0,
          );
    if (
      ![defaultDurationMinutes, extendedDurationMinutes].includes(
        dto.durationMinutes,
      )
    ) {
      throw new BadRequestException("Duração inválida para esta seleção.");
    }

    const targetQuestionCount =
      trainingTopic !== null ||
      dto.mode === AttemptMode.ALL_YEARS ||
      examDay !== undefined
        ? questions.length
        : await this.prisma.question.count({
            where: {
              examId: { in: exams.map((exam) => exam.id) },
              OR: [
                { variant: "" },
                { variant: languageVariant(language) },
              ],
            },
          });
    const targetSecondsPerQuestion = calculateTargetSecondsPerQuestion(
      dto.durationMinutes,
      targetQuestionCount,
    );
    const timeLimitSeconds =
      dto.mode === AttemptMode.DISCIPLINE
        ? calculateTrainingTimeLimitSeconds(
            dto.durationMinutes,
            targetQuestionCount,
            questions.length,
          )
        : dto.durationMinutes * 60;

    const attempt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attempt.create({
        data: {
          contestId,
          examId:
            dto.mode === AttemptMode.ALL_YEARS || dto.allExams
              ? null
              : exams.at(0)?.id,
          trainingTopicId: trainingTopic?.id,
          examDay,
          mode: dto.mode,
          discipline: dto.discipline,
          foreignLanguage: language,
          includeCorrectAnswers: dto.includeCorrectAnswers ?? false,
          timeLimitSeconds,
          targetSecondsPerQuestion,
          totalQuestions: questions.length,
        },
      });
      await tx.attemptQuestion.createMany({
        data: questions.map((question, index) => ({
          attemptId: created.id,
          questionId: question.id,
          position: index + 1,
        })),
      });
      return created;
    });
    const questionExamIds = new Set(
      questions.map((question) => question.examId),
    );
    const attemptExams = exams.filter((exam) => questionExamIds.has(exam.id));

    return {
      attemptId: attempt.id,
      exam: this.attemptExam(
        attemptExams,
        contest.name,
        attempt.discipline,
        trainingTopic?.subject,
      ),
      mode: attempt.mode,
      examDay: attempt.examDay,
      discipline: attempt.discipline,
      trainingTopic: trainingTopic
        ? {
            id: trainingTopic.id,
            subject: trainingTopic.subject,
            topicCode: trainingTopic.topicCode,
            topicTitle: trainingTopic.topicTitle,
          }
        : null,
      includeCorrectAnswers: dto.includeCorrectAnswers ?? false,
      foreignLanguage: attempt.foreignLanguage,
      startedAt: attempt.startedAt,
      timeLimitSeconds: attempt.timeLimitSeconds,
      targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
      totalQuestions: questions.length,
      draft: serializeDraft(attempt),
      questions: questions.map((question) =>
        this.serializeQuestion(question),
      ),
    };
  }

  async submit(
    attemptId: string,
    dto: SubmitAttemptDto,
    contestId: string,
  ) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, contestId },
      include: {
        questions: {
          include: {
            question: {
              include: {
                exam: true,
                studyTopic: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException("Tentativa não encontrada.");
    }
    if (attempt.completedAt) {
      throw new ConflictException("Esta tentativa já foi finalizada.");
    }

    const questions = attempt.questions.map(({ question }) => question);
    const submittedAnswerMap = new Map(
      dto.answers.map((answer) => [answer.questionId, answer]),
    );
    const answerMap = new Map(
      dto.answers.map((answer) => [answer.questionId, answer.selectedAnswer]),
    );
    const questionById = new Map(
      questions.map((question) => [question.id, question]),
    );
    const hasInvalidQuestion = dto.answers.some(
      (answer) => !questionById.has(answer.questionId),
    );
    const hasInvalidOption = dto.answers.some((answer) => {
      if (answer.selectedAnswer === undefined) return false;
      return !questionById
        .get(answer.questionId)
        ?.exam.answerOptions.includes(answer.selectedAnswer);
    });

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
          draftAnswers: Prisma.JsonNull,
          draftQuestionTimes: Prisma.JsonNull,
          draftCurrentIndex: 0,
          draftElapsedSeconds: 0,
          draftSavedAt: null,
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
        const question = questionById.get(row.questionId);
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
        contest: true,
        exam: true,
        trainingTopic: true,
        questions: {
          include: {
            question: {
              include: {
                exam: true,
                studyTopic: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
        answers: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException("Tentativa não encontrada.");
    }

    const selectedQuestions = attempt.questions.map(
      ({ question }) => question,
    );
    const exams = this.uniqueExams(
      selectedQuestions.map((question) => question.exam),
    );
    const serializedExam = this.attemptExam(
      exams,
      attempt.contest.name,
      attempt.discipline,
      attempt.trainingTopic?.subject,
    );

    if (!attempt.completedAt) {
      return {
        attemptId: attempt.id,
        completed: false,
        exam: serializedExam,
        mode: attempt.mode,
        examDay: attempt.examDay,
        discipline: attempt.discipline,
        trainingTopic: attempt.trainingTopic
          ? {
              id: attempt.trainingTopic.id,
              subject: attempt.trainingTopic.subject,
              topicCode: attempt.trainingTopic.topicCode,
              topicTitle: attempt.trainingTopic.topicTitle,
            }
          : null,
        includeCorrectAnswers: attempt.includeCorrectAnswers,
        foreignLanguage: attempt.foreignLanguage,
        startedAt: attempt.startedAt,
        timeLimitSeconds: attempt.timeLimitSeconds,
        targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
        totalQuestions: selectedQuestions.length,
        draft: serializeDraft(attempt),
        questions: selectedQuestions.map((question) =>
          this.serializeQuestion(question),
        ),
      };
    }

    const answerByQuestion = new Map(
      attempt.answers.map((answer) => [answer.questionId, answer]),
    );
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

    for (const question of selectedQuestions) {
      const answer = answerByQuestion.get(question.id);
      if (!answer) continue;
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

      if (!answer.isCorrect && !question.annulled && question.studyTopic) {
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
    const orderedAnswers = selectedQuestions.flatMap((question) => {
      const answer = answerByQuestion.get(question.id);
      return answer ? [{ answer, question }] : [];
    });
    const timePerformance = calculateTimePerformance(
      attempt.targetSecondsPerQuestion,
      attempt.totalQuestions,
      attempt.durationSeconds ?? 0,
      orderedAnswers.map(({ answer }) => answer.timeSpentSeconds),
    );

    return {
      id: attempt.id,
      completed: true,
      exam: serializedExam,
      mode: attempt.mode,
      examDay: attempt.examDay,
      discipline: attempt.discipline,
      trainingTopic: attempt.trainingTopic
        ? {
            id: attempt.trainingTopic.id,
            subject: attempt.trainingTopic.subject,
            topicCode: attempt.trainingTopic.topicCode,
            topicTitle: attempt.trainingTopic.topicTitle,
          }
        : null,
      includeCorrectAnswers: attempt.includeCorrectAnswers,
      foreignLanguage: attempt.foreignLanguage,
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
      answers: orderedAnswers.map(({ answer, question }) => ({
        questionId: answer.questionId,
        questionNumber: question.number,
        examId: question.examId,
        examName: question.exam.name,
        examYear: question.exam.year,
        examDay: question.examDay,
        sourcePage: question.sourcePage,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: answer.isCorrect,
        annulled: question.annulled,
        discipline: question.discipline,
        subject: question.subject,
        sourceImage: question.sourceImage,
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
      include: {
        contest: true,
        exam: true,
        trainingTopic: true,
        questions: {
          include: {
            question: {
              include: { exam: true },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    });

    return attempts.map((attempt) => {
      const exams = this.uniqueExams(
        attempt.questions.map(({ question }) => question.exam),
      );
      return {
        id: attempt.id,
        exam: this.attemptExam(
          exams,
          attempt.contest.name,
          attempt.discipline,
          attempt.trainingTopic?.subject,
        ),
        mode: attempt.mode,
        examDay: attempt.examDay,
        discipline: attempt.discipline,
        trainingTopic: attempt.trainingTopic
          ? {
              id: attempt.trainingTopic.id,
              subject: attempt.trainingTopic.subject,
              topicCode: attempt.trainingTopic.topicCode,
              topicTitle: attempt.trainingTopic.topicTitle,
            }
          : null,
        includeCorrectAnswers: attempt.includeCorrectAnswers,
        foreignLanguage: attempt.foreignLanguage,
        completedAt: attempt.completedAt,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        weightedScore: Number(attempt.weightedScore),
        maxWeightedScore: Number(attempt.maxWeightedScore),
        weightedPercentage: Number(attempt.weightedPercentage),
        durationSeconds: attempt.durationSeconds,
        timeLimitSeconds: attempt.timeLimitSeconds,
        targetSecondsPerQuestion: attempt.targetSecondsPerQuestion,
      };
    });
  }

  async listDrafts(contestId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: { contestId, completedAt: null },
      include: {
        contest: true,
        trainingTopic: true,
        questions: {
          include: {
            question: {
              include: { exam: true },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: [
        { draftSavedAt: { sort: "desc", nulls: "last" } },
        { startedAt: "desc" },
      ],
    });

    return attempts.map((attempt) => {
      const draft = serializeDraft(attempt);
      const exams = this.uniqueExams(
        attempt.questions.map(({ question }) => question.exam),
      );
      return {
        id: attempt.id,
        exam: this.attemptExam(
          exams,
          attempt.contest.name,
          attempt.discipline,
          attempt.trainingTopic?.subject,
        ),
        mode: attempt.mode,
        examDay: attempt.examDay,
        discipline: attempt.discipline,
        trainingTopic: attempt.trainingTopic
          ? {
              id: attempt.trainingTopic.id,
              subject: attempt.trainingTopic.subject,
              topicCode: attempt.trainingTopic.topicCode,
              topicTitle: attempt.trainingTopic.topicTitle,
            }
          : null,
        includeCorrectAnswers: attempt.includeCorrectAnswers,
        foreignLanguage: attempt.foreignLanguage,
        startedAt: attempt.startedAt,
        lastSavedAt: draft.savedAt ?? attempt.startedAt,
        totalQuestions: attempt.totalQuestions,
        answeredQuestions: draft.answers.length,
        currentIndex: Math.min(
          draft.currentIndex,
          Math.max(attempt.totalQuestions - 1, 0),
        ),
        elapsedSeconds: draft.elapsedSeconds,
      };
    });
  }

  async deleteDraft(attemptId: string, contestId: string) {
    const deleted = await this.prisma.attempt.deleteMany({
      where: {
        id: attemptId,
        contestId,
        completedAt: null,
      },
    });
    if (deleted.count === 0) {
      throw new NotFoundException("Simulado em andamento não encontrado.");
    }
    return { id: attemptId };
  }

  async saveDraft(
    attemptId: string,
    dto: SaveAttemptDraftDto,
    contestId: string,
  ) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, contestId },
      select: {
        completedAt: true,
        totalQuestions: true,
        questions: {
          select: {
            questionId: true,
            question: {
              select: {
                exam: { select: { answerOptions: true } },
              },
            },
          },
        },
      },
    });
    if (!attempt) {
      throw new NotFoundException("Tentativa não encontrada.");
    }
    if (attempt.completedAt) {
      throw new ConflictException(
        "Uma tentativa finalizada não pode receber rascunhos.",
      );
    }
    if (
      dto.currentIndex >= attempt.questions.length ||
      dto.currentIndex >= attempt.totalQuestions
    ) {
      throw new BadRequestException("Posição atual inválida no rascunho.");
    }

    const questionById = new Map(
      attempt.questions.map((item) => [item.questionId, item]),
    );
    const answerIds = new Set(dto.answers.map((answer) => answer.questionId));
    const timeIds = new Set(
      dto.questionTimes.map((time) => time.questionId),
    );
    const hasInvalidAnswer =
      answerIds.size !== dto.answers.length ||
      dto.answers.some((answer) => {
        const question = questionById.get(answer.questionId);
        return (
          !question ||
          !question.question.exam.answerOptions.includes(answer.selectedAnswer)
        );
      });
    const hasInvalidTime =
      timeIds.size !== dto.questionTimes.length ||
      dto.questionTimes.some((time) => !questionById.has(time.questionId));
    if (hasInvalidAnswer || hasInvalidTime) {
      throw new BadRequestException(
        "O rascunho contém questões, respostas ou tempos inválidos.",
      );
    }

    const savedAt = new Date();
    const draftAnswers = dto.answers.map((answer) => ({
      questionId: answer.questionId,
      selectedAnswer: answer.selectedAnswer,
    })) as Prisma.InputJsonArray;
    const draftQuestionTimes = dto.questionTimes.map((time) => ({
      questionId: time.questionId,
      timeSpentSeconds: time.timeSpentSeconds,
    })) as Prisma.InputJsonArray;
    const update = await this.prisma.attempt.updateMany({
      where: { id: attemptId, contestId, completedAt: null },
      data: {
        draftAnswers,
        draftQuestionTimes,
        draftCurrentIndex: dto.currentIndex,
        draftElapsedSeconds: dto.elapsedSeconds,
        draftSavedAt: savedAt,
      },
    });
    if (update.count === 0) {
      throw new ConflictException(
        "A tentativa foi finalizada antes de salvar o rascunho.",
      );
    }

    return {
      attemptId,
      savedAt,
      answeredQuestions: dto.answers.length,
      currentIndex: dto.currentIndex,
      elapsedSeconds: dto.elapsedSeconds,
    };
  }

  private async resolveLanguage(
    dto: StartAttemptDto,
    exams: SelectedExam[],
    examDay?: EnemDay,
  ) {
    if (
      dto.mode === AttemptMode.DISCIPLINE ||
      dto.mode === AttemptMode.ALL_YEARS
    ) {
      if (dto.discipline === "Língua Inglesa") return ForeignLanguage.ENGLISH;
      if (dto.discipline === "Língua Espanhola") return ForeignLanguage.SPANISH;
      if (dto.mode === AttemptMode.ALL_YEARS) return undefined;
    }
    const hasVariants = await this.prisma.question.count({
      where: {
        examId: { in: exams.map((exam) => exam.id) },
        examDay,
        discipline:
          dto.mode === AttemptMode.DISCIPLINE ? dto.discipline : undefined,
        studyTopicId: dto.studyTopicId,
        variant: { not: "" },
      },
    });
    if (hasVariants > 0 && !dto.foreignLanguage) {
      throw new BadRequestException(
        "Selecione inglês ou espanhol para iniciar esta prova.",
      );
    }
    return hasVariants > 0 ? dto.foreignLanguage : undefined;
  }

  private async getAssignedExam(examId: string, contestId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        contestAssignments: {
          some: { contestId },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException(
        "Esta prova não pertence ao concurso selecionado.",
      );
    }
    return exam;
  }

  private async getContestWithExams(contestId: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        exams: {
          include: {
            exam: {
              select: examSelection,
            },
          },
          orderBy: {
            exam: {
              year: "asc",
            },
          },
        },
      },
    });
    if (!contest) {
      throw new NotFoundException("Concurso não encontrado.");
    }
    return contest;
  }

  private serializeQuestion(question: SelectedQuestion) {
    return {
      id: question.id,
      examId: question.examId,
      examName: question.exam.name,
      examYear: question.exam.year,
      number: question.number,
      examDay: question.examDay,
      discipline: question.discipline,
      subject: question.subject,
      weight: Number(question.weight),
      sourcePage: question.sourcePage,
      sourceImage: question.sourceImage,
      contextImage: question.contextImage,
      options: question.exam.answerOptions,
    };
  }

  private uniqueExams(exams: SelectedExam[]) {
    return [...new Map(exams.map((exam) => [exam.id, exam])).values()];
  }

  private attemptExam(
    exams: SelectedExam[],
    contestName: string,
    discipline?: string | null,
    subject?: string | null,
  ) {
    if (exams.length === 0) {
      throw new NotFoundException(
        "A tentativa não possui questões associadas.",
      );
    }
    if (exams.length === 1) {
      return this.serializeExam(exams[0]!);
    }
    const years = exams.map((exam) => exam.year);
    const organizations = [...new Set(exams.map((exam) => exam.organization))];
    return {
      id: "all-years",
      name: `${contestName} · treino de ${subject ?? discipline ?? "disciplina"}`,
      organization:
        organizations.length === 1 ? organizations[0] : "Múltiplas bancas",
      year: Math.max(...years),
      role: `${Math.min(...years)}–${Math.max(...years)}`,
      answerOptions: exams[0]?.answerOptions ?? ["A", "B", "C", "D", "E"],
      defaultDurationMinutes: exams.reduce(
        (total, exam) => total + exam.defaultDurationMinutes,
        0,
      ),
      extendedDurationMinutes: exams.reduce(
        (total, exam) => total + exam.extendedDurationMinutes,
        0,
      ),
    };
  }

  private durationOptions(exam: {
    defaultDurationMinutes: number;
    extendedDurationMinutes: number;
  }) {
    return [
      {
        minutes: exam.defaultDurationMinutes,
        label: `${formatDuration(exam.defaultDurationMinutes)} para resolver (tempo regular)`,
        extended: false,
      },
      {
        minutes: exam.extendedDurationMinutes,
        label: `${formatDuration(exam.extendedDurationMinutes)} para resolver (tempo adicional)`,
        extended: true,
      },
    ];
  }

  private isEnemExam(exam: SelectedExam) {
    return (
      exam.id.startsWith("enem-") ||
      (exam.organization.toUpperCase() === "INEP" &&
        exam.name.toUpperCase().startsWith("ENEM"))
    );
  }

  private serializeExam(exam: SelectedExam) {
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
