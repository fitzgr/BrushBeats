const { AGE_BUCKET_THRESHOLDS } = require("../config/musicContextConfig");

function clampTeethCount(toothCount) {
  const safe = Math.floor(Number(toothCount) || 0);
  if (safe < 0) {
    return 0;
  }
  if (safe > 32) {
    return 32;
  }
  return safe;
}

function inferAgeBucketFromToothCount(toothCount, thresholds = AGE_BUCKET_THRESHOLDS) {
  const safeToothCount = clampTeethCount(toothCount);

  for (const threshold of thresholds) {
    if (safeToothCount <= threshold.maxTeeth) {
      return threshold.bucket;
    }
  }

  return "adult";
}

module.exports = {
  inferAgeBucketFromToothCount,
  clampTeethCount
};
