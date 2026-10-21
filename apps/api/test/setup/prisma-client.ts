import { PrismaClient, PrismaPg } from '@eta/db';

export function createPrismaClient(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
