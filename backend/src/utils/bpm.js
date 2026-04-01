function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateBpm({ top = 16, bottom = 16, sectionSeconds = 15 }) {
  const safeTop = clamp(Number(top), 8, 16);
  const safeBottom = clamp(Number(bottom), 8, 16);
  const safeSectionSeconds = Number(sectionSeconds) === 30 ? 30 : 15;

  const totalTeeth = safeTop + safeBottom;
  const teethPerSection = totalTeeth / 2;
  const rawBpm = (teethPerSection / safeSectionSeconds) * 60;
  const boostedBpm = rawBpm * 2;

  return {
    top: safeTop,
    bottom: safeBottom,
    totalTeeth,
    sectionSeconds: safeSectionSeconds,
    teethPerSection,
    rawBpm: Number(rawBpm.toFixed(2)),
    baseBpm: Number(boostedBpm.toFixed(2)),
    musicBpm: Number(boostedBpm.toFixed(2)),
    searchBpm: Number(boostedBpm.toFixed(2))
  };
}

module.exports = {
  calculateBpm
};
