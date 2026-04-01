function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const TOTAL_BRUSHING_SECONDS = 120;
const TOOTH_SURFACES_PER_TOOTH = 2;
const BEATS_PER_TOOTH = 4;

function calculateBpm({ top = 16, bottom = 16 }) {
  const safeTop = clamp(Number(top), 8, 16);
  const safeBottom = clamp(Number(bottom), 8, 16);

  const totalTeeth = safeTop + safeBottom;
  const totalToothActions = totalTeeth * TOOTH_SURFACES_PER_TOOTH;
  const secondsPerTooth = TOTAL_BRUSHING_SECONDS / totalToothActions;
  const rawBpm = 60 / secondsPerTooth;
  const searchBpm = totalTeeth * BEATS_PER_TOOTH;

  return {
    top: safeTop,
    bottom: safeBottom,
    totalTeeth,
    totalToothActions,
    totalBrushingSeconds: TOTAL_BRUSHING_SECONDS,
    secondsPerTooth: Number(secondsPerTooth.toFixed(2)),
    beatsPerTooth: BEATS_PER_TOOTH,
    rawBpm: Number(rawBpm.toFixed(2)),
    baseBpm: Number(searchBpm.toFixed(2)),
    musicBpm: Number(searchBpm.toFixed(2)),
    searchBpm: Number(searchBpm.toFixed(2))
  };
}

module.exports = {
  calculateBpm
};
