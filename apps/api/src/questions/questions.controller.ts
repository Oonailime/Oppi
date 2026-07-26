import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { StartAttemptDto } from "./dto/start-attempt.dto";
import { SubmitAttemptDto } from "./dto/submit-attempt.dto";
import { QuestionsService } from "./questions.service";

@Controller("simulations")
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get("exams")
  listExams() {
    return this.questionsService.listExams();
  }

  @Get("disciplines")
  listDisciplines(@Query("examId") examId = "dataprev-2024") {
    return this.questionsService.listDisciplines(examId);
  }

  @Get("history")
  listHistory(@Query("limit") limit?: string) {
    return this.questionsService.listHistory(Number(limit ?? 12));
  }

  @Post()
  start(@Body() dto: StartAttemptDto) {
    return this.questionsService.start(dto);
  }

  @Post(":id/submit")
  submit(@Param("id") id: string, @Body() dto: SubmitAttemptDto) {
    return this.questionsService.submit(id, dto);
  }

  @Get(":id")
  getResult(@Param("id") id: string) {
    return this.questionsService.getResult(id);
  }
}
