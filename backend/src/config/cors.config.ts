/**
 * Allowed CORS origins for HTTP API and Socket.IO.
 * - CORS_ORIGINS: comma-separated list (highest priority), e.g.
 *   http://localhost:3001,http://192.168.1.9:3000
 * - Else FRONTEND_URL: single origin
 * - Else: local dev defaults (Next.js on 3000 or 3001, API often 3000)
 */
export function getCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (raw) {
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  }
  const single = process.env.FRONTEND_URL?.trim();
  if (single) {
    return [single];
  }
  return ['http://localhost:3000', 'http://localhost:3001'];
}
