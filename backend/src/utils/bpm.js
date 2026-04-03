function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const TOTAL_BRUSHING_SECONDS = 120;
const TOOTH_SURFACES_PER_TOOTH = 2;
const BEATS_PER_TOOTH = 4;

function getMaturityScore(totalTeeth) {
  return clamp((Number(totalTeeth) - 1) / 31, 0, 1);
}

function inferBrusherProfile(totalTeeth) {
  if (totalTeeth <= 20) {
    return {
      key: "kids",
      label: "Kids Mode",
      description: "Primary teeth or an early brusher"
    };
  }

  if (totalTeeth <= 27) {
    return {
      key: "growing",
      label: "Growing Smile",
      description: "Mixed teeth as they grow"
    };
  }

  if (totalTeeth <= 31) {
    return {
      key: "adult-28",
      label: "Adult Smile",
      description: "Typical adult set without wisdom teeth"
    };
  }

  return {
    key: "adult-32",
    label: "Full Adult Smile",
    description: "Full adult set including wisdom teeth"
  };
}

function splitArch(count) {
  const left = Math.ceil(count / 2);
  const right = Math.floor(count / 2);

  return { left, right };
}

function createBrushingSegments(top, bottom) {
  const topSplit = splitArch(top);
  const bottomSplit = splitArch(bottom);
  const segments = [
    { key: "front-top-left", label: "Front Top Left", teeth: topSplit.left },
    { key: "front-top-right", label: "Front Top Right", teeth: topSplit.right },
    { key: "back-top-right", label: "Back Top Right", teeth: topSplit.right },
    { key: "back-top-left", label: "Back Top Left", teeth: topSplit.left },
    { key: "front-bottom-left", label: "Front Bottom Left", teeth: bottomSplit.left },
    { key: "front-bottom-right", label: "Front Bottom Right", teeth: bottomSplit.right },
    { key: "back-bottom-right", label: "Back Bottom Right", teeth: bottomSplit.right },
    { key: "back-bottom-left", label: "Back Bottom Left", teeth: bottomSplit.left }
  ];

  return segments.filter((segment) => segment.teeth > 0);
}

function calculateBpm({ top = 16, bottom = 16 }) {
  const safeTop = clamp(Number(top), 1, 16);
  const safeBottom = clamp(Number(bottom), 1, 16);

  const totalTeeth = safeTop + safeBottom;
  const totalToothActions = totalTeeth * TOOTH_SURFACES_PER_TOOTH;
  const maturityScore = getMaturityScore(totalTeeth);
  const brusherProfile = inferBrusherProfile(totalTeeth);
  const transitionBufferSeconds = Number((0.75 + (1 - maturityScore) * 0.5).toFixed(2));
  const brushingSegments = createBrushingSegments(safeTop, safeBottom);
  const totalTransitions = Math.max(0, brushingSegments.length - 1);
  const totalTransitionSeconds = Number((totalTransitions * transitionBufferSeconds).toFixed(2));
  const totalToothTimeSeconds = TOTAL_BRUSHING_SECONDS - totalTransitionSeconds;
  const secondsPerTooth = totalToothTimeSeconds / totalToothActions;
  const rawBpm = 60 / secondsPerTooth;
  const searchBpm = (60 * BEATS_PER_TOOTH) / secondsPerTooth;

  return {
    top: safeTop,
    bottom: safeBottom,
    totalTeeth,
    totalToothActions,
    totalTransitions,
    totalTransitionSeconds,
    totalToothTimeSeconds: Number(totalToothTimeSeconds.toFixed(2)),
    transitionBufferSeconds,
    maturityScore: Number(maturityScore.toFixed(3)),
    brusherProfile,
    brushingSegments,
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
