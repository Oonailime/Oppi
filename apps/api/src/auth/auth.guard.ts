import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SESSION_COOKIE } from "./auth.constants";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";
import { IS_PUBLIC_KEY } from "./public.decorator";

export function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieHeader = request.headers.cookie;
    const token = readCookie(
      Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader,
      SESSION_COOKIE,
    );
    const user = await this.authService.authenticate(token);
    if (!user) {
      throw new UnauthorizedException("Faça login para continuar.");
    }
    request.user = user;
    return true;
  }
}
