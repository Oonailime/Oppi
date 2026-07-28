import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./auth/auth.guard";
import { AuthModule } from "./auth/auth.module";
import { ContestsModule } from "./contests/contests.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuestionsModule } from "./questions/questions.module";
import { StudyPlanModule } from "./study-plan/study-plan.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    AuthModule,
    ContestsModule,
    QuestionsModule,
    StudyPlanModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
