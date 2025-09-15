import crypto from 'crypto';

interface VerifyArgs {
  rawBody: Buffer;
  signature: string; // expected format: sha256=hex
  timestamp: string;
  secret: string;
  maxSkewSeconds?: number;
}

export function verifySignature(args: VerifyArgs): boolean {
  const { rawBody, signature, timestamp, secret, maxSkewSeconds = 5 * 60 } = args;
  if (!signature || !timestamp || !secret) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > maxSkewSeconds) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.`);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');

  const provided = signature.startsWith('sha256=') ? signature.slice('sha256='.length) : signature;

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}


