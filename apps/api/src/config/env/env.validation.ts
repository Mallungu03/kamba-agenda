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
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  SALT_ROUNDS: Joi.number().integer().min(4).max(16).default(10),
  EMAIL_HOST: Joi.string().hostname().optional(),
  EMAIL_PORT: Joi.number().port().optional(),
  EMAIL_USER: Joi.string().optional(),
  EMAIL_PASS: Joi.string().optional(),
  EMAIL_FROM: Joi.string().optional(),
});
