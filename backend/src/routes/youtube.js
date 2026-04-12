const express = require("express");
const { searchYoutubeVideo } = require("../services/youtubeService");
const { youtubeCache } = require("../utils/cache");
const { getClientIp, lookupCountryByIp, normalizeCountryCode } = require("../services/geoLocationService");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const title = (req.query.title || "").trim();
    const artist = (req.query.artist || "").trim();
    const browserLanguage = (req.query.browserLanguage || "").trim();
    const countryCodeInput = (req.query.countryCode || "").trim();
    const targetBpm = Number(req.query.targetBpm || 120);
    const toothCount = Number(req.query.toothCount || 32);
    const genreHint = (req.query.genreHint || "").trim();

    if (!title || !artist) {
      return res.status(400).json({ error: "title and artist are required" });
    }

    let countryCode = normalizeCountryCode(countryCodeInput);
    let geoSource = "query";

    if (!countryCodeInput || countryCode === "--") {
      const ip = getClientIp(req);
      const geo = await lookupCountryByIp(ip);
      countryCode = normalizeCountryCode(geo.countryCode);
      geoSource = geo.source;
    }

    const cacheKey = [
      "ytv2",
      title.toLowerCase(),
      artist.toLowerCase(),
      browserLanguage.toLowerCase(),
      countryCode,
      Number.isFinite(targetBpm) ? Math.round(targetBpm) : 120,
      Number.isFinite(toothCount) ? Math.round(toothCount) : 32,
      genreHint.toLowerCase()
    ].join(":");
    const cached = youtubeCache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const result = await searchYoutubeVideo({
      title,
      artist,
      context: {
        browserLanguage,
        countryCode,
        targetBpm,
        toothCount,
        genreHint
      }
    });
    const payload = {
      ...result,
      geoSource,
      youtubeUrl: result.videoId ? `https://www.youtube.com/watch?v=${result.videoId}` : null,
      embedUrl: result.videoId ? `https://www.youtube.com/embed/${result.videoId}` : null
    };

    youtubeCache.set(cacheKey, payload);
    return res.json({ ...payload, cached: false });
  } catch (error) {
    if (error.response?.status === 403) {
      return res.status(429).json({
        error: "YouTube API quota exceeded or request blocked.",
        detail: error.response?.data
      });
    }

    return next(error);
  }
});

module.exports = router;
