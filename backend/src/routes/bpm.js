const express = require("express");
const { calculateBpm } = require("../utils/bpm");

const router = express.Router();

router.get("/", (req, res) => {
  const top = Number(req.query.top ?? 16);
  const bottom = Number(req.query.bottom ?? 16);
  const sectionSeconds = Number(req.query.sectionSeconds ?? 30);

  if (top < 8 || top > 16 || bottom < 8 || bottom > 16) {
    return res.status(400).json({
      error: "top and bottom teeth must be between 8 and 16"
    });
  }

  if (![15, 30].includes(sectionSeconds)) {
    return res.status(400).json({
      error: "sectionSeconds must be 15 or 30"
    });
  }

  const result = calculateBpm({ top, bottom, sectionSeconds });

  return res.json({
    ...result,
    message: `You're brushing at ${result.musicBpm} BPM`
  });
});

module.exports = router;
