function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const TOTAL_BRUSHING_SECONDS = 120;

function calculateBpm({ top = 16, bottom = 16 }) {
  const safeTop = clamp(Number(top), 8, 16);
  const safeBottom = clamp(Number(bottom), 8, 16);

  const totalTeeth = safeTop + safeBottom;
  const secondsPerTooth = TOTAL_BRUSHING_SECONDS / totalTeeth;
  const rawBpm = 60 / secondsPerTooth;
  const boostedBpm = rawBpm * 2;

  return {
    top: safeTop,
    bottom: safeBottom,
    totalTeeth,
    totalBrushingSeconds: TOTAL_BRUSHING_SECONDS,
    secondsPerTooth: Number(secondsPerTooth.toFixed(2)),
    rawBpm: Number(rawBpm.toFixed(2)),
    baseBpm: Number(boostedBpm.toFixed(2)),
    musicBpm: Number(boostedBpm.toFixed(2)),
    searchBpm: Number(boostedBpm.toFixed(2))
  };
}

module.exports = {
  calculateBpm
};
