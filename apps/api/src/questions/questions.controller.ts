import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { Contest } from "@prisma/client";
import { ContestGuard } from "../contests/contest.guard";
import { CurrentContest } from "../contests/current-contest.decorator";
import { SaveAttemptDraftDto } from "./dto/save-attempt-draft.dto";
import { StartAttemptDto } from "./dto/start-attempt.dto";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";
import { QuestionsService } from "./questions.service";

@Controller("simulations")
@UseGuards(ContestGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get("exams")
  listExams(@CurrentContest() contest: Contest) {
    return this.questionsService.listExams(contest.id);
  }

  @Get("disciplines")
  listDisciplines(
    @CurrentContest() contest: Contest,
    @Query("examId") examId?: string,
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

  @Get("drafts")
  listDrafts(@CurrentContest() contest: Contest) {
    return this.questionsService.listDrafts(contest.id);
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

  @Patch(":id/draft")
  saveDraft(
    @CurrentContest() contest: Contest,
    @Param("id") id: string,
    @Body() dto: SaveAttemptDraftDto,
  ) {
    return this.questionsService.saveDraft(id, dto, contest.id);
  }

  @Get(":id")
  getResult(
    @CurrentContest() contest: Contest,
    @Param("id") id: string,
  ) {
    return this.questionsService.getResult(id, contest.id);
  }
}
