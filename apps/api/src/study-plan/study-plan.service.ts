import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, StudyStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateStudyTopicDto } from "./dto/update-study-topic.dto";

interface StudyPlanFilters {
  discipline?: string;
  status?: string;
  search?: string;
}

function youtubeSearchLink(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function withVideoLessons<
  T extends { subject: string; discipline: string; detail: string | null },
>(
  topic: T,
) {
  const links = [
    {
      label: `Videoaulas de ${topic.subject}`,
      url: youtubeSearchLink(
        `${topic.subject} ${topic.discipline} videoaula concurso`,
      ),
    },
  ];

  if (topic.detail && topic.detail !== topic.subject) {
    links.push({
      label: "Aprofundar este tópico",
      url: youtubeSearchLink(`${topic.detail} ${topic.subject} aula`),
    });
  }

  return { ...topic, videoLessons: links };
}

@Injectable()
export class StudyPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async list(contestId: string, filters: StudyPlanFilters) {
    const status =
      filters.status &&
      Object.values(StudyStatus).includes(filters.status as StudyStatus)
        ? (filters.status as StudyStatus)
        : undefined;
    const search = filters.search?.trim();
    const where: Prisma.ContestStudyTopicWhereInput = {
      contestId,
      status,
      studyTopic: {
        discipline: filters.discipline || undefined,
        OR: search
          ? [
              { subject: { contains: search, mode: "insensitive" } },
              { detail: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
    };

    const topics = await this.prisma.contestStudyTopic.findMany({
      where,
      include: { studyTopic: true },
      orderBy: [
        { studyTopic: { discipline: "asc" } },
        { studyTopicId: "asc" },
      ],
    });

    return topics.map(({ studyTopic, ...progress }) =>
      withVideoLessons({ ...studyTopic, ...progress }),
    );
  }

  async summary(contestId: string) {
    const [total, statusCounts, topics] = await Promise.all([
      this.prisma.contestStudyTopic.count({ where: { contestId } }),
      this.prisma.contestStudyTopic.groupBy({
        by: ["status"],
        where: { contestId },
        _count: { _all: true },
      }),
      this.prisma.contestStudyTopic.findMany({
        where: { contestId },
        select: {
          progress: true,
          studyTopic: { select: { discipline: true } },
        },
      }),
    ]);
    const counts = Object.fromEntries(
      statusCounts.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<StudyStatus, number>>;

    const disciplineMap = new Map<
      string,
      { total: number; progress: number }
    >();
    for (const topic of topics) {
      const item = disciplineMap.get(topic.studyTopic.discipline) ?? {
        total: 0,
        progress: 0,
      };
      item.total += 1;
      item.progress += topic.progress;
      disciplineMap.set(topic.studyTopic.discipline, item);
    }

    return {
      total,
      notStarted: counts.NOT_STARTED ?? 0,
      inProgress: counts.IN_PROGRESS ?? 0,
      completed: counts.COMPLETED ?? 0,
      progress:
        total === 0 ? 0 : ((counts.COMPLETED ?? 0) / total) * 100,
      disciplines: [...disciplineMap.entries()]
        .map(([name, item]) => ({
          name,
          total: item.total,
          progress: item.total === 0 ? 0 : item.progress / item.total,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  }

  async update(contestId: string, id: number, dto: UpdateStudyTopicDto) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException("Tópico inválido.");
    }

    const progress =
      dto.status === StudyStatus.COMPLETED
        ? 100
        : dto.status === StudyStatus.IN_PROGRESS
          ? 50
          : dto.status === StudyStatus.NOT_STARTED
            ? 0
            : undefined;

    const current = await this.prisma.contestStudyTopic.findUnique({
      where: {
        contestId_studyTopicId: { contestId, studyTopicId: id },
      },
    });
    if (!current) {
      throw new BadRequestException(
        "Este tópico não pertence ao concurso selecionado.",
      );
    }

    const topic = await this.prisma.contestStudyTopic.update({
      where: {
        contestId_studyTopicId: { contestId, studyTopicId: id },
      },
      data: {
        status: dto.status,
        progress,
        notes: dto.notes,
        startedAt:
          dto.status === StudyStatus.IN_PROGRESS ? new Date() : undefined,
        completedAt:
          dto.status === StudyStatus.COMPLETED
            ? new Date()
            : dto.status
              ? null
              : undefined,
      },
      include: { studyTopic: true },
    });

    const { studyTopic, ...topicProgress } = topic;
    return withVideoLessons({ ...studyTopic, ...topicProgress });
  }
}
