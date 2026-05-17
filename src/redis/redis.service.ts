/**
 * RedisService — owns the single Redis connection used by the service.
 *
 * Used by WikipediaClient to cache responses and reduce load on the public
 * Wikipedia API. Marked @Global by RedisModule so any feature module can
 * inject it without re-importing.
 */

import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';

import { createClient, RedisClientType } from 'redis';

import { AppConfigService } from '@src/config/config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private _client!: RedisClientType;

  constructor(private readonly config: AppConfigService) {}

  get client(): RedisClientType {
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    this._client = createClient({ url: this.config.get('REDIS_URL') });
    this._client.on('error', err => {
      this.logger.error(`Redis error: ${err instanceof Error ? err.message : String(err)}`);
    });
    await this._client.connect();
    this.logger.log('Redis connected');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this._client?.isOpen) {
      await this._client.quit();
      this.logger.log('Redis disconnected');
    }
  }
}
