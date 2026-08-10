import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ContestStudyTopic,
  Prisma,
  StudyStatus,
  StudyTopic,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateStudyTopicDto } from "./dto/update-study-topic.dto";

interface StudyPlanFilters {
  discipline?: string;
  status?: string;
  search?: string;
}

type CatalogSubject = StudyTopic &
  ContestStudyTopic & {
    videoLessons: Array<{ label: string; url: string }>;
  };

const enemCognitiveAxes = [
  {
    code: "DL",
    title: "Dominar linguagens",
    description:
      "Usar as linguagens portuguesa, matemática, artística e científica e as línguas inglesa e espanhola.",
  },
  {
    code: "CF",
    title: "Compreender fenômenos",
    description:
      "Construir e aplicar conceitos para compreender fenômenos naturais, histórico-geográficos, tecnológicos e artísticos.",
  },
  {
    code: "SP",
    title: "Enfrentar situações-problema",
    description:
      "Selecionar, organizar, relacionar e interpretar dados para tomar decisões e resolver problemas.",
  },
  {
    code: "CA",
    title: "Construir argumentação",
    description:
      "Relacionar informações e conhecimentos para construir argumentos consistentes.",
  },
  {
    code: "EP",
    title: "Elaborar propostas",
    description:
      "Elaborar intervenções solidárias que respeitem os valores humanos e a diversidade sociocultural.",
  },
];

const moduleOrder = new Map([
  ["Linguagens", 1],
  ["Redação", 2],
  ["Matemática", 3],
  ["Ciências da Natureza", 4],
  ["Ciências Humanas", 5],
]);

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
        isGroup: false,
        discipline: filters.discipline || undefined,
        OR: search
          ? [
              { subject: { contains: search, mode: "insensitive" } },
              { detail: { contains: search, mode: "insensitive" } },
              { topicTitle: { contains: search, mode: "insensitive" } },
              { topicCode: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
    };

    const topics = await this.prisma.contestStudyTopic.findMany({
      where,
      include: { studyTopic: true },
      orderBy: [
        { studyTopic: { module: "asc" } },
        { studyTopic: { discipline: "asc" } },
        { studyTopic: { topicCode: "asc" } },
        { studyTopic: { sortOrder: "asc" } },
        { studyTopicId: "asc" },
      ],
    });

    return topics.map(({ studyTopic, ...progress }) =>
      withVideoLessons({ ...studyTopic, ...progress }),
    );
  }

  async summary(contestId: string) {
    const activeTopicWhere: Prisma.ContestStudyTopicWhereInput = {
      contestId,
      studyTopic: { isGroup: false },
    };
    const [total, statusCounts, topics] = await Promise.all([
      this.prisma.contestStudyTopic.count({ where: activeTopicWhere }),
      this.prisma.contestStudyTopic.groupBy({
        by: ["status"],
        where: activeTopicWhere,
        _count: { _all: true },
      }),
      this.prisma.contestStudyTopic.findMany({
        where: activeTopicWhere,
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

  async catalog(contestId: string) {
    const rows = await this.prisma.contestStudyTopic.findMany({
      where: {
        contestId,
        studyTopic: { isGroup: false },
      },
      include: { studyTopic: true },
      orderBy: [
        { studyTopic: { module: "asc" } },
        { studyTopic: { topicCode: "asc" } },
        { studyTopic: { sortOrder: "asc" } },
        { studyTopicId: "asc" },
      ],
    });

    const groups = new Map<
      string,
      {
        code: string;
        title: string;
        module: string;
        page: string;
        competencyCodes: Set<string>;
        skillCodes: Set<string>;
        subjects: CatalogSubject[];
      }
    >();

    for (const { studyTopic, ...progress } of rows) {
      const code =
        studyTopic.topicCode ??
        `${studyTopic.module}-${studyTopic.syllabusItem}`;
      const key = `${studyTopic.module}:${code}`;
      const group = groups.get(key) ?? {
        code,
        title: studyTopic.topicTitle ?? studyTopic.syllabusItem,
        module: studyTopic.module,
        page: studyTopic.page,
        competencyCodes: new Set<string>(),
        skillCodes: new Set<string>(),
        subjects: [],
      };
      studyTopic.competencyCodes.forEach((item) =>
        group.competencyCodes.add(item),
      );
      studyTopic.skillCodes.forEach((item) => group.skillCodes.add(item));
      group.subjects.push(
        withVideoLessons({ ...studyTopic, ...progress }),
      );
      groups.set(key, group);
    }

    const modules = new Map<
      string,
      Array<{
        code: string;
        title: string;
        module: string;
        page: string;
        competencyCodes: string[];
        skillCodes: string[];
        completedSubjects: number;
        totalSubjects: number;
        progress: number;
        subjects: CatalogSubject[];
      }>
    >();
    for (const group of groups.values()) {
      const completedSubjects = group.subjects.filter(
        (subject) => subject.status === StudyStatus.COMPLETED,
      ).length;
      const item = {
        ...group,
        competencyCodes: [...group.competencyCodes],
        skillCodes: [...group.skillCodes],
        completedSubjects,
        totalSubjects: group.subjects.length,
        progress:
          group.subjects.length === 0
            ? 0
            : (completedSubjects / group.subjects.length) * 100,
      };
      const moduleGroups = modules.get(group.module) ?? [];
      moduleGroups.push(item);
      modules.set(group.module, moduleGroups);
    }

    const hasEnemCodes = rows.some(
      ({ studyTopic }) =>
        studyTopic.competencyCodes.length > 0 ||
        studyTopic.skillCodes.length > 0,
    );
    return {
      cognitiveAxes: hasEnemCodes ? enemCognitiveAxes : [],
      modules: [...modules.entries()]
        .map(([name, topicGroups]) => ({
          name,
          topics: topicGroups.sort(
            (left, right) =>
              left.code.localeCompare(right.code, "pt-BR") ||
              left.title.localeCompare(right.title, "pt-BR"),
          ),
        }))
        .sort(
          (left, right) =>
            (moduleOrder.get(left.name) ?? 99) -
              (moduleOrder.get(right.name) ?? 99) ||
            left.name.localeCompare(right.name, "pt-BR"),
        ),
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
      include: { studyTopic: true },
    });
    if (!current || current.studyTopic.isGroup) {
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
