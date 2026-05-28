import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  api: {
    url:
      process.env.API_URL ??
      `http://${process.env.HOST ?? 'localhost'}:${process.env.PORT ?? 3000}`,
    host: process.env.HOST ?? '0.0.0.0',
    port: Number(process.env.PORT ?? 3000),
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
  security: {
    saltRounds: Number(process.env.SALT_ROUNDS ?? 10),
  },
  smtp: {
    host: process.env.SMTP_HOST ?? process.env.EMAIL_HOST,
    port: process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : process.env.EMAIL_PORT
        ? Number(process.env.EMAIL_PORT)
        : undefined,
    user: process.env.SMTP_USER ?? process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS ?? process.env.EMAIL_PASS,
    from: process.env.SMTP_FROM ?? process.env.EMAIL_FROM,
    secure:
      process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true',
  },
  cloudinary: {
    name: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
  whatsapp: {
    from: process.env.WHATSAPP_FROM,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  },
}));
