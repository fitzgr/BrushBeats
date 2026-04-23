function toBoundedNumber(value, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, fallback = 0, integer = false } = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return fallback;
  }

  const normalized = integer ? Math.round(raw) : raw;
  return Math.min(max, Math.max(min, normalized));
}

function sanitizeText(value, { maxLength = 120, fallback = "", toLowerCase = false } = {}) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);

  return toLowerCase ? cleaned.toLowerCase() : cleaned;
}

function isSafeIdentifier(value, { maxLength = 64 } = {}) {
  if (typeof value !== "string") {
    return false;
  }

  if (value.length < 1 || value.length > maxLength) {
    return false;
  }

  return /^[a-zA-Z0-9._-]+$/.test(value);
}

function isSafeLocaleCode(value) {
  if (typeof value !== "string") {
    return false;
  }

  return /^[a-z]{2,10}(?:-[a-z0-9]{2,8})?$/.test(value);
}

function safeJsonByteSize(input) {
  try {
    return Buffer.byteLength(JSON.stringify(input), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

module.exports = {
  isSafeIdentifier,
  isSafeLocaleCode,
  safeJsonByteSize,
  sanitizeText,
  toBoundedNumber
};
