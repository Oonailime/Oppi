import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ContestsService } from "./contests.service";
import { UpdateContestDto } from "./dto/update-contest.dto";

@Controller("contests")
export class ContestsController {
  constructor(private readonly contestsService: ContestsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.contestsService.list(user.id);
  }

  @Get("reusable-exams")
  listReusableExams(@Query("search") search?: string) {
    return this.contestsService.listReusableExams(search);
  }

  @Post()
  createDisabled() {
    throw new ServiceUnavailableException(
      "A criação direta de concursos está desativada. Use “Solicitar concurso” para enviar os dados por e-mail.",
    );
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
