import { PrismaClient } from '@prisma/client';
declare global {
    var __prisma: PrismaClient | undefined;
}
declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, import(".prisma/client").Prisma.LogLevel, import("@prisma/client/runtime/library").DefaultArgs>;
export { prisma };
//# sourceMappingURL=database.d.ts.map