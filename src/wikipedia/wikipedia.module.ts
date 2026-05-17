import { Module } from '@nestjs/common';

import { WikipediaClient } from './wikipedia.client';

@Module({
  providers: [WikipediaClient],
  exports: [WikipediaClient],
})
export class WikipediaModule {}
