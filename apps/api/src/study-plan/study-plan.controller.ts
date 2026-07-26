import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { UpdateStudyTopicDto } from "./dto/update-study-topic.dto";
import { StudyPlanService } from "./study-plan.service";

@Controller("study-plan")
export class StudyPlanController {
  constructor(private readonly studyPlanService: StudyPlanService) {}

  @Get()
  list(
    @Query("discipline") discipline?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.studyPlanService.list({ discipline, status, search });
  }

  @Get("summary")
  summary() {
    return this.studyPlanService.summary();
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateStudyTopicDto) {
    return this.studyPlanService.update(Number(id), dto);
  }
}
