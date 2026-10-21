import { Module } from '@nestjs/common';
import { CryptoModule } from './crypto/crypto.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

/** Infrastructure every feature module may use. */
@Module({
  imports: [PrismaModule, RedisModule, CryptoModule],
})
export class CommonModule {}
