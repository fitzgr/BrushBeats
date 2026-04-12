const express = require("express");
const { getClientIp, lookupCountryByIp } = require("../services/geoLocationService");

const router = express.Router();

router.get("/country", async (req, res) => {
  const ip = getClientIp(req);
  const geo = await lookupCountryByIp(ip);
  return res.json(geo);
});

module.exports = router;
