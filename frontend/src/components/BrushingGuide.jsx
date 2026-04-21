import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AgeThemePanel from "./AgeThemePanel";
import { getBrushTechniqueTips } from "../lib/reinforcementMessages";

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function createArcPoints({ count, cx, cy, rx, ry, startDeg, endDeg }) {
  if (count <= 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const angleDeg = startDeg + (endDeg - startDeg) * ratio;
    const angle = toRadians(angleDeg);

    return {
      index,
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
      angleDeg,
      rotationDeg: angleDeg - 90,
      layoutScale: 1
    };
  });
}

function buildReferenceToothLayout(entries, { sourceCenterX, sourceCenterY, targetCenterX = 180, targetCenterY = 214, positionScale = 0.5 }) {
  return entries.map(([x, y, rotationDeg, layoutScale], index) => ({
    index,
    x: targetCenterX + (x - sourceCenterX) * positionScale,
    y: targetCenterY + (y - sourceCenterY) * positionScale,
    rotationDeg,
    layoutScale
  }));
}

const TOOTH_SHAPES = {
  molar: {
    path: "M0 -26 C14 -27 24 -19 26 -7 C27 10 20 24 10 30 C4 33 -4 33 -10 30 C-20 24 -27 10 -26 -7 C-24 -19 -14 -27 0 -26 Z",
    grooves: [
      { type: "path", d: "M-13 -4 C-8 -13 8 -13 13 -4" },
      { type: "path", d: "M-10 9 C-5 2 5 2 10 9" },
      { type: "path", d: "M-3 -12 C-1 -3 -1 6 -3 14" },
      { type: "path", d: "M6 -10 C4 -2 4 7 6 14" }
    ],
    grooveStroke: "#d7ccbd",
    scale: 0.44
  },
  premolar: {
    path: "M0 -24 C12 -24 20 -17 21 -5 C21 10 14 22 6 27 C2 29 -2 29 -6 27 C-14 22 -21 10 -21 -5 C-20 -17 -12 -24 0 -24 Z",
    grooves: [
      { type: "path", d: "M-10 -5 C-6 -12 6 -12 10 -5" },
      { type: "path", d: "M0 -10 C-2 -2 -2 6 0 13" }
    ],
    grooveStroke: "#d9cebf",
    scale: 0.42
  },
  canine: {
    path: "M0 -24 C9 -24 16 -18 17 -6 C17 10 10 21 3 27 C1 29 -1 29 -3 27 C-10 21 -17 10 -17 -6 C-16 -18 -9 -24 0 -24 Z",
    grooves: [
      { type: "path", d: "M0 -18 L0 12" }
    ],
    grooveStroke: "#e6ddd0",
    scale: 0.4
  },
  incisor: {
    path: "M0 -22 C10 -22 17 -16 17 -4 C17 10 11 20 4 25 C2 27 -2 27 -4 25 C-11 20 -17 10 -17 -4 C-17 -16 -10 -22 0 -22 Z",
    grooves: [
      { type: "path", d: "M-7 -12 C-4 -17 4 -17 7 -12" }
    ],
    grooveStroke: "#e6ddd0",
    scale: 0.38
  }
};

const ADULT_TOP_TOOTH_CHART = [
  { number: 1, nameKey: "thirdMolar", type: "molar" },
  { number: 2, nameKey: "secondMolar", type: "molar" },
  { number: 3, nameKey: "firstMolar", type: "molar" },
  { number: 4, nameKey: "secondBicuspid", type: "premolar" },
  { number: 5, nameKey: "firstBicuspid", type: "premolar" },
  { number: 6, nameKey: "cuspid", type: "canine" },
  { number: 7, nameKey: "lateralIncisor", type: "incisor" },
  { number: 8, nameKey: "centralIncisor", type: "incisor" },
  { number: 9, nameKey: "centralIncisor", type: "incisor" },
  { number: 10, nameKey: "lateralIncisor", type: "incisor" },
  { number: 11, nameKey: "cuspid", type: "canine" },
  { number: 12, nameKey: "firstBicuspid", type: "premolar" },
  { number: 13, nameKey: "secondBicuspid", type: "premolar" },
  { number: 14, nameKey: "firstMolar", type: "molar" },
  { number: 15, nameKey: "secondMolar", type: "molar" },
  { number: 16, nameKey: "thirdMolar", type: "molar" }
];

const ADULT_BOTTOM_TOOTH_CHART = [
  { number: 32, nameKey: "thirdMolar", type: "molar" },
  { number: 31, nameKey: "secondMolar", type: "molar" },
  { number: 30, nameKey: "firstMolar", type: "molar" },
  { number: 29, nameKey: "secondBicuspid", type: "premolar" },
  { number: 28, nameKey: "firstBicuspid", type: "premolar" },
  { number: 27, nameKey: "cuspid", type: "canine" },
  { number: 26, nameKey: "lateralIncisor", type: "incisor" },
  { number: 25, nameKey: "centralIncisor", type: "incisor" },
  { number: 24, nameKey: "centralIncisor", type: "incisor" },
  { number: 23, nameKey: "lateralIncisor", type: "incisor" },
  { number: 22, nameKey: "cuspid", type: "canine" },
  { number: 21, nameKey: "firstBicuspid", type: "premolar" },
  { number: 20, nameKey: "secondBicuspid", type: "premolar" },
  { number: 19, nameKey: "firstMolar", type: "molar" },
  { number: 18, nameKey: "secondMolar", type: "molar" },
  { number: 17, nameKey: "thirdMolar", type: "molar" }
];

const CHILD_TOP_TOOTH_CHART = [
  { number: "A", nameKey: "secondMolar", type: "molar" },
  { number: "B", nameKey: "firstMolar", type: "molar" },
  { number: "C", nameKey: "cuspid", type: "canine" },
  { number: "D", nameKey: "lateralIncisor", type: "incisor" },
  { number: "E", nameKey: "centralIncisor", type: "incisor" },
  { number: "F", nameKey: "centralIncisor", type: "incisor" },
  { number: "G", nameKey: "lateralIncisor", type: "incisor" },
  { number: "H", nameKey: "cuspid", type: "canine" },
  { number: "I", nameKey: "firstMolar", type: "molar" },
  { number: "J", nameKey: "secondMolar", type: "molar" }
];

const CHILD_BOTTOM_TOOTH_CHART = [
  { number: "T", nameKey: "secondMolar", type: "molar" },
  { number: "S", nameKey: "firstMolar", type: "molar" },
  { number: "R", nameKey: "cuspid", type: "canine" },
  { number: "Q", nameKey: "lateralIncisor", type: "incisor" },
  { number: "P", nameKey: "centralIncisor", type: "incisor" },
  { number: "O", nameKey: "centralIncisor", type: "incisor" },
  { number: "N", nameKey: "lateralIncisor", type: "incisor" },
  { number: "M", nameKey: "cuspid", type: "canine" },
  { number: "L", nameKey: "firstMolar", type: "molar" },
  { number: "K", nameKey: "secondMolar", type: "molar" }
];

const ADULT_TOP_TOOTH_LAYOUT = buildReferenceToothLayout([
  [133.4, 224.3, 295.0, 0.860],
  [120.9, 256.9, 287.0, 0.820],
  [113.1, 290.9, 279.0, 0.800],
  [110.0, 330.0, 270.0, 0.780],
  [113.1, 369.1, 261.0, 0.760],
  [125.1, 415.5, 250.0, 0.740],
  [145.7, 458.8, 239.0, 0.720],
  [174.2, 497.3, 228.0, 0.700],
  [545.8, 497.3, 132.0, 0.700],
  [574.3, 458.8, 121.0, 0.720],
  [594.9, 415.5, 110.0, 0.740],
  [606.9, 369.1, 99.0, 0.760],
  [610.0, 330.0, 90.0, 0.780],
  [606.9, 290.9, 81.0, 0.800],
  [599.1, 256.9, 73.0, 0.820],
  [586.6, 224.3, 65.0, 0.860]
], { sourceCenterX: 360, sourceCenterY: 330, targetCenterY: 165 });

const ADULT_BOTTOM_TOOTH_LAYOUT = buildReferenceToothLayout([
  [133.4, 435.7, 425.0, 0.860],
  [150.3, 466.2, 417.0, 0.820],
  [171.3, 494.0, 409.0, 0.800],
  [199.3, 521.5, 400.0, 0.780],
  [235.0, 546.5, 390.0, 0.760],
  [278.6, 566.4, 379.0, 0.740],
  [316.6, 576.2, 370.0, 0.720],
  [351.3, 579.8, 362.0, 0.700],
  [368.7, 579.8, 358.0, 0.700],
  [403.4, 576.2, 350.0, 0.720],
  [441.4, 566.4, 341.0, 0.740],
  [485.0, 546.5, 330.0, 0.760],
  [520.7, 521.5, 320.0, 0.780],
  [548.7, 494.0, 311.0, 0.800],
  [569.7, 466.2, 303.0, 0.820],
  [586.6, 435.7, 295.0, 0.860]
], { sourceCenterX: 360, sourceCenterY: 330, targetCenterY: 255 });

const CHILD_TOP_TOOTH_LAYOUT = buildReferenceToothLayout([
  [994.2, 243.4, 295.0, 0.920],
  [978.1, 294.4, 280.0, 0.880],
  [978.1, 365.6, 260.0, 0.840],
  [999.0, 426.2, 242.0, 0.820],
  [1023.0, 461.8, 230.0, 0.820],
  [1337.0, 461.8, 130.0, 0.820],
  [1361.0, 426.2, 118.0, 0.820],
  [1381.9, 365.6, 100.0, 0.840],
  [1381.9, 294.4, 80.0, 0.880],
  [1365.8, 243.4, 65.0, 0.920]
], { sourceCenterX: 1180, sourceCenterY: 330, targetCenterY: 165 });

const CHILD_BOTTOM_TOOTH_LAYOUT = buildReferenceToothLayout([
  [994.2, 416.6, 425.0, 0.920],
  [1023.0, 461.8, 410.0, 0.880],
  [1071.4, 503.8, 392.0, 0.840],
  [1109.9, 522.6, 380.0, 0.820],
  [1151.5, 533.0, 368.0, 0.820],
  [1208.5, 533.0, 352.0, 0.820],
  [1250.1, 522.6, 340.0, 0.820],
  [1288.6, 503.8, 328.0, 0.840],
  [1337.0, 461.8, 310.0, 0.880],
  [1365.8, 416.6, 295.0, 0.920]
], { sourceCenterX: 1180, sourceCenterY: 330, targetCenterY: 255 });

const SEGMENT_LABEL_KEYS = {
  "Front Top Left": "brushing.segments.frontTopLeft",
  "Front Top Right": "brushing.segments.frontTopRight",
  "Back Top Right": "brushing.segments.backTopRight",
  "Back Top Left": "brushing.segments.backTopLeft",
  "Front Bottom Left": "brushing.segments.frontBottomLeft",
  "Front Bottom Right": "brushing.segments.frontBottomRight",
  "Back Bottom Right": "brushing.segments.backBottomRight",
  "Back Bottom Left": "brushing.segments.backBottomLeft"
};

function splitArch(count) {
  return {
    left: Math.ceil(count / 2),
    right: Math.floor(count / 2)
  };
}

function buildSegments(topTeeth, bottomTeeth) {
  const topSplit = splitArch(topTeeth);
  const bottomSplit = splitArch(bottomTeeth);
  const segments = [
    {
      key: "front-top-left",
      label: "Front Top Left",
      jaw: "top",
      surface: "front",
      mapIndices: Array.from({ length: topSplit.left }, (_, index) => index)
    },
    {
      key: "front-top-right",
      label: "Front Top Right",
      jaw: "top",
      surface: "front",
      mapIndices: Array.from({ length: topSplit.right }, (_, index) => topSplit.left + index)
    },
    {
      key: "back-top-right",
      label: "Back Top Right",
      jaw: "top",
      surface: "back",
      mapIndices: Array.from({ length: topSplit.right }, (_, index) => topTeeth - 1 - index)
    },
    {
      key: "back-top-left",
      label: "Back Top Left",
      jaw: "top",
      surface: "back",
      mapIndices: Array.from({ length: topSplit.left }, (_, index) => topSplit.left - 1 - index)
    },
    {
      key: "front-bottom-left",
      label: "Front Bottom Left",
      jaw: "bottom",
      surface: "front",
      mapIndices: Array.from({ length: bottomSplit.left }, (_, index) => index)
    },
    {
      key: "front-bottom-right",
      label: "Front Bottom Right",
      jaw: "bottom",
      surface: "front",
      mapIndices: Array.from({ length: bottomSplit.right }, (_, index) => bottomSplit.left + index)
    },
    {
      key: "back-bottom-right",
      label: "Back Bottom Right",
      jaw: "bottom",
      surface: "back",
      mapIndices: Array.from({ length: bottomSplit.right }, (_, index) => bottomTeeth - 1 - index)
    },
    {
      key: "back-bottom-left",
      label: "Back Bottom Left",
      jaw: "bottom",
      surface: "back",
      mapIndices: Array.from({ length: bottomSplit.left }, (_, index) => bottomSplit.left - 1 - index)
    }
  ];

  return segments.filter((segment) => segment.mapIndices.length > 0);
}

function buildTimeline(segments, secondsPerTooth, transitionBufferSeconds) {
  const timeline = [];
  let cursor = 0;
  const transitionCount = Math.max(0, segments.length - 1);

  function buildTransitionPrompt(order) {
    if (order === 1 || order === transitionCount) {
      return {
        cue: "switchHand",
        seconds: 1
      };
    }

    if (order === 2 || order === 4) {
      return {
        cue: "rotate",
        seconds: 0.75
      };
    }

    return {
      cue: "transition",
      seconds: transitionBufferSeconds
    };
  }

  segments.forEach((segment, segmentIndex) => {
    segment.mapIndices.forEach((mapIndex, toothIndex) => {
      timeline.push({
        type: "tooth",
        key: `${segment.key}-${mapIndex}`,
        label: segment.label,
        jaw: segment.jaw,
        surface: segment.surface,
        mapIndex,
        segmentPosition: toothIndex + 1,
        segmentSize: segment.mapIndices.length,
        startsAt: cursor,
        endsAt: cursor + secondsPerTooth
      });
      cursor += secondsPerTooth;
    });

    if (segmentIndex < segments.length - 1) {
      const transitionOrder = segmentIndex + 1;
      const transitionPrompt = buildTransitionPrompt(transitionOrder);

      timeline.push({
        type: "transition",
        key: `transition-${segment.key}`,
        fromLabel: segment.label,
        toLabel: segments[segmentIndex + 1].label,
        transitionOrder,
        transitionCue: transitionPrompt.cue,
        startsAt: cursor,
        endsAt: cursor + transitionPrompt.seconds
      });
      cursor += transitionPrompt.seconds;
    }
  });

  return timeline;
}

function getLabelSide(label) {
  if (!label) {
    return null;
  }

  return label.includes("Left") ? "left" : label.includes("Right") ? "right" : null;
}

function getLabelJaw(label) {
  if (!label) {
    return null;
  }

  return label.includes("Top") ? "top" : label.includes("Bottom") ? "bottom" : null;
}

function getSegmentLabel(t, label) {
  return t(SEGMENT_LABEL_KEYS[label] || label);
}

function formatMinutes(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds || 120)));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (seconds === 0) {
    return String(minutes);
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function selectVisibleIndices(length, count) {
  const safeCount = Math.max(0, Math.min(length, count));

  if (safeCount === 0) {
    return [];
  }

  if (safeCount === length) {
    return Array.from({ length }, (_, index) => index);
  }

  return Array.from({ length: safeCount }, (_, index) => {
    const position = Math.floor(((index + 0.5) * length) / safeCount);
    return Math.max(0, Math.min(length - 1, position));
  });
}

function selectVisibleToothData(chart, layout, count) {
  const indices = selectVisibleIndices(Math.min(chart.length, layout.length), count);

  return {
    chart: indices.map((index) => chart[index]),
    layout: indices.map((index) => layout[index])
  };
}

function getToothLabel(t, tooth) {
  if (!tooth) {
    return "";
  }

  return t("brushing.toothChart.label", {
    number: tooth.number,
    name: t(`brushing.toothChart.names.${tooth.nameKey}`)
  });
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getBouncePointForPhase(fromPoint, toPoint, phase) {
  const safePhase = clampNumber(phase, 0, 1);
  const normalized = safePhase <= 0.5
    ? safePhase / 0.5
    : (1 - safePhase) / 0.5;

  return {
    x: fromPoint.x + (toPoint.x - fromPoint.x) * normalized,
    y: fromPoint.y + (toPoint.y - fromPoint.y) * normalized
  };
}

function getBounceRadiusForPhase(phase) {
  const safePhase = clampNumber(phase, 0, 1);
  const normalized = safePhase <= 0.5
    ? safePhase / 0.5
    : (1 - safePhase) / 0.5;

  return 5.2 + (6.4 - 5.2) * normalized;
}

function splitMessageIntoLines(message, maxLineLength = 24, maxLines = 3) {
  const words = String(message || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLineLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxLineLength));
      current = word.slice(maxLineLength);
    }

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function formatTenths(seconds) {
  return Math.max(0, seconds).toFixed(1);
}

function mixColor(start, end, amount) {
  return start.map((channel, index) => Math.round(channel + (end[index] - channel) * clampNumber(amount, 0, 1)));
}

function toRgb(channels) {
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

function getCountdownSignal(remainingMs, totalMs) {
  const safeTotalMs = Math.max(1, Number(totalMs) || 0);
  const progress = clampNumber(1 - (Number(remainingMs) || 0) / safeTotalMs, 0, 1);
  const red = [239, 68, 68];
  const yellow = [250, 204, 21];
  const green = [34, 197, 94];
  const warmWhite = [255, 252, 245];
  const coolWhite = [240, 255, 245];
  const base = progress < 0.5
    ? mixColor(red, yellow, progress / 0.5)
    : mixColor(yellow, green, (progress - 0.5) / 0.5);
  const accent = mixColor(base, [255, 255, 255], 0.18);
  const label = progress < 0.5
    ? mixColor(warmWhite, [255, 244, 184], progress / 0.5)
    : mixColor([255, 244, 184], coolWhite, (progress - 0.5) / 0.5);

  return {
    primary: toRgb(base),
    accent: toRgb(accent),
    label: toRgb(label)
  };
}

function BrushingGuide({ timer, brushingPhase, values, bpmData, selectedBpm, isMobile, playbackSeconds, brushingMusicElapsedSeconds, startCountdownTotalMs = 5000, startCountdownRemainingMs = 0, brushingHand, brushType = "manual", hideIntro = false, onCueChange, completionMessage = "", brushControlCue, primaryBrushActionLabel, onPrimaryBrushAction, onRestartBrushing, ageUiProfile }) {
  const { t } = useTranslation();
  const totalSeconds = Number(bpmData?.totalBrushingSeconds || 120);
  const topTeeth = Number(values?.top || 16);
  const bottomTeeth = Number(values?.bottom || 16);
  const useChildToothChart = topTeeth <= 10 && bottomTeeth <= 10 && topTeeth + bottomTeeth <= 20;
  const topSourceChart = useChildToothChart ? CHILD_TOP_TOOTH_CHART : ADULT_TOP_TOOTH_CHART;
  const bottomSourceChart = useChildToothChart ? CHILD_BOTTOM_TOOTH_CHART : ADULT_BOTTOM_TOOTH_CHART;
  const topSourceLayout = useChildToothChart ? CHILD_TOP_TOOTH_LAYOUT : ADULT_TOP_TOOTH_LAYOUT;
  const bottomSourceLayout = useChildToothChart ? CHILD_BOTTOM_TOOTH_LAYOUT : ADULT_BOTTOM_TOOTH_LAYOUT;
  const topVisible = selectVisibleToothData(topSourceChart, topSourceLayout, topTeeth);
  const bottomVisible = selectVisibleToothData(bottomSourceChart, bottomSourceLayout, bottomTeeth);
  const topToothChart = topVisible.chart;
  const bottomToothChart = bottomVisible.chart;
  const topPoints = topVisible.layout;
  const bottomPoints = bottomVisible.layout;
  const safeBpm = Math.max(40, Math.min(240, Number(selectedBpm) || 120));
  const toothDurationSeconds = Number(bpmData?.secondsPerTooth || totalSeconds / Math.max(1, (topTeeth + bottomTeeth) * 2));
  const transitionBufferSeconds = Number(bpmData?.transitionBufferSeconds || 1);
  const segments = buildSegments(topTeeth, bottomTeeth);
  const timeline = buildTimeline(segments, toothDurationSeconds, transitionBufferSeconds);
  const toothEntries = timeline.filter((entry) => entry.type === "tooth");
  const beatDurationMs = Math.max(220, 60000 / safeBpm);
  const normalizedBeatAnchorMs = (((Math.max(0, Number(playbackSeconds) || 0) * 1000) % beatDurationMs) + beatDurationMs) % beatDurationMs;
  const isPaused = brushingPhase === "paused";
  const beatPhaseOffsetMs = timer.running
    ? -normalizedBeatAnchorMs
    : 0;
  const elapsedSeconds = brushingPhase === "complete"
    ? totalSeconds
    : (timer.running || isPaused)
      ? Math.min(totalSeconds, Math.max(0, brushingMusicElapsedSeconds))
      : 0;
  const completedToothEntries = toothEntries.filter((entry) => entry.endsAt <= elapsedSeconds).length;
  const activeEntry = (timer.running || isPaused)
    ? timeline.find((entry) => elapsedSeconds >= entry.startsAt && elapsedSeconds < entry.endsAt) || null
    : null;
  const activeToothEntry = activeEntry?.type === "tooth" ? activeEntry : null;
  const activeToothProgress = activeToothEntry
    ? clampNumber((elapsedSeconds - activeToothEntry.startsAt) / Math.max(0.001, activeToothEntry.endsAt - activeToothEntry.startsAt), 0, 1)
    : 0;
  const progress = brushingPhase === "complete"
    ? 100
    : toothEntries.length > 0
      ? Math.min(100, ((completedToothEntries + activeToothProgress) / toothEntries.length) * 100)
      : 0;
  const orientationLabel = activeEntry?.type === "transition" ? activeEntry.toLabel : activeToothEntry?.label;
  const activeSide = getLabelSide(orientationLabel);
  const activeJaw = getLabelJaw(orientationLabel);
  const isFrontSurface = activeToothEntry?.surface === "front";
  const nextMoveSeconds = activeEntry ? Math.max(1, Math.ceil(activeEntry.endsAt - elapsedSeconds)) : null;
  const nextTransition = (timer.running || isPaused)
    ? timeline.find((entry) => entry.type === "transition" && entry.startsAt >= elapsedSeconds)
    : null;
  const nextSectionSeconds = nextTransition ? Math.max(1, Math.ceil(nextTransition.startsAt - elapsedSeconds)) : null;
  const transitionCountdownSeconds = activeEntry?.type === "transition"
    ? Math.max(0, activeEntry.endsAt - elapsedSeconds)
    : 0;
  const activeToothMeta = activeToothEntry
    ? activeToothEntry.jaw === "top"
      ? topToothChart[activeToothEntry.mapIndex]
      : bottomToothChart[activeToothEntry.mapIndex]
    : null;
  const mapCenter = { x: 180, y: 214 };
  const mapCenterRadius = 42;
  const agePhase = useMemo(() => {
    const total = topTeeth + bottomTeeth;
    if (total <= 4) return "infant";
    if (total <= 12) return "toddler";
    if (total <= 20) return "primary";
    if (total <= 28) return "mixed";
    return "adult";
  }, [topTeeth, bottomTeeth]);
  const tips = useMemo(() => getBrushTechniqueTips(brushType, ageUiProfile?.phase || agePhase), [agePhase, ageUiProfile?.phase, brushType]);
  const [activeTip, setActiveTip] = useState("");
  const tipIndexRef = useRef(0);

  useEffect(() => {
    if (brushingPhase !== "running") {
      return;
    }

    // Show first tip immediately when brushing begins
    setActiveTip(tips[tipIndexRef.current % tips.length] || "");

    const interval = window.setInterval(() => {
      tipIndexRef.current += 1;
      setActiveTip(tips[tipIndexRef.current % tips.length] || "");
    }, 18000); // rotate every 18 seconds

    return () => {
      window.clearInterval(interval);
    };
  }, [brushingPhase, tips]);

  useEffect(() => {
    if (!onCueChange) {
      return;
    }

    if (brushingPhase === "countdown") {
      onCueChange({
        kind: "countdown",
        title: t("brushing.cue.countdownTitle"),
        detail: t("brushing.cue.countdownDetail", { seconds: formatTenths(startCountdownRemainingMs / 1000) })
      });
      return;
    }

    if (brushingPhase === "complete") {
      onCueChange({
        kind: "complete",
        title: t("brushing.cue.completeTitle"),
        detail: ""
      });
      return;
    }

    if (brushingPhase === "paused") {
      onCueChange({
        kind: "paused",
        title: t("brushing.cue.pausedTitle"),
        detail: t("brushing.cue.pausedDetail")
      });
      return;
    }

    if (brushingPhase === "awaitingPlayback") {
      onCueChange({
        kind: "awaitingPlayback",
        title: t("brushing.cue.awaitingPlaybackTitle"),
        detail: t("brushing.cue.awaitingPlaybackDetail")
      });
      return;
    }

    if (!timer.running) {
      onCueChange({
        kind: "ready",
        title: t("brushing.cue.readyTitle"),
        detail: t("brushing.cue.readyDetail", { hand: t(`common.hands.${brushingHand}`) })
      });
      return;
    }

    if (activeEntry?.type === "transition") {
      if (activeEntry.transitionCue === "switchHand") {
        onCueChange({
          kind: "side-switch",
          title: t("brushing.cue.switchHandTitle"),
          detail: t("brushing.cue.switchHandDetail", {
            hand: t(`common.hands.${brushingHand}`)
          })
        });
        return;
      }

      if (activeEntry.transitionCue === "rotate") {
        onCueChange({
          kind: "transition",
          title: t("brushing.cue.rotateTitle"),
          detail: t("brushing.cue.rotateDetail")
        });
        return;
      }

      const fromRight = activeEntry.fromLabel.includes("Right");
      const toRight = activeEntry.toLabel.includes("Right");
      const fromTop = activeEntry.fromLabel.includes("Top");
      const toTop = activeEntry.toLabel.includes("Top");

      if (fromTop !== toTop) {
        onCueChange({
          kind: "halfway",
          title: t("brushing.cue.halfwayTitle"),
          detail: t("brushing.cue.halfwayDetail", {
            fromJaw: t(`brushing.jaw.${fromTop ? "top" : "bottom"}`),
            toJaw: t(`brushing.jaw.${toTop ? "top" : "bottom"}`),
            hand: t(`common.hands.${brushingHand}`)
          })
        });
        return;
      }

      if (fromRight !== toRight) {
        onCueChange({
          kind: "side-switch",
          title: t("brushing.cue.sideSwitchTitle"),
          detail: t("brushing.cue.sideSwitchDetail", {
            fromSide: t(`brushing.side.${fromRight ? "right" : "left"}`),
            toSide: t(`brushing.side.${toRight ? "right" : "left"}`),
            hand: t(`common.hands.${brushingHand}`)
          })
        });
        return;
      }

      onCueChange({
        kind: "transition",
        title: t("brushing.cue.transitionTitle"),
        detail: t("brushing.cue.transitionDetail", {
          fromLabel: getSegmentLabel(t, activeEntry.fromLabel),
          toLabel: getSegmentLabel(t, activeEntry.toLabel),
          seconds: nextMoveSeconds
        })
      });
      return;
    }

    if (activeToothEntry) {
      onCueChange({
        kind: "brushing",
        title: t("brushing.cue.activeTitle", { label: getSegmentLabel(t, activeToothEntry.label) }),
        detail: t("brushing.cue.activeDetail", {
          position: activeToothEntry.segmentPosition,
          size: activeToothEntry.segmentSize,
          hand: t(`common.hands.${brushingHand}`),
          seconds: nextMoveSeconds
        })
      });
      return;
    }

    onCueChange(null);
  }, [activeEntry, activeToothEntry, brushingHand, brushingPhase, nextMoveSeconds, onCueChange, startCountdownRemainingMs, t, timer.running]);

  const activeToothPoint = activeToothEntry
    ? activeToothEntry.jaw === "top"
      ? topPoints[activeToothEntry.mapIndex]
      : bottomPoints[activeToothEntry.mapIndex]
    : null;
  const activeBounceStartPoint = activeToothPoint
    ? (() => {
        const deltaX = activeToothPoint.x - mapCenter.x;
        const deltaY = activeToothPoint.y - mapCenter.y;
        const distance = Math.hypot(deltaX, deltaY) || 1;
        const radius = Math.min(mapCenterRadius, Math.max(0, distance - 12));

        return {
          x: mapCenter.x + (deltaX / distance) * radius,
          y: mapCenter.y + (deltaY / distance) * radius
        };
      })()
    : null;
  const pausedBeatPhase = beatDurationMs > 0 ? normalizedBeatAnchorMs / beatDurationMs : 0;
  const pausedBouncePoint = activeToothPoint && activeBounceStartPoint
    ? getBouncePointForPhase(activeToothPoint, activeBounceStartPoint, pausedBeatPhase)
    : null;
  const pausedTailPoints = activeToothPoint && activeBounceStartPoint
    ? [0.2, 0.12, 0.06].map((offset) => {
        const phase = (((pausedBeatPhase - offset) % 1) + 1) % 1;
        return getBouncePointForPhase(activeToothPoint, activeBounceStartPoint, phase);
      })
    : [];
  const pausedBounceRadius = getBounceRadiusForPhase(pausedBeatPhase);

  function getToothState(jaw, mapIndex) {
    if (brushingPhase === "complete") {
      return { frontDone: true, backDone: true, activeSurface: null };
    }

    const state = {
      frontDone: false,
      backDone: false,
      activeSurface: null
    };

    if (!timer.running && brushingPhase !== "paused") {
      return state;
    }

    state.frontDone = timeline.some(
      (entry) =>
        entry.type === "tooth" &&
        entry.jaw === jaw &&
        entry.surface === "front" &&
        entry.mapIndex === mapIndex &&
        entry.endsAt <= elapsedSeconds
    );
    state.backDone = timeline.some(
      (entry) =>
        entry.type === "tooth" &&
        entry.jaw === jaw &&
        entry.surface === "back" &&
        entry.mapIndex === mapIndex &&
        entry.endsAt <= elapsedSeconds
    );

    if (activeToothEntry?.jaw === jaw && activeToothEntry.mapIndex === mapIndex) {
      state.activeSurface = activeToothEntry.surface;
    }

    return state;
  }

  const brushFacingDirection = activeSide
    ? brushingHand === "right"
      ? activeSide
      : activeSide === "left"
        ? "right"
        : "left"
    : null;
  const transitionFromSide = activeEntry?.type === "transition" ? getLabelSide(activeEntry.fromLabel) : null;
  const transitionToSide = activeEntry?.type === "transition" ? getLabelSide(activeEntry.toLabel) : null;
  const transitionFromJaw = activeEntry?.type === "transition" ? getLabelJaw(activeEntry.fromLabel) : null;
  const transitionToJaw = activeEntry?.type === "transition" ? getLabelJaw(activeEntry.toLabel) : null;
  const transitionDirection = transitionFromSide && transitionToSide && transitionFromSide !== transitionToSide
    ? `${t(`brushing.side.${transitionFromSide}`)} -> ${t(`brushing.side.${transitionToSide}`)}`
    : transitionFromJaw && transitionToJaw && transitionFromJaw !== transitionToJaw
      ? `${t(`brushing.jaw.${transitionFromJaw}`)} -> ${t(`brushing.jaw.${transitionToJaw}`)}`
      : null;
  const guideStatusText = brushingPhase === "countdown"
    ? t("brushing.guide.countdownCallout", { seconds: formatTenths(startCountdownRemainingMs / 1000) })
    : brushingPhase === "awaitingPlayback"
      ? t("brushing.guide.awaitingPlaybackCallout")
    : brushingPhase === "running"
    ? activeEntry?.type === "transition"
      ? activeEntry.transitionCue === "switchHand"
        ? transitionDirection
          ? `${t("brushing.guide.switchHandCallout")} ${transitionDirection}.`
          : t("brushing.guide.switchHandCallout")
        : activeEntry.transitionCue === "rotate"
          ? transitionDirection
            ? `${t("brushing.guide.rotateCallout")} ${transitionDirection}.`
            : t("brushing.guide.rotateCallout")
          : t("brushing.guide.transitionCallout", {
              fromLabel: getSegmentLabel(t, activeEntry.fromLabel),
              toLabel: getSegmentLabel(t, activeEntry.toLabel),
              seconds: formatTenths(transitionCountdownSeconds)
            })
      : t("brushing.guide.activeCurrentCallout", {
          label: getSegmentLabel(t, activeToothEntry?.label),
          toothLabel: getToothLabel(t, activeToothMeta),
          position: activeToothEntry?.segmentPosition,
          size: activeToothEntry?.segmentSize,
          seconds: nextMoveSeconds
        })
    : brushingPhase === "paused"
        ? t("brushing.guide.pausedCallout")
    : brushingPhase === "complete"
        ? t("brushing.guide.completeCallout")
        : "";
  const inactiveGuideText = !timer.running && brushingPhase === "idle"
    ? t("brushing.guide.inactiveCallout")
    : "";
  const centerLabel = brushingPhase === "countdown"
    ? t("brushing.guide.startLabel")
    : brushingPhase === "complete"
      ? ""
    : activeEntry?.type === "transition"
      ? t("brushing.guide.actionLabel")
      : `${Math.round(progress)}%`;
  const centerValue = brushingPhase === "countdown"
    ? formatTenths(startCountdownRemainingMs / 1000)
    : activeEntry?.type === "transition"
      ? activeEntry.transitionCue === "rotate" && transitionDirection
        ? `${t("brushing.switchPrompts.rotate")}: ${transitionDirection}`
        : activeEntry.transitionCue === "transition" && transitionDirection
          ? `${t("brushing.switchPrompts.transition")}: ${transitionDirection}`
          : t(`brushing.switchPrompts.${activeEntry.transitionCue || "transition"}`)
      : brushingPhase === "complete"
        ? t("brushing.guide.cleanShineLabel")
        : t("brushing.guide.brushNowLabel");
  const completionLines = brushingPhase === "complete" && completionMessage
    ? splitMessageIntoLines(completionMessage, 24, 3)
    : [];
  const countdownSignal = getCountdownSignal(startCountdownRemainingMs, startCountdownTotalMs);
  const [countdownWhole = "0", countdownFraction = "0"] = centerValue.split(".");
  const handOrientationText = brushFacingDirection
    ? t("brushing.guide.handOrientationCompact", {
        hand: t(`common.hands.${brushingHand}`),
        direction: t(`brushing.guide.directions.${brushFacingDirection}`)
      })
    : "";

  function renderTooth(point, jaw, meta, mapIndex) {
    const state = getToothState(jaw, mapIndex);
    const activeSurface = state.activeSurface;
    const toothId = `${jaw}-${mapIndex + 1}`;
    const toothShape = TOOTH_SHAPES[meta?.type || "molar"];
    const toothLabel = getToothLabel(t, meta);

    return (
      <g
        key={toothId}
        transform={`translate(${point.x} ${point.y}) rotate(${point.rotationDeg ?? point.angleDeg - 90}) scale(${toothShape.scale * (point.layoutScale || 1)})`}
        className={`tooth-svg ${meta?.type || "molar"}`}
      >
        <title>{toothLabel}</title>
        <defs>
          <clipPath id={`${toothId}-back-surface`}>
            <rect x="-30" y="-30" width="60" height="30" />
          </clipPath>
          <clipPath id={`${toothId}-front-surface`}>
            <rect x="-30" y="-1" width="60" height="38" />
          </clipPath>
        </defs>
        <path className="tooth-body-base" d={toothShape.path} fill="url(#toothFill)" filter="url(#softShadow)" />
        <path
          className={`tooth-face back-face${state.backDone ? " clean" : ""}${activeSurface === "back" ? " active-surface" : ""}`}
          d={toothShape.path}
          clipPath={`url(#${toothId}-back-surface)`}
        />
        <path
          className={`tooth-face front-face${state.frontDone ? " clean" : ""}${activeSurface === "front" ? " active-surface" : ""}`}
          d={toothShape.path}
          clipPath={`url(#${toothId}-front-surface)`}
        />
        <path className="tooth-outline" d={toothShape.path} />
        {toothShape.grooves.map((groove, grooveIndex) => (
          groove.type === "ellipse" ? (
            <ellipse
              key={`${toothId}-groove-${grooveIndex}`}
              className="tooth-groove"
              cx={groove.cx}
              cy={groove.cy}
              rx={groove.rx}
              ry={groove.ry}
              stroke={toothShape.grooveStroke}
            />
          ) : (
            <path key={`${toothId}-groove-${grooveIndex}`} className="tooth-groove" d={groove.d} stroke={toothShape.grooveStroke} />
          )
        ))}
      </g>
    );
  }

  return (
    <section className={`card guide ${ageUiProfile?.themeClassName || ""}`.trim()}>
      <h2>{t("brushing.guide.title")}</h2>
      {!hideIntro && (
        <p>
          {isMobile
            ? t("brushing.guide.introMobile", { minutes: formatMinutes(totalSeconds) })
            : t("brushing.guide.introDesktop", { minutes: formatMinutes(totalSeconds) })}
        </p>
      )}

        {!isMobile && (
          <div className="guide-top-controls">
            <div className={`brush-cue-card${brushControlCue?.kind ? ` ${brushControlCue.kind}` : ""}`} aria-live="polite">
              <strong>{brushControlCue?.title || t("brushing.readyTitle")}</strong>
              {(brushControlCue?.detail || !brushControlCue)
                ? <span>{brushControlCue?.detail || t("brushing.readyDetail", { hand: t(`common.hands.${brushingHand}`) })}</span>
                : null}
            </div>
            <div className="session-actions guide-session-actions">
              <button
                type="button"
                className="action-btn"
                onClick={onPrimaryBrushAction}
              >
                {primaryBrushActionLabel}
              </button>
              <button type="button" className="action-btn secondary" onClick={onRestartBrushing}>
                {t("brushing.stop")}
              </button>
            </div>
          </div>
        )}


      <div className="guide-map-shell">
        <AgeThemePanel profile={ageUiProfile} variant="guide" className="guide-age-overlay" chipLimit={2} />
        <div className="mouth-map" role="img" aria-label={t("brushing.guide.mouthMapAria")}>
        <svg viewBox="0 0 360 420" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0.6" dy="1.2" stdDeviation="1.2" floodColor="#b7aa95" floodOpacity="0.35" />
            </filter>
            <linearGradient id="toothFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fffdf9" />
              <stop offset="100%" stopColor="#f4efe6" />
            </linearGradient>
          </defs>
          <ellipse cx="180" cy="210" rx="150" ry="170" className="mouth-outline" />

          {topPoints.map((point, index) => renderTooth(point, "top", topToothChart[index], index))}

          {bottomPoints.map((point, index) => renderTooth(point, "bottom", bottomToothChart[index], index))}

          {timer.running && activeToothPoint && activeBounceStartPoint && (
            <g>
              <circle
                cx={activeToothPoint.x}
                cy={activeToothPoint.y}
                r="4.4"
                className={`active-brush-tail tail-3 ${activeToothEntry?.surface || "front"}`}
              >
                <animate
                  attributeName="cx"
                  values={`${activeToothPoint.x};${activeBounceStartPoint.x};${activeToothPoint.x}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs - beatDurationMs * 0.2}ms`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${activeToothPoint.y};${activeBounceStartPoint.y};${activeToothPoint.y}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs - beatDurationMs * 0.2}ms`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={activeToothPoint.x}
                cy={activeToothPoint.y}
                r="5"
                className={`active-brush-tail tail-2 ${activeToothEntry?.surface || "front"}`}
              >
                <animate
                  attributeName="cx"
                  values={`${activeToothPoint.x};${activeBounceStartPoint.x};${activeToothPoint.x}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs - beatDurationMs * 0.12}ms`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${activeToothPoint.y};${activeBounceStartPoint.y};${activeToothPoint.y}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs - beatDurationMs * 0.12}ms`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={activeToothPoint.x}
                cy={activeToothPoint.y}
                r="5.5"
                className={`active-brush-tail tail-1 ${activeToothEntry?.surface || "front"}`}
              >
                <animate
                  attributeName="cx"
                  values={`${activeToothPoint.x};${activeBounceStartPoint.x};${activeToothPoint.x}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs - beatDurationMs * 0.06}ms`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${activeToothPoint.y};${activeBounceStartPoint.y};${activeToothPoint.y}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs - beatDurationMs * 0.06}ms`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={activeToothPoint.x}
                cy={activeToothPoint.y}
                r="6"
                className={`active-brush-ball ${activeToothEntry?.surface || "front"}`}
              >
                <animate
                  attributeName="cx"
                  values={`${activeToothPoint.x};${activeBounceStartPoint.x};${activeToothPoint.x}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs}ms`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values={`${activeToothPoint.y};${activeBounceStartPoint.y};${activeToothPoint.y}`}
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs}ms`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="r"
                  values="5.2;6.4;5.2"
                  dur={`${beatDurationMs}ms`}
                  begin={`${beatPhaseOffsetMs}ms`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}

          {isPaused && activeToothPoint && activeBounceStartPoint && pausedBouncePoint && (
            <g>
              {pausedTailPoints[0] && (
                <circle
                  cx={pausedTailPoints[0].x}
                  cy={pausedTailPoints[0].y}
                  r="4.4"
                  className={`active-brush-tail tail-3 ${activeToothEntry?.surface || "front"}`}
                />
              )}
              {pausedTailPoints[1] && (
                <circle
                  cx={pausedTailPoints[1].x}
                  cy={pausedTailPoints[1].y}
                  r="5"
                  className={`active-brush-tail tail-2 ${activeToothEntry?.surface || "front"}`}
                />
              )}
              {pausedTailPoints[2] && (
                <circle
                  cx={pausedTailPoints[2].x}
                  cy={pausedTailPoints[2].y}
                  r="5.5"
                  className={`active-brush-tail tail-1 ${activeToothEntry?.surface || "front"}`}
                />
              )}
              <circle
                cx={pausedBouncePoint.x}
                cy={pausedBouncePoint.y}
                r={pausedBounceRadius}
                className={`active-brush-ball ${activeToothEntry?.surface || "front"}`}
              />
            </g>
          )}

          {brushingPhase === "countdown" ? (
            <text x="180" y="216" textAnchor="middle" className="map-score countdown">
              <tspan className="map-score-whole" style={{ fill: countdownSignal.primary }}>{countdownWhole}</tspan>
              <tspan className="map-score-fraction" style={{ fill: countdownSignal.accent }}>{`.${countdownFraction}`}</tspan>
            </text>
          ) : brushingPhase === "complete" && completionLines.length > 0 ? (
            <text x="180" y="206" textAnchor="middle" className="map-score complete-message">
              {completionLines.map((line, index) => (
                <tspan key={`${line}-${index}`} x="180" dy={index === 0 ? 0 : 14}>{line}</tspan>
              ))}
            </text>
          ) : (
            <text
              x="180"
              y="216"
              textAnchor="middle"
              className={`map-score word${activeEntry?.type === "transition" ? " orientation-emphasis" : ""}`}
            >
              {centerValue}
            </text>
          )}
          {centerLabel && (
            <text
              x="180"
              y="238"
              textAnchor="middle"
              className={`map-score-label${brushingPhase === "countdown" ? " countdown" : ""}`}
              style={brushingPhase === "countdown" ? { fill: countdownSignal.label } : undefined}
            >
              {centerLabel}
            </text>
          )}
        </svg>
        </div>
      </div>

      <div className="map-legend" aria-label={t("brushing.guide.legendAria")}>
        <span><em className="legend-dot front" />{t("brushing.guide.legendFront")}</span>
        <span><em className="legend-dot back" />{t("brushing.guide.legendBack")}</span>
      </div>

      {handOrientationText && (
        <div className={`brush-hand-orientation ${brushFacingDirection === "left" ? "facing-left" : "facing-right"}`}>
          <span className="brush-hand-orientation-title">{t("brushing.guide.handOrientation")}</span>
          <div className="brush-hand-orientation-visual" aria-hidden="true">
            <span className="brush-hand-orientation-hand" />
            <span className="brush-hand-orientation-handle" />
            <span className="brush-hand-orientation-neck" />
            <span className="brush-hand-orientation-head">
              <span className="brush-hand-orientation-bristles" />
            </span>
          </div>
        </div>
      )}
      {guideStatusText && !(brushingPhase === "complete" && completionMessage) && <p className={`guide-callout${brushingPhase === "complete" ? " complete" : ""}`}>{guideStatusText}</p>}
      {inactiveGuideText && <p className="guide-callout">{inactiveGuideText}</p>}
      {brushingPhase === "running" && activeTip && (
        <p className="guide-technique-tip" aria-live="polite">{activeTip}</p>
      )}

    </section>
  );
}

export default BrushingGuide;
