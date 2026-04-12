const axios = require("axios");
const { geoCache } = require("../utils/cache");

const LOOKUP_TIMEOUT_MS = 3500;

function normalizeCountryCode(input) {
  if (!input) {
    return "--";
  }

  return String(input).trim().toUpperCase().slice(0, 2) || "--";
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const fromForwarded = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]
      : "";

  const directIp = fromForwarded || req.headers["x-real-ip"] || req.ip || "";
  return String(directIp).replace("::ffff:", "").trim();
}

function createIpWhoIsProvider() {
  return {
    name: "ipwho.is",
    async lookupByIp(ip) {
      const response = await axios.get("https://ipwho.is/", {
        timeout: LOOKUP_TIMEOUT_MS,
        params: ip ? { ip } : undefined
      });

      return {
        country: response?.data?.country || response?.data?.country_name || "Unknown",
        countryCode: normalizeCountryCode(response?.data?.country_code)
      };
    }
  };
}

async function lookupCountryByIp(ip, provider = createIpWhoIsProvider()) {
  const cacheKey = `geo:${ip || "unknown"}`;
  const cached = geoCache.get(cacheKey);

  if (cached) {
    return { ...cached, cached: true };
  }

  try {
    const lookup = await provider.lookupByIp(ip);
    const payload = {
      ok: true,
      ip: ip || "unknown",
      country: lookup.country || "Unknown",
      countryCode: normalizeCountryCode(lookup.countryCode),
      source: provider.name
    };

    geoCache.set(cacheKey, payload);
    return { ...payload, cached: false };
  } catch (error) {
    return {
      ok: false,
      ip: ip || "unknown",
      country: "Unknown",
      countryCode: "--",
      source: "fallback",
      detail: error?.message || "lookup failed",
      cached: false
    };
  }
}

module.exports = {
  getClientIp,
  lookupCountryByIp,
  createIpWhoIsProvider,
  normalizeCountryCode
};
