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

const TOOTH_PATH = "M0 -10 C7 -10 10 -6 10 -1 C10 4 7 8 3 10 C1 11 -1 11 -3 10 C-7 8 -10 4 -10 -1 C-10 -6 -7 -10 0 -10 Z";
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
  return Math.round((Number(totalSeconds || 120) / 60) * 10) / 10;
}

function BrushingGuide({ timer, brushingPhase, values, bpmData, selectedBpm, isMobile, brushingMusicElapsedSeconds, brushingHand, onCueChange }) {
  const { t } = useTranslation();
  const totalSeconds = Number(bpmData?.totalBrushingSeconds || 120);
  const topTeeth = Number(values?.top || 16);
  const bottomTeeth = Number(values?.bottom || 16);
  const safeBpm = Math.max(40, Math.min(240, Number(selectedBpm) || 120));
  const toothDurationSeconds = Number(bpmData?.secondsPerTooth || totalSeconds / Math.max(1, (topTeeth + bottomTeeth) * 2));
  const transitionBufferSeconds = Number(bpmData?.transitionBufferSeconds || 0.75);
  const segments = buildSegments(topTeeth, bottomTeeth);
  const timeline = buildTimeline(segments, toothDurationSeconds, transitionBufferSeconds);
  const beatDurationMs = Math.max(220, 60000 / safeBpm);
  const brushStrokeDurationMs = Math.max(420, beatDurationMs * 2);
  const elapsedSeconds = brushingPhase === "complete"
    ? totalSeconds
    : timer.running
      ? Math.min(totalSeconds, Math.max(0, brushingMusicElapsedSeconds))
      : 0;
  const progress = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;
  const activeEntry = timer.running
    ? timeline.find((entry) => elapsedSeconds >= entry.startsAt && elapsedSeconds < entry.endsAt) || null
    : null;
  const activeToothEntry = activeEntry?.type === "tooth" ? activeEntry : null;
  const orientationLabel = activeEntry?.type === "transition" ? activeEntry.toLabel : activeToothEntry?.label;
  const activeSide = getLabelSide(orientationLabel);
  const activeJaw = getLabelJaw(orientationLabel);
  const isFrontSurface = activeToothEntry?.surface === "front";
  const nextMoveSeconds = activeEntry ? Math.max(1, Math.ceil(activeEntry.endsAt - elapsedSeconds)) : null;
  const nextTransition = timer.running
    ? timeline.find((entry) => entry.type === "transition" && entry.startsAt >= elapsedSeconds)
    : null;
  const nextSectionSeconds = nextTransition ? Math.max(1, Math.ceil(nextTransition.startsAt - elapsedSeconds)) : null;

  useEffect(() => {
    if (!onCueChange) {
      return;
    }

    if (brushingPhase === "complete") {
      onCueChange({
        kind: "complete",
        title: t("brushing.cue.completeTitle"),
        detail: t("brushing.cue.completeDetail")
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
  }, [activeEntry, activeToothEntry, brushingHand, brushingPhase, nextMoveSeconds, onCueChange, t, timer.running]);

  const topPoints = createArcPoints({
    count: topTeeth,
    cx: 180,
    cy: 190,
    rx: 128,
    ry: 106,
    startDeg: 200,
    endDeg: 340
  });

  const bottomPoints = createArcPoints({
    count: bottomTeeth,
    cx: 180,
    cy: 230,
    rx: 128,
    ry: 106,
    startDeg: 160,
    endDeg: 20
  });

  function getToothState(jaw, mapIndex) {
    if (brushingPhase === "complete") {
      return { frontDone: true, backDone: true, activeSurface: null };
    }

    const state = {
      frontDone: false,
      backDone: false,
      activeSurface: null
    };

    if (!timer.running) {
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

  const activeQuadrantKey = activeJaw && activeSide ? `${activeJaw}-${activeSide}` : null;
  const boardStateClass = activeEntry?.type === "transition" ? "transition" : timer.running ? "running" : brushingPhase === "complete" ? "complete" : "idle";
  const boardQuadrantClass = activeQuadrantKey ? `focus-${activeQuadrantKey}` : "focus-top-left";

  return (
    <section className="card guide">
      <h2>{t("brushing.guide.title")}</h2>
      <p>
        {isMobile
          ? t("brushing.guide.introMobile", { minutes: formatMinutes(totalSeconds) })
          : t("brushing.guide.introDesktop", { minutes: formatMinutes(totalSeconds) })}
      </p>

      <div className="guide-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="hand-orientation-panel" aria-live="polite">
        <div className="hand-orientation-header visual-only-header">
          <span className="profile-summary-label">{t("brushing.guide.handOrientation")}</span>
        </div>

        <div className={`hand-orientation-board ${brushingHand} ${boardStateClass} ${boardQuadrantClass}`}>
          <span className="orientation-focus-halo" aria-hidden="true" />

          <div className="orientation-demo-arches" aria-hidden="true">
            <div className="orientation-demo-row top">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="orientation-demo-row bottom">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={`orientation-brush-demo ${brushingHand} ${boardStateClass} ${boardQuadrantClass}`} style={{ "--brush-stroke-duration": `${brushStrokeDurationMs}ms` }} aria-hidden="true">
            <div className="orientation-demo-brush">
              <span className="orientation-demo-head" />
              <span className="orientation-demo-handle" />
            </div>
          </div>
        </div>
      </div>

      <div className="mouth-map" role="img" aria-label={t("brushing.guide.mouthMapAria")}>
        <svg viewBox="0 0 360 420" preserveAspectRatio="xMidYMid meet">
          <ellipse cx="180" cy="210" rx="150" ry="170" className="mouth-outline" />

          {topPoints.map((point) => {
            const state = getToothState("top", point.index);
            const indicatorY = isFrontSurface ? 11 : -11;
            const toothId = `top-${point.index + 1}`;
            return (
              <g
                key={toothId}
                transform={`translate(${point.x} ${point.y}) rotate(${point.angleDeg - 90})`}
                className="tooth-svg"
              >
                <defs>
                  <clipPath id={`${toothId}-back-surface`}>
                    <rect x="-12" y="-12" width="24" height="12" />
                  </clipPath>
                  <clipPath id={`${toothId}-front-surface`}>
                    <rect x="-12" y="0" width="24" height="13" />
                  </clipPath>
                </defs>
                <path className="tooth-body-base" d={TOOTH_PATH} />
                <path
                  className={`tooth-face back-face${state.backDone ? " clean" : ""}${state.activeSurface === "back" ? " active-surface" : ""}`}
                  d={TOOTH_PATH}
                  clipPath={`url(#${toothId}-back-surface)`}
                />
                <path
                  className={`tooth-face front-face${state.frontDone ? " clean" : ""}${state.activeSurface === "front" ? " active-surface" : ""}`}
                  d={TOOTH_PATH}
                  clipPath={`url(#${toothId}-front-surface)`}
                />
                <path className="tooth-outline" d={TOOTH_PATH} />
                <ellipse className="tooth-groove" cx="0" cy="0" rx="4.2" ry="2.5" />
                <path className="tooth-groove" d="M-2 -3 C-1 -1 -1 1 -2 3" />
                <path className="tooth-groove" d="M2 -3 C1 -1 1 1 2 3" />
                {state.activeSurface && (
                  <circle
                    cx="0"
                    cy={indicatorY}
                    r="4"
                    className={`tooth-indicator ${isFrontSurface ? "front" : "back"}`}
                    style={{ animationDuration: `${beatDurationMs}ms` }}
                  />
                )}
              </g>
            );
          })}

          {bottomPoints.map((point) => {
            const state = getToothState("bottom", point.index);
            const indicatorY = isFrontSurface ? 11 : -11;
            const toothId = `bottom-${point.index + 1}`;
            return (
              <g
                key={toothId}
                transform={`translate(${point.x} ${point.y}) rotate(${point.angleDeg - 90})`}
                className="tooth-svg"
              >
                <defs>
                  <clipPath id={`${toothId}-back-surface`}>
                    <rect x="-12" y="-12" width="24" height="12" />
                  </clipPath>
                  <clipPath id={`${toothId}-front-surface`}>
                    <rect x="-12" y="0" width="24" height="13" />
                  </clipPath>
                </defs>
                <path className="tooth-body-base" d={TOOTH_PATH} />
                <path
                  className={`tooth-face back-face${state.backDone ? " clean" : ""}${state.activeSurface === "back" ? " active-surface" : ""}`}
                  d={TOOTH_PATH}
                  clipPath={`url(#${toothId}-back-surface)`}
                />
                <path
                  className={`tooth-face front-face${state.frontDone ? " clean" : ""}${state.activeSurface === "front" ? " active-surface" : ""}`}
                  d={TOOTH_PATH}
                  clipPath={`url(#${toothId}-front-surface)`}
                />
                <path className="tooth-outline" d={TOOTH_PATH} />
                <ellipse className="tooth-groove" cx="0" cy="0" rx="4.2" ry="2.5" />
                <path className="tooth-groove" d="M-2 -3 C-1 -1 -1 1 -2 3" />
                <path className="tooth-groove" d="M2 -3 C1 -1 1 1 2 3" />
                {state.activeSurface && (
                  <circle
                    cx="0"
                    cy={indicatorY}
                    r="4"
                    className={`tooth-indicator ${isFrontSurface ? "front" : "back"}`}
                    style={{ animationDuration: `${beatDurationMs}ms` }}
                  />
                )}
              </g>
            );
          })}

          <text x="180" y="200" textAnchor="middle" className="map-score">{Math.round(progress)}%</text>
          <text x="180" y="228" textAnchor="middle" className="map-score-label">{t("brushing.guide.sessionLabel")}</text>
        </svg>
      </div>

      <div className="map-legend" aria-label={t("brushing.guide.legendAria")}>
        <span><em className="legend-dot front" />{t("brushing.guide.legendFront")}</span>
        <span><em className="legend-dot back" />{t("brushing.guide.legendBack")}</span>
      </div>

      {brushingPhase === "running" && (
        <p className="guide-callout">
          {activeEntry?.type === "transition"
            ? t("brushing.guide.transitionCallout", {
                fromLabel: getSegmentLabel(t, activeEntry.fromLabel),
                toLabel: getSegmentLabel(t, activeEntry.toLabel),
                seconds: nextMoveSeconds
              })
            : isMobile
              ? t("brushing.guide.activeCalloutMobile", {
                  label: getSegmentLabel(t, activeToothEntry?.label),
                  position: activeToothEntry?.segmentPosition,
                  size: activeToothEntry?.segmentSize,
                  seconds: nextMoveSeconds
                })
              : t("brushing.guide.activeCalloutDesktop", {
                  label: getSegmentLabel(t, activeToothEntry?.label),
                  position: activeToothEntry?.segmentPosition,
                  size: activeToothEntry?.segmentSize,
                  bpm: Math.round(safeBpm),
                  seconds: nextMoveSeconds,
                  transitionNotice: nextSectionSeconds ? t("brushing.guide.transitionNotice", { seconds: nextSectionSeconds }) : ""
                })}
        </p>
      )}
      {!timer.running && brushingPhase !== "complete" && <p className="guide-callout">{t("brushing.guide.inactiveCallout")}</p>}
      {brushingPhase === "complete" && <p className="guide-callout">{t("brushing.guide.completeCallout")}</p>}
    </section>
  );
}

export default BrushingGuide;
