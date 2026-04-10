import { useEffect } from "react";
import { useTranslation } from "react-i18next";

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
      angleDeg
    };
  });
}

const TOOTH_SHAPES = {
  molar: {
    path: "M0 -11 C7 -11 11 -8 11 -2 C11 5 8 9 4 11 C1 12 -1 12 -4 11 C-8 9 -11 5 -11 -2 C-11 -8 -7 -11 0 -11 Z",
    grooves: [
      { type: "ellipse", cx: 0, cy: 0, rx: 5.2, ry: 3.2 },
      { type: "path", d: "M-3 -4 C-2 -1 -2 1 -3 4" },
      { type: "path", d: "M3 -4 C2 -1 2 1 3 4" }
    ],
    scale: 1.06
  },
  premolar: {
    path: "M0 -11 C5 -11 8 -8 8 -2 C8 4 6 8 3 11 C1 12 -1 12 -3 11 C-6 8 -8 4 -8 -2 C-8 -8 -5 -11 0 -11 Z",
    grooves: [
      { type: "ellipse", cx: 0, cy: 0, rx: 3.8, ry: 2.4 },
      { type: "path", d: "M-2 -3 C-1 -1 -1 1 -2 3" },
      { type: "path", d: "M2 -3 C1 -1 1 1 2 3" }
    ],
    scale: 0.98
  },
  canine: {
    path: "M0 -13 C3 -13 6 -8 5 -2 C5 4 4 8 2 12 C1 13 -1 13 -2 12 C-4 8 -5 4 -5 -2 C-6 -8 -3 -13 0 -13 Z",
    grooves: [
      { type: "path", d: "M0 -5 C0 -1 0 2 0 6" }
    ],
    scale: 0.9
  },
  incisor: {
    path: "M0 -11 C3 -11 5 -8 5 -2 C5 4 4 9 2 11 C1 12 -1 12 -2 11 C-4 9 -5 4 -5 -2 C-5 -8 -3 -11 0 -11 Z",
    grooves: [
      { type: "ellipse", cx: 0, cy: 1, rx: 2.6, ry: 1.7 },
      { type: "path", d: "M-1 -3 C0 -1 0 2 -1 4" },
      { type: "path", d: "M1 -3 C0 -1 0 2 1 4" }
    ],
    scale: 0.84
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
      timeline.push({
        type: "transition",
        key: `transition-${segment.key}`,
        fromLabel: segment.label,
        toLabel: segments[segmentIndex + 1].label,
        startsAt: cursor,
        endsAt: cursor + transitionBufferSeconds
      });
      cursor += transitionBufferSeconds;
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

function selectVisibleToothChart(chart, count) {
  const safeCount = Math.max(0, Math.min(chart.length, count));
  const start = Math.floor((chart.length - safeCount) / 2);
  return chart.slice(start, start + safeCount);
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

function BrushingGuide({ timer, brushingPhase, values, bpmData, selectedBpm, isMobile, playbackSeconds, brushingMusicElapsedSeconds, startCountdownTotalMs = 5000, startCountdownRemainingMs = 0, brushingHand, hideIntro = false, onCueChange }) {
  const { t } = useTranslation();
  const totalSeconds = Number(bpmData?.totalBrushingSeconds || 120);
  const topTeeth = Number(values?.top || 16);
  const bottomTeeth = Number(values?.bottom || 16);
  const useChildToothChart = topTeeth <= 10 && bottomTeeth <= 10 && topTeeth + bottomTeeth <= 20;
  const topToothChart = selectVisibleToothChart(useChildToothChart ? CHILD_TOP_TOOTH_CHART : ADULT_TOP_TOOTH_CHART, topTeeth);
  const bottomToothChart = selectVisibleToothChart(useChildToothChart ? CHILD_BOTTOM_TOOTH_CHART : ADULT_BOTTOM_TOOTH_CHART, bottomTeeth);
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

    if (!timer.running) {
      onCueChange({
        kind: "ready",
        title: t("brushing.cue.readyTitle"),
        detail: t("brushing.cue.readyDetail", { hand: t(`common.hands.${brushingHand}`) })
      });
      return;
    }

    if (activeEntry?.type === "transition") {
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

  const topPoints = createArcPoints({
    count: topTeeth,
    cx: 180,
    cy: useChildToothChart ? 194 : 190,
    rx: useChildToothChart ? 108 : 128,
    ry: useChildToothChart ? 88 : 106,
    startDeg: useChildToothChart ? 210 : 200,
    endDeg: useChildToothChart ? 330 : 340
  });

  const bottomPoints = createArcPoints({
    count: bottomTeeth,
    cx: 180,
    cy: useChildToothChart ? 226 : 230,
    rx: useChildToothChart ? 108 : 128,
    ry: useChildToothChart ? 88 : 106,
    startDeg: useChildToothChart ? 150 : 160,
    endDeg: useChildToothChart ? 30 : 20
  });
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
  const guideStatusText = brushingPhase === "countdown"
    ? t("brushing.guide.countdownCallout", { seconds: formatTenths(startCountdownRemainingMs / 1000) })
    : brushingPhase === "running"
    ? activeEntry?.type === "transition"
      ? t("brushing.guide.transitionCallout", {
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
    : activeEntry?.type === "transition"
      ? t("brushing.guide.switchLabel")
      : t("brushing.guide.sessionLabel");
  const centerValue = brushingPhase === "countdown"
    ? formatTenths(startCountdownRemainingMs / 1000)
    : activeEntry?.type === "transition"
      ? formatTenths(transitionCountdownSeconds)
      : `${Math.round(progress)}%`;
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
        transform={`translate(${point.x} ${point.y}) rotate(${point.angleDeg - 90}) scale(${toothShape.scale})`}
        className={`tooth-svg ${meta?.type || "molar"}`}
      >
        <title>{toothLabel}</title>
        <defs>
          <clipPath id={`${toothId}-back-surface`}>
            <rect x="-14" y="-14" width="28" height="14" />
          </clipPath>
          <clipPath id={`${toothId}-front-surface`}>
            <rect x="-14" y="0" width="28" height="15" />
          </clipPath>
        </defs>
        <path className="tooth-body-base" d={toothShape.path} />
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
            />
          ) : (
            <path key={`${toothId}-groove-${grooveIndex}`} className="tooth-groove" d={groove.d} />
          )
        ))}
      </g>
    );
  }

  return (
    <section className="card guide">
      <h2>{t("brushing.guide.title")}</h2>
      {!hideIntro && (
        <p>
          {isMobile
            ? t("brushing.guide.introMobile", { minutes: formatMinutes(totalSeconds) })
            : t("brushing.guide.introDesktop", { minutes: formatMinutes(totalSeconds) })}
        </p>
      )}


      <div className="mouth-map" role="img" aria-label={t("brushing.guide.mouthMapAria")}>
        <svg viewBox="0 0 360 420" preserveAspectRatio="xMidYMid meet">
          <ellipse cx="180" cy="210" rx="150" ry="170" className="mouth-outline" />

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

          {topPoints.map((point, index) => renderTooth(point, "top", topToothChart[index], index))}

          {bottomPoints.map((point, index) => renderTooth(point, "bottom", bottomToothChart[index], index))}

          {brushingPhase === "countdown" ? (
            <text x="180" y="216" textAnchor="middle" className="map-score countdown">
              <tspan className="map-score-whole" style={{ fill: countdownSignal.primary }}>{countdownWhole}</tspan>
              <tspan className="map-score-fraction" style={{ fill: countdownSignal.accent }}>{`.${countdownFraction}`}</tspan>
            </text>
          ) : (
            <text x="180" y="216" textAnchor="middle" className="map-score">{centerValue}</text>
          )}
          <text
            x="180"
            y="238"
            textAnchor="middle"
            className={`map-score-label${brushingPhase === "countdown" ? " countdown" : ""}`}
            style={brushingPhase === "countdown" ? { fill: countdownSignal.label } : undefined}
          >
            {centerLabel}
          </text>
        </svg>
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
      {guideStatusText && <p className="guide-callout">{guideStatusText}</p>}
      {inactiveGuideText && <p className="guide-callout">{inactiveGuideText}</p>}

    </section>
  );
}

export default BrushingGuide;
