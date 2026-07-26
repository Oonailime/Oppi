import { Controller, Get, Post } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard() {
    return this.dashboardService.getDashboard();
  }

  @Post("study-timer/start")
  startStudyTimer() {
    return this.dashboardService.startStudyTimer();
  }

  @Post("study-timer/pause")
  pauseStudyTimer() {
    return this.dashboardService.pauseStudyTimer();
  }
}
