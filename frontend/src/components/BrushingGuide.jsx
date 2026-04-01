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

function BrushingGuide({ timer, brushingPhase, values, selectedBpm, playbackSeconds, brushingStartPlaybackSeconds }) {
  const totalSeconds = 120;
  const sectionSeconds = 30;
  const topTeeth = Number(values?.top || 16);
  const bottomTeeth = Number(values?.bottom || 16);
  const sections = [
    { key: "front-top", label: "Front Top", jaw: "top", teeth: topTeeth, direction: "ltr" },
    { key: "back-top", label: "Back Top", jaw: "top", teeth: topTeeth, direction: "rtl" },
    { key: "front-bottom", label: "Front Bottom", jaw: "bottom", teeth: bottomTeeth, direction: "ltr" },
    { key: "back-bottom", label: "Back Bottom", jaw: "bottom", teeth: bottomTeeth, direction: "rtl" }
  ];
  const elapsed = totalSeconds - timer.remaining;
  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const activeSectionIndex = timer.running ? Math.min(3, Math.floor(elapsed / sectionSeconds)) : -1;
  const sectionElapsed = timer.running && activeSectionIndex >= 0 ? elapsed - activeSectionIndex * sectionSeconds : 0;
  const activeSection = activeSectionIndex >= 0 ? sections[activeSectionIndex] : null;
  const isFrontSurface = Boolean(activeSection?.key.includes("front"));
  const safeBpm = Math.max(40, Math.min(240, Number(selectedBpm) || 120));
  const beatDurationMs = 60000 / safeBpm;
  const beatsPerSecond = safeBpm / 60;
  const sectionRelativePlayback = timer.running
    ? Math.max(0, playbackSeconds - brushingStartPlaybackSeconds - activeSectionIndex * sectionSeconds)
    : 0;
  const beatsInSection = sectionRelativePlayback * beatsPerSecond;
  const beatsPerTooth = activeSection ? (sectionSeconds * beatsPerSecond) / activeSection.teeth : 1;
  const movementIndex =
    timer.running && activeSection
      ? Math.min(activeSection.teeth - 1, Math.floor(beatsInSection / Math.max(0.5, beatsPerTooth)))
      : -1;
  const activeMapIndex =
    movementIndex >= 0 && activeSection
      ? activeSection.direction === "rtl"
        ? activeSection.teeth - 1 - movementIndex
        : movementIndex
      : -1;
  const nextMoveSeconds =
    timer.running && activeSection
      ? Math.max(1, Math.ceil((((movementIndex + 1) * beatsPerTooth - beatsInSection) / beatsPerSecond)))
      : null;
  const nextSectionSeconds = timer.running ? Math.max(1, sectionSeconds - Math.floor(sectionElapsed)) : null;

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
      return { active: false, done: true };
    }

    if (!timer.running || !activeSection) {
      return { active: false, done: false };
    }

    if (activeSection.jaw !== jaw) {
      if (jaw === "top" && activeSectionIndex >= 2) {
        return { active: false, done: true };
      }

      if (jaw === "bottom" && activeSectionIndex >= 3) {
        return { active: false, done: true };
      }

      return { active: false, done: false };
    }

    if (mapIndex === activeMapIndex) {
      return { active: true, done: false };
    }

    if (activeSection.direction === "ltr") {
      return { active: false, done: mapIndex < activeMapIndex };
    }

    return { active: false, done: mapIndex > activeMapIndex };
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
            return (
              <g
                key={`top-${point.index + 1}`}
                transform={`translate(${point.x} ${point.y}) rotate(${point.angleDeg - 90})`}
                className={`tooth-svg${state.done ? " done" : ""}${state.active ? " active" : ""}`}
              >
                <path className="tooth-body" d="M0 -10 C7 -10 10 -6 10 -1 C10 4 7 8 3 10 C1 11 -1 11 -3 10 C-7 8 -10 4 -10 -1 C-10 -6 -7 -10 0 -10 Z" />
                <ellipse className="tooth-groove" cx="0" cy="0" rx="4.2" ry="2.5" />
                <path className="tooth-groove" d="M-2 -3 C-1 -1 -1 1 -2 3" />
                <path className="tooth-groove" d="M2 -3 C1 -1 1 1 2 3" />
                {state.active && (
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
            return (
              <g
                key={`bottom-${point.index + 1}`}
                transform={`translate(${point.x} ${point.y}) rotate(${point.angleDeg - 90})`}
                className={`tooth-svg${state.done ? " done" : ""}${state.active ? " active" : ""}`}
              >
                <path className="tooth-body" d="M0 -10 C7 -10 10 -6 10 -1 C10 4 7 8 3 10 C1 11 -1 11 -3 10 C-7 8 -10 4 -10 -1 C-10 -6 -7 -10 0 -10 Z" />
                <ellipse className="tooth-groove" cx="0" cy="0" rx="4.2" ry="2.5" />
                <path className="tooth-groove" d="M-2 -3 C-1 -1 -1 1 -2 3" />
                <path className="tooth-groove" d="M2 -3 C1 -1 1 1 2 3" />
                {state.active && (
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

          <text x="180" y="200" textAnchor="middle" className="map-score">{Math.round(progress)}</text>
          <text x="180" y="228" textAnchor="middle" className="map-score-label">Brushing Score</text>
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
