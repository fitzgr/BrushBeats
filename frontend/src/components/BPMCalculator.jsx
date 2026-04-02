function BPMCalculator({ values, onChange, bpmData, loading, timer, brushingPhase, isMobile, onStartTimer, onRestartTimer }) {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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
          ? "Set top and bottom teeth count to tune your brush tempo."
          : "Enter how many teeth you have on the top and bottom. BrushBeats uses those tooth counts to calculate your brushing tempo."}
      </p>

      <div className="controls-grid">
        <label>
          Top Teeth Count: {values.top}
          <input
            type="range"
            min="8"
            max="16"
            value={values.top}
            onChange={(event) => onChange("top", Number(event.target.value))}
          />
        </label>

        <label>
          Bottom Teeth Count: {values.bottom}
          <input
            type="range"
            min="8"
            max="16"
            value={values.bottom}
            onChange={(event) => onChange("bottom", Number(event.target.value))}
          />
        </label>

      </div>

      <p className="form-note">These sliders represent your actual number of teeth, not brushing speed.</p>

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
    </section>
  );
}

export default BPMCalculator;
