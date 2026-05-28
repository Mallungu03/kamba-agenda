import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService) {}

  get apiUrl(): string {
    return this.config.get<string>('env.api.url')!;
  }

  get apiPort(): number {
    return this.config.get<number>('env.api.port')!;
  }

  get apiHost(): string {
    return this.config.get<string>('env.api.host')!;
  }

  get databaseUrl(): string {
    return this.config.get<string>('env.databaseUrl')!;
  }

  get smtpUser(): string {
    return this.config.get<string>('env.smtp.user')!;
  }

  get smtpPass(): string {
    return this.config.get<string>('env.smtp.pass')!;
  }

  get smtpHost(): string {
    return this.config.get<string>('env.smtp.host')!;
  }

  get smtpPort(): number {
    return this.config.get<number>('env.smtp.port')!;
  }

  get smtpSecure(): boolean {
    return this.config.get<boolean>('env.smtp.secure')!;
  }

  get smtpFrom(): string {
    return this.config.get<string>('env.smtp.from')!;
  }

  get jwtAccessSecret(): StringValue {
    return this.config.get<string>('env.jwt.accessSecret') as StringValue;
  }

  get jwtRefreshSecret(): StringValue {
    return this.config.get<string>('env.jwt.refreshSecret') as StringValue;
  }

  get jwtAccessExpiresIn(): StringValue {
    return this.config.get<string>('env.jwt.expiresIn') as StringValue;
  }

  get jwtRefreshExpiresIn(): StringValue {
    return this.config.get<string>('env.jwt.expiresIn') as StringValue;
  }

  get nodeEnv(): string {
    return this.config.get<string>('env.nodeEnv')!;
  }

  get rateTtl(): number {
    return this.config.get<number>('throttler.ttl') ?? 60;
  }

  get rateLimit(): number {
    return this.config.get<number>('throttler.limit') ?? 100;
  }

  get authRateTtl(): number {
    return this.config.get<number>('throttler.authTtl') ?? 60;
  }

  get authRateLimit(): number {
    return this.config.get<number>('throttler.authLimit') ?? 5;
  }

  get rateBlockDuration(): number {
    return this.config.get<number>('throttler.blockDuration') ?? 180000;
  }

  get redisHost(): string {
    return this.config.get<string>('env.redis.host')!;
  }

  get redisPort(): number {
    return this.config.get<number>('env.redis.port')!;
  }

  get cloudinaryName(): StringValue {
    return this.config.get<string>('env.cloudinary.name') as StringValue;
  }

  get cloudinaryKey(): StringValue {
    return this.config.get<string>('env.cloudinary.key') as StringValue;
  }

  get cloudinarySecret(): StringValue {
    return this.config.get<string>('env.cloudinary.secret') as StringValue;
  }

  get whatsappFrom(): string {
    return this.config.get<string>('env.whatsapp.from')!;
  }

  get twilioAccountSid(): string {
    return this.config.get<string>('env.whatsapp.twilioAccountSid')!;
  }

  get twilioAuthToken(): string {
    return this.config.get<string>('env.whatsapp.twilioAuthToken')!;
  }
}
