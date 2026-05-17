import { Controller, Get } from '@nestjs/common';

import { AppConfigService } from '@src/config/config.service';

@Controller('health')
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  readiness() {
    return {
      status: 'ok',
      env: this.config.get('NODE_ENV'),
      service: 'nestjs-mastra-mcp-gateway',
      authMode: this.config.get('AUTH_MODE'),
    };
  }
}
