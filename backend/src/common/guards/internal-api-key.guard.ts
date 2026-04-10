import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard that validates the X-Internal-Api-Key header for service-to-service calls
 * (e.g. AI Vision → Backend). The key must match AI_SERVICE_API_KEY env var.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-internal-api-key'];
    const expected = this.configService.get<string>('AI_SERVICE_API_KEY');

    if (!expected || !key || key !== expected) {
      throw new UnauthorizedException('Invalid or missing internal API key');
    }
    return true;
  }
}
