import { Injectable } from '@nestjs/common';

import type { AuthProvider } from '../auth-provider.interface';
import type { Principal } from '../principal';

/**
 * No-op AuthProvider: returns an anonymous Principal regardless of input.
 * Active when AUTH_MODE=none. Used for demos and local development where
 * standing up an IdP would be friction without value.
 */
@Injectable()
export class NoopAuthProvider implements AuthProvider {
  async verify(_token: string | undefined): Promise<Principal> {
    return {
      subject: 'anonymous',
      scopes: [],
    };
  }
}
