/**
 * @fileoverview Request identifier resolution for rate limiting
 * STORY: 2-1-identifier
 *
 * Implements:
 * - SC-01: Trusted proxy IP whitelist for X-Forwarded-For
 * - SC-07: Constant-time identifier resolution
 * - FR-01: Anonymous requests rate-limited by IP address
 * - FR-02: Authenticated requests rate-limited by user ID
 */

/**
 * Options for identifier resolution
 * STORY: 2-1-identifier
 */
export interface IdentifierOptions {
  /** IPs (or CIDR ranges) that can set X-Forwarded-For */
  trustedProxies: string[];
}

/**
 * Request-like interface for identifier resolution
 * Works with Express, Fastify, or custom request objects
 * STORY: 2-1-identifier
 */
export interface RequestLike {
  user?: { id: string; roles?: string[] };
  ip?: string;
  headers: { 'x-forwarded-for'?: string; [key: string]: string | undefined };
  socket?: { remoteAddress?: string };
}

/**
 * Check if an IP is in a CIDR range
 * FIX M-02: Add warning for unsupported CIDR ranges
 * Supports: exact IP, /24, /32 ranges
 */
function ipInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const maskBits = parseInt(bits, 10);

  // FIX M-02: Support /32 (exact match) and /24, warn for others
  if (maskBits === 32) {
    // /32 is exact IP match
    return ip === range;
  }

  if (maskBits === 24) {
    // /24: first 3 octets must match
    const ipParts = ip.split('.');
    const rangeParts = range.split('.');
    return (
      ipParts[0] === rangeParts[0] &&
      ipParts[1] === rangeParts[1] &&
      ipParts[2] === rangeParts[2]
    );
  }

  // FIX M-02: Log warning for unsupported ranges instead of silent failure
  console.warn(JSON.stringify({
    level: 'warn',
    msg: 'Unsupported CIDR range in trustedProxies',
    cidr,
    supported: ['/24', '/32', 'exact IP'],
    recommendation: 'Use ip-cidr package for full CIDR support',
  }));
  return false;
}

/**
 * Check if an IP is in the trusted proxies list
 */
function isTrustedProxy(ip: string, trustedProxies: string[]): boolean {
  for (const trusted of trustedProxies) {
    if (ipInCidr(ip, trusted)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the client IP from X-Forwarded-For header
 * Returns the first (leftmost) IP in the chain
 */
function getForwardedIp(forwardedFor: string): string {
  const ips = forwardedFor.split(',').map((ip) => ip.trim());
  return ips[0] || '';
}

/**
 * Resolve request identifier for rate limiting
 * STORY: 2-1-identifier
 *
 * AC-01: If req.user.id exists, use user:{id} as identifier
 * AC-02: If no auth, use IP from X-Forwarded-For or direct connection
 * AC-03: X-Forwarded-For only trusted from whitelisted proxy IPs
 * AC-04: Identifier resolution is constant-time (no early returns)
 *
 * @param req - Request object
 * @param options - Identifier resolution options
 * @returns Identifier string in format "user:{id}" or "ip:{address}"
 */
export function resolveIdentifier(req: RequestLike, options: IdentifierOptions): string {
  // SC-07: Constant-time resolution - compute all values before deciding
  // This prevents timing attacks that could reveal user existence

  // Compute user identifier (may be undefined)
  const userId = req.user?.id;
  const userIdentifier = userId ? `user:${userId}` : null;

  // Compute IP identifier
  const directIp = req.ip || req.socket?.remoteAddress || 'unknown';
  const forwardedFor = req.headers['x-forwarded-for'];

  // AC-03: Only trust X-Forwarded-For from whitelisted proxies
  let clientIp = directIp;
  if (forwardedFor && isTrustedProxy(directIp, options.trustedProxies)) {
    // AC-02: Use first IP from X-Forwarded-For chain
    clientIp = getForwardedIp(forwardedFor);
  }

  const ipIdentifier = `ip:${clientIp}`;

  // AC-01: User ID takes precedence over IP
  // AC-04: Both branches take similar time (no early return optimization)
  const result = userIdentifier || ipIdentifier;

  return result;
}
