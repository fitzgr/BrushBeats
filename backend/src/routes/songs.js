const express = require("express");
const { fetchSongsByBpm } = require("../services/getSongBpmService");
const { songsCache } = require("../utils/cache");
const { getClientIp, lookupCountryByIp, normalizeCountryCode } = require("../services/geoLocationService");

const router = express.Router();

function seededShuffle(songs, seed) {
  if (!Array.isArray(songs) || songs.length <= 1) {
    return songs;
  }

  const items = [...songs];
  let value = Number.isFinite(seed) ? seed : 0;

  for (let i = items.length - 1; i > 0; i -= 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;
    const j = value % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }

  return items;
}

router.get("/", async (req, res, next) => {
  try {
    const bpm = Number(req.query.bpm);
    const tolerance = Number(req.query.tolerance ?? 5);
    const danceability = Number(req.query.danceability ?? 50);
    const acousticness = Number(req.query.acousticness ?? 50);
    const totalTeeth = Number(req.query.totalTeeth ?? 32);
    const keyword = (req.query.q || "").trim();
    const seed = Number(req.query.seed ?? 0);
    const browserLanguage = (req.query.browserLanguage || "").trim();
    const countryCodeInput = (req.query.countryCode || "").trim();
    const genreHint = (req.query.genreHint || "").trim();

    if (!Number.isFinite(bpm) || bpm <= 0) {
      return res.status(400).json({ error: "bpm query param is required" });
    }

    let countryCode = normalizeCountryCode(countryCodeInput);
    let geoSource = "query";

    if (!countryCodeInput || countryCode === "--") {
      const ip = getClientIp(req);
      const geo = await lookupCountryByIp(ip);
      countryCode = normalizeCountryCode(geo.countryCode);
      geoSource = geo.source;
    }

    const cacheKey = `songs:${totalTeeth}:${bpm}:${tolerance}:${danceability}:${acousticness}:${keyword.toLowerCase()}:${seed}`;
    const contextCacheKey = `${browserLanguage.toLowerCase()}:${countryCode}:${genreHint.toLowerCase()}`;
    const fullCacheKey = `${cacheKey}:${contextCacheKey}`;
    const cached = songsCache.get(fullCacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const result = await fetchSongsByBpm({
      bpm,
      tolerance,
      danceability,
      acousticness,
      totalTeeth,
      keyword,
      seed,
      browserLanguage,
      countryCode,
      genreHint
    });
    const shuffled = {
      ...result,
      geoSource,
      context: {
        browserLanguage,
        countryCode,
        genreHint,
        targetBpm: Math.round(bpm),
        toothCount: totalTeeth
      },
      songs: seededShuffle(result.songs || [], seed)
    };

    songsCache.set(fullCacheKey, shuffled);
    return res.json({ ...shuffled, cached: false });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
