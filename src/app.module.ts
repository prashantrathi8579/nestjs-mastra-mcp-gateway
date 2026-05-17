import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { McpModule } from './mcp/mcp.module';
import { RedisModule } from './redis/redis.module';
import { WikipediaModule } from './wikipedia/wikipedia.module';

@Module({
  imports: [ConfigModule, RedisModule, AuthModule, WikipediaModule, McpModule, HealthModule],
})
export class AppModule {}
