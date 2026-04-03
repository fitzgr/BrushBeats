function BPMCalculator({
  brusherProfile,
  values,
  onChange,
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
  const toothRange = { min: 0, max: 16, hint: "Per row of teeth, from no erupted teeth to a full 16-tooth arch" };
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
          ? "Set top and bottom teeth count. BrushBeats infers who is brushing from the tooth count."
          : "Enter how many teeth are on the top and bottom. BrushBeats infers who is brushing from the tooth count and adjusts timing automatically."}
      </p>

      <div className="profile-summary" aria-live="polite">
        <span className="profile-summary-label">Detected stage</span>
        <strong>{brusherProfile?.label || "Adult Smile"}</strong>
        <span>{brusherProfile?.description || "Full adult set including wisdom teeth"}</span>
        {brusherProfile?.estimate && (
          <span className="profile-summary-age">
            Approximate age: {brusherProfile.estimate.maxAge >= 99 ? `${brusherProfile.estimate.minAge}+ ${brusherProfile.estimate.unit}` : `${brusherProfile.estimate.minAge}-${brusherProfile.estimate.maxAge} ${brusherProfile.estimate.unit}`}
          </span>
        )}
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
        These sliders represent actual teeth, not brushing speed. Younger mouths automatically get longer transition buffers between side and surface changes.
      </p>

      <div className="bpm-pill" data-loading={loading}>
        <span className="label">Search BPM</span>
        <strong>{bpmData?.searchBpm ?? bpmData?.musicBpm ?? "--"}</strong>
        <span className="sub">
          {bpmData
            ? `${bpmData.secondsPerTooth}s per tooth face, ${bpmData.totalTransitions} transitions at ${bpmData.transitionBufferSeconds}s each`
            : "Timing includes tooth brushing plus transition buffers inside the same 2-minute session"}
        </span>
      </div>

      <p className="headline">
        {bpmData
          ? `${bpmData.totalTeeth} teeth fit ${bpmData.totalToothTimeSeconds}s of brushing and ${bpmData.totalTransitionSeconds}s of transitions into 2 minutes.`
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
