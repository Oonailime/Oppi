import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { Contest } from "@prisma/client";
import { ContestGuard } from "../contests/contest.guard";
import { CurrentContest } from "../contests/current-contest.decorator";
import { StartAttemptDto } from "./dto/start-attempt.dto";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";
import { QuestionsService } from "./questions.service";

@Controller("simulations")
@UseGuards(ContestGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get("exams")
  listExams() {
    return this.questionsService.listExams();
  }

  @Get("disciplines")
  listDisciplines(
    @CurrentContest() contest: Contest,
    @Query("examId") examId = "dataprev-2024",
  ) {
    return this.questionsService.listDisciplines(examId, contest.id);
  }

  @Get("history")
  listHistory(
    @CurrentContest() contest: Contest,
    @Query("limit") limit?: string,
  ) {
    return this.questionsService.listHistory(
      Number(limit ?? 12),
      contest.id,
    );
  }

  @Post()
  start(@CurrentContest() contest: Contest, @Body() dto: StartAttemptDto) {
    return this.questionsService.start(dto, contest.id);
  }

  @Post(":id/submit")
  submit(
    @CurrentContest() contest: Contest,
    @Param("id") id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.questionsService.submit(id, dto, contest.id);
  }

  @Get(":id")
  getResult(
    @CurrentContest() contest: Contest,
    @Param("id") id: string,
  ) {
    return this.questionsService.getResult(id, contest.id);
  }
}
