import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true }) as Env[K];
  }

  get isDev(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  get isProd(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}
