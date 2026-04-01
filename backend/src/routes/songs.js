const express = require("express");
const { fetchSongsByBpm } = require("../services/getSongBpmService");
const { songsCache } = require("../utils/cache");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const bpm = Number(req.query.bpm);
    const tolerance = Number(req.query.tolerance ?? 5);
    const keyword = (req.query.q || "").trim();

    if (!Number.isFinite(bpm) || bpm <= 0) {
      return res.status(400).json({ error: "bpm query param is required" });
    }

    const cacheKey = `songs:${bpm}:${tolerance}:${keyword.toLowerCase()}`;
    const cached = songsCache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const result = await fetchSongsByBpm({ bpm, tolerance, keyword });

    songsCache.set(cacheKey, result);
    return res.json({ ...result, cached: false });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
