import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { Contest } from "@prisma/client";
import { ContestGuard } from "../contests/contest.guard";
import { CurrentContest } from "../contests/current-contest.decorator";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(ContestGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@CurrentContest() contest: Contest) {
    return this.dashboardService.getDashboard(contest.id);
  }

  @Post("study-timer/start")
  startStudyTimer(@CurrentContest() contest: Contest) {
    return this.dashboardService.startStudyTimer(contest.id);
  }

  @Post("study-timer/pause")
  pauseStudyTimer(@CurrentContest() contest: Contest) {
    return this.dashboardService.pauseStudyTimer(contest.id);
  }
}
