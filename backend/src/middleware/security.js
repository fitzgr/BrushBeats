const { sanitizeText } = require("../utils/inputValidation");

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = Number(process.env.API_RATE_LIMIT_PER_MINUTE || 180);
const buckets = new Map();

function pruneBuckets(now) {
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.start > WINDOW_MS * 2) {
      buckets.delete(key);
    }
  }
}

function applySecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}

function basicRateLimit(req, res, next) {
  const now = Date.now();
  pruneBuckets(now);

  const rawIp = req.ip || req.socket?.remoteAddress || "unknown";
  const ip = sanitizeText(String(rawIp), { maxLength: 80, fallback: "unknown" });
  const path = sanitizeText(String(req.path || ""), { maxLength: 80, fallback: "" });
  const key = `${ip}:${path}`;

  const current = buckets.get(key);
  if (!current || now - current.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests. Please retry shortly." });
  }

  return next();
}

module.exports = {
  applySecurityHeaders,
  basicRateLimit
};
