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

function withVideoLessons<T extends { subject: string; discipline: string; detail: string | null }>(
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

  async list(filters: StudyPlanFilters) {
    const status =
      filters.status &&
      Object.values(StudyStatus).includes(filters.status as StudyStatus)
        ? (filters.status as StudyStatus)
        : undefined;
    const search = filters.search?.trim();
    const where: Prisma.StudyTopicWhereInput = {
      discipline: filters.discipline || undefined,
      status,
      OR: search
        ? [
            { subject: { contains: search, mode: "insensitive" } },
            { detail: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    };

    const topics = await this.prisma.studyTopic.findMany({
      where,
      orderBy: [{ discipline: "asc" }, { id: "asc" }],
    });

    return topics.map(withVideoLessons);
  }

  async summary() {
    const [total, statusCounts, disciplines] = await Promise.all([
      this.prisma.studyTopic.count(),
      this.prisma.studyTopic.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      this.prisma.studyTopic.groupBy({
        by: ["discipline"],
        _count: { id: true },
        _avg: { progress: true },
        orderBy: { discipline: "asc" },
      }),
    ]);
    const counts = Object.fromEntries(
      statusCounts.map((row) => [row.status, row._count.id]),
    ) as Partial<Record<StudyStatus, number>>;

    return {
      total,
      notStarted: counts.NOT_STARTED ?? 0,
      inProgress: counts.IN_PROGRESS ?? 0,
      completed: counts.COMPLETED ?? 0,
      progress:
        total === 0 ? 0 : ((counts.COMPLETED ?? 0) / total) * 100,
      disciplines: disciplines.map((row) => ({
        name: row.discipline,
        total: row._count.id,
        progress: row._avg.progress ?? 0,
      })),
    };
  }

  async update(id: number, dto: UpdateStudyTopicDto) {
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

    const topic = await this.prisma.studyTopic.update({
      where: { id },
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
    });

    return withVideoLessons(topic);
  }
}
