import { Injectable, NotFoundException } from "@nestjs/common";
import type { Contest } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContestDto } from "./dto/create-contest.dto";
import { UpdateContestDto } from "./dto/update-contest.dto";

function parseTargetDate(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function serializeContest(contest: Contest) {
  return {
    ...contest,
    targetDate: contest.targetDate?.toISOString().slice(0, 10) ?? null,
  };
}

@Injectable()
export class ContestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const contests = await this.prisma.contest.findMany({
      where: { userId },
      orderBy: [{ targetDate: "asc" }, { createdAt: "asc" }],
    });
    return contests.map(serializeContest);
  }

  async create(userId: string, dto: CreateContestDto) {
    const contest = await this.prisma.contest.create({
      data: {
        userId,
        name: dto.name.trim(),
        targetDate: parseTargetDate(dto.targetDate),
      },
    });
    return serializeContest(contest);
  }

  async update(userId: string, id: string, dto: UpdateContestDto) {
    await this.findOwned(userId, id);
    const contest = await this.prisma.contest.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        targetDate:
          dto.targetDate === undefined
            ? undefined
            : parseTargetDate(dto.targetDate),
      },
    });
    return serializeContest(contest);
  }

  async findOwned(userId: string, id: string) {
    const contest = await this.prisma.contest.findFirst({
      where: { id, userId },
    });
    if (!contest) {
      throw new NotFoundException("Concurso não encontrado para este usuário.");
    }
    return contest;
  }
}
