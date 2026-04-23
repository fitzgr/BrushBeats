const express = require("express");
const { calculateBpm } = require("../utils/bpm");
const { toBoundedNumber } = require("../utils/inputValidation");

const router = express.Router();

router.get("/", (req, res) => {
  const top = toBoundedNumber(req.query.top, { min: 0, max: 16, fallback: 16, integer: true });
  const bottom = toBoundedNumber(req.query.bottom, { min: 0, max: 16, fallback: 16, integer: true });
  const duration = toBoundedNumber(req.query.duration, { min: 60, max: 300, fallback: 120, integer: true });

  if (!Number.isInteger(top) || !Number.isInteger(bottom)) {
    return res.status(400).json({
      error: "top and bottom teeth must be between 0 and 16"
    });
  }

  if (!Number.isInteger(duration)) {
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
