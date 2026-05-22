import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
  security: {
    saltRounds: Number(process.env.SALT_ROUNDS ?? 10),
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  whatsapp: {
    from: process.env.WHATSAPP_FROM,
  },
}));
