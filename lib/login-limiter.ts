// Single-password, single-process deployment: do not trust client-supplied IP
// headers to bypass the limit. Multi-instance deployments need a shared limiter.
export function createLoginLimiter(limit = 10, windowMs = 60_000) {
  let attempts = 0;
  let resetAt = 0;
  return (now = Date.now()): number => {
    if (now >= resetAt) {
      attempts = 0;
      resetAt = now + windowMs;
    }
    if (attempts >= limit)
      return Math.max(1, Math.ceil((resetAt - now) / 1000));
    attempts += 1;
    return 0;
  };
}

export const checkLoginLimit = createLoginLimiter();
