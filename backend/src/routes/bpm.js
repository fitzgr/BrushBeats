const express = require("express");
const { calculateBpm } = require("../utils/bpm");

const router = express.Router();

router.get("/", (req, res) => {
  const top = Number(req.query.top ?? 16);
  const bottom = Number(req.query.bottom ?? 16);
  const duration = Number(req.query.duration ?? 120);

  if (top < 0 || top > 16 || bottom < 0 || bottom > 16) {
    return res.status(400).json({
      error: "top and bottom teeth must be between 0 and 16"
    });
  }

  if (duration < 60 || duration > 300) {
    return res.status(400).json({
      error: "duration must be between 60 and 300 seconds"
    });
  }

  const result = calculateBpm({ top, bottom, totalBrushingSeconds: duration });

  return res.json({
    ...result,
    message: `You're brushing at ${result.musicBpm} BPM for ${result.totalBrushingSeconds} seconds`
  });
});

module.exports = router;
