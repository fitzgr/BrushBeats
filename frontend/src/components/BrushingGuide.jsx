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

function isPastActiveTooth(mapIndex, activeMapIndex, direction) {
  if (activeMapIndex < 0) {
    return false;
  }

  return direction === "rtl" ? mapIndex > activeMapIndex : mapIndex < activeMapIndex;
}

function BrushingGuide({ timer, brushingPhase, values, selectedBpm, brushingMusicElapsedSeconds }) {
  const totalSeconds = 120;
  const beatsPerTooth = 4;
  const topTeeth = Number(values?.top || 16);
  const bottomTeeth = Number(values?.bottom || 16);
  const sections = [
    { key: "front-top", label: "Front Top", jaw: "top", teeth: topTeeth, direction: "ltr" },
    { key: "back-top", label: "Back Top", jaw: "top", teeth: topTeeth, direction: "rtl" },
    { key: "front-bottom", label: "Front Bottom", jaw: "bottom", teeth: bottomTeeth, direction: "ltr" },
    { key: "back-bottom", label: "Back Bottom", jaw: "bottom", teeth: bottomTeeth, direction: "rtl" }
  ];
  const safeBpm = Math.max(40, Math.min(240, Number(selectedBpm) || 120));
  const beatDurationMs = 60000 / safeBpm;
  const beatsPerSecond = safeBpm / 60;
  const totalToothActions = topTeeth * 2 + bottomTeeth * 2;
  const totalSessionBeats = totalToothActions * beatsPerTooth;
  const beatsElapsedExact = timer.running
    ? Math.min(totalSessionBeats, Math.max(0, brushingMusicElapsedSeconds * beatsPerSecond))
    : 0;
  const progress = totalSessionBeats > 0 ? Math.min(100, (beatsElapsedExact / totalSessionBeats) * 100) : 0;
  const activeToothActionIndex =
    timer.running && totalToothActions > 0
      ? Math.min(totalToothActions - 1, Math.floor(beatsElapsedExact / beatsPerTooth))
      : -1;

  const sectionStarts = [0, topTeeth, topTeeth * 2, topTeeth * 2 + bottomTeeth];
  const activeSectionIndex =
    activeToothActionIndex >= 0
      ? sectionStarts.reduce((index, start, idx) => (activeToothActionIndex >= start ? idx : index), 0)
      : -1;
  const activeSection = activeSectionIndex >= 0 ? sections[activeSectionIndex] : null;
  const movementIndex = activeSection ? activeToothActionIndex - sectionStarts[activeSectionIndex] : -1;
  const activeMapIndex =
    movementIndex >= 0 && activeSection
      ? activeSection.direction === "rtl"
        ? activeSection.teeth - 1 - movementIndex
        : movementIndex
      : -1;
  const isFrontSurface = Boolean(activeSection?.key.includes("front"));
  const beatsIntoCurrentTooth = movementIndex >= 0 ? beatsElapsedExact - movementIndex * beatsPerTooth - sectionStarts[activeSectionIndex] * beatsPerTooth : 0;
  const beatsUntilNextTooth = movementIndex >= 0 ? Math.max(0.01, beatsPerTooth - beatsIntoCurrentTooth) : 0;
  const nextMoveSeconds = timer.running && movementIndex >= 0 ? Math.max(1, Math.ceil(beatsUntilNextTooth / beatsPerSecond)) : null;
  const sectionBeatsRemaining =
    timer.running && movementIndex >= 0 && activeSection
      ? Math.max(0.01, (activeSection.teeth - movementIndex - 1) * beatsPerTooth + beatsUntilNextTooth)
      : 0;
  const nextSectionSeconds = timer.running && movementIndex >= 0 ? Math.max(1, Math.ceil(sectionBeatsRemaining / beatsPerSecond)) : null;

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

    if (!timer.running || !activeSection) {
      return state;
    }

    const frontSectionIndex = jaw === "top" ? 0 : 2;
    const backSectionIndex = jaw === "top" ? 1 : 3;

    if (activeSectionIndex > frontSectionIndex) {
      state.frontDone = true;
    } else if (activeSectionIndex === frontSectionIndex && activeSection.jaw === jaw && isFrontSurface) {
      state.frontDone = isPastActiveTooth(mapIndex, activeMapIndex, activeSection.direction);
      if (mapIndex === activeMapIndex) {
        state.activeSurface = "front";
      }
    }

    if (activeSectionIndex > backSectionIndex) {
      state.backDone = true;
    } else if (activeSectionIndex === backSectionIndex && activeSection.jaw === jaw && !isFrontSurface) {
      state.backDone = isPastActiveTooth(mapIndex, activeMapIndex, activeSection.direction);
      if (mapIndex === activeMapIndex) {
        state.activeSurface = "back";
      }
    }

    return state;
  }

  return (
    <section className="card guide">
      <h2>Brush Map</h2>
      <p>Each 30-second section is split by the number of teeth in that section. Follow the bouncing marker tooth-by-tooth.</p>

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
          <text x="180" y="228" textAnchor="middle" className="map-score-label">Completeness</text>
        </svg>
      </div>

      <div className="map-legend" aria-label="Brush guide legend">
        <span><em className="legend-dot front" />Front tooth face</span>
        <span><em className="legend-dot back" />Back tooth face</span>
      </div>

      {brushingPhase === "running" && (
        <p className="guide-callout">
          Brush {activeSection?.label} now ({activeSection?.direction === "rtl" ? "right to left" : "left to right"}), tooth {movementIndex + 1} of {activeSection?.teeth}. Dot pulse follows ~{Math.round(safeBpm)} BPM. Move in {nextMoveSeconds}s. Switch section in {nextSectionSeconds}s.
        </p>
      )}
      {!timer.running && brushingPhase !== "complete" && <p className="guide-callout">Press Start Brushing to begin live tooth guidance.</p>}
      {brushingPhase === "complete" && <p className="guide-callout">All teeth brushed. Nice consistency.</p>}
    </section>
  );
}

export default BrushingGuide;
