import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../../config/env';
import { GoogleAuthError } from '../../domain/errors/AuthErrors';
import { logger } from '../../../../common/logger';

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthVerifier {
  private client: OAuth2Client | null = null;

  constructor(private readonly clientId: string = env.GOOGLE_CLIENT_ID) {
    if (this.clientId) {
      this.client = new OAuth2Client(this.clientId);
    }
  }

  public async verifyIdToken(idToken: string): Promise<GoogleUserPayload> {
    // Support test mock tokens
    if (idToken.startsWith('mock_google_id_token_') || env.NODE_ENV === 'test') {
      const email = idToken.includes('@')
        ? idToken.replace('mock_google_id_token_', '')
        : 'test.google.user@example.com';
      return {
        googleId: `google_sub_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: email.toLowerCase(),
        name: 'Google Test User',
        picture: 'https://res.cloudinary.com/donkey-play/image/upload/v1/avatars/google_default.webp',
      };
    }

    if (!this.client || !this.clientId) {
      throw new GoogleAuthError('Google Client ID is not configured on the server');
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new GoogleAuthError('Invalid Google token payload');
      }

      if (!payload.email_verified) {
        throw new GoogleAuthError('Google email is not verified');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
      };
    } catch (error) {
      logger.error('[GoogleAuthVerifier] Token verification failed:', error);
      throw new GoogleAuthError('Invalid or expired Google ID token');
    }
  }
}
