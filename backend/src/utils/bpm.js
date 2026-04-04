const { describeTeethStage } = require("./teethAge");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const DEFAULT_BRUSHING_SECONDS = 120;
const MIN_BRUSHING_SECONDS = 60;
const MAX_BRUSHING_SECONDS = 300;
const TOOTH_SURFACES_PER_TOOTH = 2;
const BEATS_PER_TOOTH = 4;

function getMaturityScore(totalTeeth) {
  return clamp((Number(totalTeeth) - 1) / 31, 0, 1);
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

function calculateBpm({ top = 16, bottom = 16, totalBrushingSeconds = DEFAULT_BRUSHING_SECONDS }) {
  const safeTop = clamp(Number(top), 0, 16);
  const safeBottom = clamp(Number(bottom), 0, 16);
  const safeTotalBrushingSeconds = clamp(Number(totalBrushingSeconds), MIN_BRUSHING_SECONDS, MAX_BRUSHING_SECONDS);

  const totalTeeth = safeTop + safeBottom;
  const totalToothActions = totalTeeth * TOOTH_SURFACES_PER_TOOTH;
  const maturityScore = getMaturityScore(totalTeeth);
  const detectedStage = describeTeethStage(totalTeeth);
  const transitionBufferSeconds = Number((0.75 + (1 - maturityScore) * 0.5).toFixed(2));
  const brushingSegments = createBrushingSegments(safeTop, safeBottom);
  const totalTransitions = Math.max(0, brushingSegments.length - 1);
  const totalTransitionSeconds = Number((totalTransitions * transitionBufferSeconds).toFixed(2));
  const totalToothTimeSeconds = safeTotalBrushingSeconds - totalTransitionSeconds;
  const secondsPerTooth = totalToothActions > 0 ? totalToothTimeSeconds / totalToothActions : 0;
  const rawBpm = secondsPerTooth > 0 ? 60 / secondsPerTooth : 0;
  const searchBpm = secondsPerTooth > 0 ? (60 * BEATS_PER_TOOTH) / secondsPerTooth : 0;

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
    brusherProfile: detectedStage,
    ageEstimate: detectedStage.estimate,
    brushingSegments,
    totalBrushingSeconds: safeTotalBrushingSeconds,
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
