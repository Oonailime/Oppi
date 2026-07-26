import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DashboardModule } from "./dashboard/dashboard.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuestionsModule } from "./questions/questions.module";
import { StudyPlanModule } from "./study-plan/study-plan.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    QuestionsModule,
    StudyPlanModule,
    DashboardModule,
  ],
})
export class AppModule {}
