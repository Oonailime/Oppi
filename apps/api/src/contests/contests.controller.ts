import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ContestsService } from "./contests.service";
import { CreateContestDto } from "./dto/create-contest.dto";
import { UpdateContestDto } from "./dto/update-contest.dto";

@Controller("contests")
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.contestsService.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContestDto,
  ) {
    return this.contestsService.create(user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateContestDto,
  ) {
    return this.contestsService.update(user.id, id, dto);
  }
}
