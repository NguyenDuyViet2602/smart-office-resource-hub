import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
    private auditLogService: AuditLogService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({ ...dto, password: hashed });

    this.auditLogService.log({ action: AuditAction.USER_REGISTERED, userId: user.id });

    return this.signTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    this.auditLogService.log({ action: AuditAction.USER_LOGIN, userId: user.id });

    return this.signTokens(user);
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token required');

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.redisClient.get(`refresh:${payload.sub}:${refreshToken}`);
    if (!stored) throw new UnauthorizedException('Refresh token revoked or expired');

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('User not found or disabled');

    // Rotate: revoke old, issue new
    await this.redisClient.del(`refresh:${payload.sub}:${refreshToken}`);
    return this.signTokens(user);
  }

  async forgotPassword(email: string) {
    // Always return success to prevent user enumeration
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.savePasswordResetToken(user.id, token, expires);

    this.auditLogService.log({ action: AuditAction.PASSWORD_RESET_REQUESTED, userId: user.id });

    try {
      await this.notificationsService.sendPasswordResetEmail(user.email, token);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) throw new BadRequestException('Token and new password are required');

    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(user.id, hashed);

    this.auditLogService.log({ action: AuditAction.PASSWORD_RESET_COMPLETED, userId: user.id });

    return { message: 'Password updated successfully' };
  }

  private async signTokens(user: { id: string; email: string; role: string; name: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    });

    await this.redisClient.setex(
      `refresh:${user.id}:${refreshToken}`,
      REFRESH_TOKEN_TTL,
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  }
}
