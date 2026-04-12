const express = require("express");
const axios = require("axios");

const router = express.Router();
const LOOKUP_TIMEOUT_MS = 3500;

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

function normalizeLookupPayload(payload = {}) {
  return {
    country: payload.country || payload.country_name || "Unknown",
    countryCode: payload.country_code || payload.countryCode || "--"
  };
}

router.get("/country", async (req, res) => {
  const ip = getClientIp(req);

  try {
    const response = await axios.get("https://ipwho.is/", {
      timeout: LOOKUP_TIMEOUT_MS,
      params: ip ? { ip } : undefined
    });

    const normalized = normalizeLookupPayload(response?.data);

    return res.json({
      ok: true,
      ip: ip || "unknown",
      country: normalized.country,
      countryCode: normalized.countryCode,
      source: "ipwho.is"
    });
  } catch (error) {
    return res.json({
      ok: false,
      ip: ip || "unknown",
      country: "Unknown",
      countryCode: "--",
      source: "fallback",
      detail: error?.message || "lookup failed"
    });
  }
});

module.exports = router;
