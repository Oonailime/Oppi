import { Global, Module } from "@nestjs/common";
import { ContestGuard } from "./contest.guard";
import { ContestsController } from "./contests.controller";
import { ContestsService } from "./contests.service";

@Global()
@Module({
  controllers: [ContestsController],
  providers: [ContestsService, ContestGuard],
  exports: [ContestsService, ContestGuard],
})
export class ContestsModule {}
