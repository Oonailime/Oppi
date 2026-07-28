import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { SESSION_COOKIE, SESSION_DURATION_MS } from "./auth.constants";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";
import type { AuthenticatedUser, HttpRequest } from "./auth.types";
import { readCookie } from "./auth.guard";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

interface CookieResponse {
  cookie: (
    name: string,
    value: string,
    options: ReturnType<typeof cookieOptions> & {
      maxAge: number;
      expires: Date;
    },
  ) => void;
  clearCookie: (
    name: string,
    options: ReturnType<typeof cookieOptions>,
  ) => void;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = await this.authService.login(dto.username, dto.password);
    response.cookie(SESSION_COOKIE, result.token, {
      ...cookieOptions(),
      maxAge: SESSION_DURATION_MS,
      expires: result.expiresAt,
    });
    return { user: result.user };
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: HttpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const cookieHeader = request.headers.cookie;
    await this.authService.logout(
      readCookie(
        Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader,
        SESSION_COOKIE,
      ),
    );
    response.clearCookie(SESSION_COOKIE, cookieOptions());
    return { success: true };
  }
}
