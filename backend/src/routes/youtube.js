const express = require("express");
const { searchYoutubeVideo } = require("../services/youtubeService");
const { youtubeCache } = require("../utils/cache");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const title = (req.query.title || "").trim();
    const artist = (req.query.artist || "").trim();
    if (!title || !artist) {
      return res.status(400).json({ error: "title and artist are required" });
    }

    const cacheKey = [
      "ytv3",
      title.toLowerCase(),
      artist.toLowerCase()
    ].join(":");
    const cached = youtubeCache.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const result = await searchYoutubeVideo({ title, artist });
    const payload = {
      ...result,
      geoSource: "direct-title-artist",
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
