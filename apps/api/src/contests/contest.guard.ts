import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ContestsService } from "./contests.service";

@Injectable()
export class ContestGuard implements CanActivate {
  constructor(private readonly contestsService: ContestsService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers["x-contest-id"];
    const contestId = Array.isArray(header) ? header[0] : header;
    if (!contestId) {
      throw new BadRequestException("Escolha um concurso para continuar.");
    }
    request.contest = await this.contestsService.findOwned(
      request.user.id,
      contestId,
    );
    return true;
  }
}
