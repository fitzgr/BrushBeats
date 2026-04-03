const PROFILE_CONFIG = {
  adult: {
    min: 8,
    max: 16,
    hint: "Typical adult range for each row"
  },
  kids: {
    min: 1,
    max: 14,
    hint: "Covers first teeth through mixed smiles"
  }
};

function BPMCalculator({
  listenerProfile,
  values,
  onChange,
  onProfileChange,
  bpmData,
  loading,
  timer,
  brushingPhase,
  isMobile,
  hideSessionActions = false,
  onStartTimer,
  onRestartTimer
}) {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  const toothRange = PROFILE_CONFIG[listenerProfile] || PROFILE_CONFIG.adult;
  const rangeMarks = Array.from({ length: toothRange.max - toothRange.min + 1 }, (_, index) => toothRange.min + index);

  const totalBrushingTime = 120; // 4 sections × 30 seconds (ADA recommended)
  const totalTimeLabel = formatTime(totalBrushingTime);

  const buttonLabel =
    brushingPhase === "running"
      ? `Brushing... ${formatTime(timer.remaining)}`
      : brushingPhase === "complete"
          ? `Brush Again (${totalTimeLabel})`
          : `Start Brushing (${totalTimeLabel})`;

  return (
    <section className="card calculator">
      <h2>{isMobile ? "Quick Tempo" : "Tempo Lab"}</h2>
      <p>
        {isMobile
          ? "Choose kids or adults, then set top and bottom teeth count to tune your brush tempo."
          : "Choose kids or adults, then enter how many teeth are on the top and bottom. BrushBeats uses those tooth counts to calculate brushing tempo."}
      </p>

      <div className="profile-toggle" role="group" aria-label="Brushing profile">
        <button
          type="button"
          className={`profile-option${listenerProfile === "kids" ? " active" : ""}`}
          onClick={() => onProfileChange("kids")}
        >
          Kids
        </button>
        <button
          type="button"
          className={`profile-option${listenerProfile === "adult" ? " active" : ""}`}
          onClick={() => onProfileChange("adult")}
        >
          Adults
        </button>
      </div>

      <div className="controls-grid">
        <label>
          <span className="slider-label-row">
            <span>Top Teeth Count</span>
            <strong className="slider-value-badge">{values.top}</strong>
          </span>
          <span className="tooth-range-shell">
            <input
              className="tooth-range-input"
              type="range"
              min={toothRange.min}
              max={toothRange.max}
              step="1"
              value={values.top}
              onChange={(event) => onChange("top", Number(event.target.value))}
            />
            <span className="tooth-range-ticks" aria-hidden="true">
              {rangeMarks.map((mark) => (
                <span
                  key={`top-${mark}`}
                  className="tooth-range-tick"
                  style={{ left: `${((mark - toothRange.min) / Math.max(1, toothRange.max - toothRange.min)) * 100}%` }}
                />
              ))}
            </span>
          </span>
          <span className="slider-range-readout" aria-hidden="true">
            <span>{toothRange.min}</span>
            <span className="slider-range-hint">{toothRange.hint}</span>
            <span>{toothRange.max}</span>
          </span>
        </label>

        <label>
          <span className="slider-label-row">
            <span>Bottom Teeth Count</span>
            <strong className="slider-value-badge">{values.bottom}</strong>
          </span>
          <span className="tooth-range-shell">
            <input
              className="tooth-range-input"
              type="range"
              min={toothRange.min}
              max={toothRange.max}
              step="1"
              value={values.bottom}
              onChange={(event) => onChange("bottom", Number(event.target.value))}
            />
            <span className="tooth-range-ticks" aria-hidden="true">
              {rangeMarks.map((mark) => (
                <span
                  key={`bottom-${mark}`}
                  className="tooth-range-tick"
                  style={{ left: `${((mark - toothRange.min) / Math.max(1, toothRange.max - toothRange.min)) * 100}%` }}
                />
              ))}
            </span>
          </span>
          <span className="slider-range-readout" aria-hidden="true">
            <span>{toothRange.min}</span>
            <span className="slider-range-hint">{toothRange.hint}</span>
            <span>{toothRange.max}</span>
          </span>
        </label>

      </div>

      <p className="form-note">
        These sliders represent actual teeth, not brushing speed. Kids mode covers early brushing years and mixed teeth.
      </p>

      <div className="bpm-pill" data-loading={loading}>
        <span className="label">Search BPM</span>
        <strong>{bpmData?.searchBpm ?? bpmData?.musicBpm ?? "--"}</strong>
        <span className="sub">
          Switch teeth every {bpmData?.secondsPerTooth ?? "--"}s, 4 beats per tooth
        </span>
      </div>

      <p className="headline">
        {bpmData
          ? `${bpmData.totalTeeth} teeth across 2 minutes gives ${Math.round(bpmData.searchBpm ?? bpmData.musicBpm)} BPM.`
          : "Adjust teeth counts to calculate BPM."}
      </p>

      {!hideSessionActions && (
        <>
          <div className="session-actions">
            <button type="button" className="action-btn" onClick={onStartTimer}>
              {buttonLabel}
            </button>

            <button type="button" className="action-btn secondary" onClick={onRestartTimer}>
              {isMobile ? "Reset" : "Reset Timer"}
            </button>
          </div>

          <p className="timer-note">
            {isMobile
              ? "Timer and guide only. Video controls stay in YouTube."
              : "Start Brushing controls only the countdown and brush guide. It never reloads or restarts the YouTube video."}
          </p>
        </>
      )}
    </section>
  );
}

export default BPMCalculator;
