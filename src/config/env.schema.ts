import { z } from 'zod';

const AuthModeSchema = z.enum(['none', 'jwt']).default('none');

const emptyStringToUndefined = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}, z.string().min(1).optional());

const optionalUrl = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}, z.string().url().optional());

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  AUTH_MODE: AuthModeSchema,

  MCP_API_KEY: emptyStringToUndefined,

  JWT_ISSUER: emptyStringToUndefined,
  JWT_AUDIENCE: emptyStringToUndefined,
  JWT_JWKS_URI: optionalUrl,

  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
});

export const envSchema = baseSchema.passthrough().superRefine((env, ctx) => {
  if (env.AUTH_MODE === 'jwt') {
    for (const key of ['JWT_ISSUER', 'JWT_AUDIENCE', 'JWT_JWKS_URI'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when AUTH_MODE=jwt`,
        });
      }
    }
  }
});

export type Env = z.infer<typeof baseSchema>;
export type AuthMode = z.infer<typeof AuthModeSchema>;
