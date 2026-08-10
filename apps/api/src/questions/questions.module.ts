import { Module } from "@nestjs/common";
import { QuestionReportsService } from "./question-reports.service";
import { QuestionsController } from "./questions.controller";
import { QuestionsService } from "./questions.service";

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, QuestionReportsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
