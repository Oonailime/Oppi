import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity {
  subject: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleIdentityService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  async verifyIdToken(credential: string): Promise<GoogleIdentity> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID")?.trim();
    if (!clientId) {
      throw new ServiceUnavailableException(
        "O login com Google ainda não foi configurado no servidor.",
      );
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      const subject = payload?.sub?.trim();
      const email = payload?.email?.trim().toLowerCase();

      if (!subject || !email || payload?.email_verified !== true) {
        throw new UnauthorizedException(
          "A conta Google não possui um e-mail verificado.",
        );
      }

      return {
        subject,
        email,
        displayName: payload.name?.trim() || email,
        avatarUrl: payload.picture?.trim() || null,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new UnauthorizedException(
        "Não foi possível validar a credencial do Google.",
      );
    }
  }
}
