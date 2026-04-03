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

function BrushingGuide({ timer, brushingPhase, values, bpmData, selectedBpm, isMobile, brushingMusicElapsedSeconds }) {
  const totalSeconds = Number(bpmData?.totalBrushingSeconds || 120);
  const topTeeth = Number(values?.top || 16);
  const bottomTeeth = Number(values?.bottom || 16);
  const safeBpm = Math.max(40, Math.min(240, Number(selectedBpm) || 120));
  const toothDurationSeconds = Number(bpmData?.secondsPerTooth || totalSeconds / Math.max(1, (topTeeth + bottomTeeth) * 2));
  const transitionBufferSeconds = Number(bpmData?.transitionBufferSeconds || 0.75);
  const pulseDurationMs = Math.max(300, toothDurationSeconds * 1000);
  const segments = buildSegments(topTeeth, bottomTeeth);
  const timeline = buildTimeline(segments, toothDurationSeconds, transitionBufferSeconds);
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
  const activeMapIndex = activeToothEntry?.mapIndex ?? -1;
  const isFrontSurface = activeToothEntry?.surface === "front";
  const nextMoveSeconds = activeEntry ? Math.max(1, Math.ceil(activeEntry.endsAt - elapsedSeconds)) : null;
  const nextTransition = timer.running
    ? timeline.find((entry) => entry.type === "transition" && entry.startsAt >= elapsedSeconds)
    : null;
  const nextSectionSeconds = nextTransition ? Math.max(1, Math.ceil(nextTransition.startsAt - elapsedSeconds)) : null;

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

  return (
    <section className="card guide">
      <h2>Brush Map</h2>
      <p>
        {isMobile
          ? "Follow the marker tooth-by-tooth. Transition buffers are built into the same 2-minute session."
          : "Brush every tooth face evenly. When you switch sides or move from front to back, the guide inserts transition buffers without extending the 2-minute session."}
      </p>

      <div className="guide-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="mouth-map" role="img" aria-label="Dynamic tooth brushing map">
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
                    style={{ animationDuration: `${pulseDurationMs}ms` }}
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
                    style={{ animationDuration: `${pulseDurationMs}ms` }}
                  />
                )}
              </g>
            );
          })}

          <text x="180" y="200" textAnchor="middle" className="map-score">{Math.round(progress)}%</text>
          <text x="180" y="228" textAnchor="middle" className="map-score-label">Session</text>
        </svg>
      </div>

      <div className="map-legend" aria-label="Brush guide legend">
        <span><em className="legend-dot front" />Front tooth face</span>
        <span><em className="legend-dot back" />Back tooth face</span>
      </div>

      {brushingPhase === "running" && (
        <p className="guide-callout">
          {activeEntry?.type === "transition"
            ? `Transition from ${activeEntry.fromLabel} to ${activeEntry.toLabel}. Resume brushing in ${nextMoveSeconds}s.`
            : isMobile
              ? `${activeToothEntry?.label}, tooth ${activeToothEntry?.segmentPosition}/${activeToothEntry?.segmentSize}. Move in ${nextMoveSeconds}s.`
              : `Brush ${activeToothEntry?.label} now, tooth ${activeToothEntry?.segmentPosition} of ${activeToothEntry?.segmentSize}. Song target is ~${Math.round(safeBpm)} BPM. Move in ${nextMoveSeconds}s.${nextSectionSeconds ? ` Transition in ${nextSectionSeconds}s.` : ""}`}
        </p>
      )}
      {!timer.running && brushingPhase !== "complete" && <p className="guide-callout">Press Start Brushing to begin live tooth guidance.</p>}
      {brushingPhase === "complete" && <p className="guide-callout">All teeth brushed. Nice consistency.</p>}
    </section>
  );
}

export default BrushingGuide;
