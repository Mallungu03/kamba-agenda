import type { Prisma } from '@generated/prisma/client';

export function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === null || value === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}
