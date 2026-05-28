import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DOTENV: Joi.boolean().truthy('true').falsy('false').optional(),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  PORT: Joi.number().port().default(3000),
  HOST: Joi.alternatives()
    .try(Joi.string().hostname(), Joi.string().ip())
    .default('0.0.0.0'),
  JWT_SECRET: Joi.string().min(16).optional(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  SALT_ROUNDS: Joi.number().integer().min(4).max(16).default(10),
  EMAIL_HOST: Joi.string().hostname().optional(),
  EMAIL_PORT: Joi.number().port().optional(),
  EMAIL_USER: Joi.string().optional(),
  EMAIL_PASS: Joi.string().optional(),
  EMAIL_FROM: Joi.string().optional(),
  EMAIL_SECURE: Joi.boolean().truthy('true').falsy('false').optional(),
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),
  SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  CLOUDINARY_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  CLOUDINARY_API_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  REDIS_HOST: Joi.string().hostname().default('127.0.0.1'),
  WHATSAPP_FROM: Joi.string().optional(),
  TWILIO_ACCOUNT_SID: Joi.string().optional(),
  TWILIO_AUTH_TOKEN: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().default(6379),
})
  .and('JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET')
  .or('JWT_SECRET', 'JWT_ACCESS_SECRET');
