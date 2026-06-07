import { NextResponse } from 'next/server';

const store = globalThis.__allstarRateLimitStore || new Map();
if (!globalThis.__allstarRateLimitStore) {
  globalThis.__allstarRateLimitStore = store;
}

function getClientIp(request) {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) return vercelForwarded.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || 'unknown';
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

async function incrementDistributedCounter(key, windowMs) {
  const baseUrl = process.env.KV_REST_API_URL?.replace(/\/$/, '');
  const token = process.env.KV_REST_API_TOKEN;
  if (!baseUrl || !token) return null;

  const windowSeconds = Math.max(Math.ceil(windowMs / 1000), 1);
  const headers = { Authorization: `Bearer ${token}` };
  const encodedKey = encodeURIComponent(key);

  const incrResponse = await fetch(`${baseUrl}/incr/${encodedKey}`, { headers });
  if (!incrResponse.ok) {
    throw new Error(`KV incr failed with ${incrResponse.status}`);
  }
  const incrPayload = await incrResponse.json();
  const count = Number(incrPayload?.result ?? 0);

  // Sliding window approximation: renew expiry on each request.
  await fetch(`${baseUrl}/expire/${encodedKey}/${windowSeconds}`, { headers });

  return { count, retryAfterSeconds: windowSeconds };
}

export async function enforceRateLimit(request, keyPrefix, maxRequests = 30, windowMs = 60_000) {
  const ip = getClientIp(request);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  // Prefer distributed limiter when KV is configured.
  try {
    const distributed = await incrementDistributedCounter(key, windowMs);
    if (distributed) {
      if (distributed.count > maxRequests) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: { 'Retry-After': String(distributed.retryAfterSeconds) }
          }
        );
      }
      return null;
    }
  } catch {
    // Fall back to in-memory limiter.
  }

  const entry = store.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) }
      }
    );
  }

  return null;
}
