import type { Config } from '@netlify/functions';
import { handleBareRequest } from '../../lib/bare.mjs';

export default async (request: Request) => handleBareRequest(request);

export const config: Config = {
  path: ['/bare', '/bare/*'],
  rateLimit: {
    windowSize: 60,
    windowLimit: 600,
    aggregateBy: ['domain', 'ip'],
  },
};
