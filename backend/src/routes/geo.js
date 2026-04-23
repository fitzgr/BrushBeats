const express = require("express");
const { getClientIp, lookupCountryByIp } = require("../services/geoLocationService");

const router = express.Router();

router.get("/country", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const geo = await lookupCountryByIp(ip);
    return res.json(geo);
  } catch {
    return res.status(200).json({ countryCode: "--", countryName: "Unknown", source: "fallback" });
  }
});

module.exports = router;
