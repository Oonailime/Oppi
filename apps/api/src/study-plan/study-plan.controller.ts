import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { Contest } from "@prisma/client";
import { ContestGuard } from "../contests/contest.guard";
import { CurrentContest } from "../contests/current-contest.decorator";
import { UpdateStudyTopicDto } from "./dto/update-study-topic.dto";
import { StudyPlanService } from "./study-plan.service";

@Controller("study-plan")
@UseGuards(ContestGuard)
export class StudyPlanController {
  constructor(private readonly studyPlanService: StudyPlanService) {}

  @Get()
  list(
    @CurrentContest() contest: Contest,
    @Query("discipline") discipline?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.studyPlanService.list(contest.id, {
      discipline,
      status,
      search,
    });
  }

  @Get("summary")
  summary(@CurrentContest() contest: Contest) {
    return this.studyPlanService.summary(contest.id);
  }

  @Get("catalog")
  catalog(@CurrentContest() contest: Contest) {
    return this.studyPlanService.catalog(contest.id);
  }

  @Patch(":id")
  update(
    @CurrentContest() contest: Contest,
    @Param("id") id: string,
    @Body() dto: UpdateStudyTopicDto,
  ) {
    return this.studyPlanService.update(contest.id, Number(id), dto);
  }
}
