const express = require("express");
const { fetchSongsByBpm } = require("../services/getSongBpmService");
const { songsCache } = require("../utils/cache");

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
    const keyword = (req.query.q || "").trim();
    const seed = Number(req.query.seed ?? 0);

    if (!Number.isFinite(bpm) || bpm <= 0) {
      return res.status(400).json({ error: "bpm query param is required" });
    }

    const cacheKey = `songs:${bpm}:${tolerance}:${keyword.toLowerCase()}:${seed}`;
    const cached = songsCache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const result = await fetchSongsByBpm({ bpm, tolerance, keyword });
    const shuffled = {
      ...result,
      songs: seededShuffle(result.songs || [], seed)
    };

    songsCache.set(cacheKey, shuffled);
    return res.json({ ...shuffled, cached: false });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
