import { ConfigService } from '@nestjs/config';

const PLACEHOLDER_SECRETS = new Set([
  'your-super-secret-jwt-key-change-in-production',
  'fallback-secret',
]);

export function resolveJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_SECRET')?.trim();
  if (!secret || PLACEHOLDER_SECRETS.has(secret)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET must be set to a strong random value in production (not a placeholder).',
      );
    }
    return 'dev-only-insecure-jwt-secret-do-not-use-in-production';
  }
  return secret;
}
