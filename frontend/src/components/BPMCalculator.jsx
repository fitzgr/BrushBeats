function BPMCalculator({ values, onChange, bpmData, loading, timer, brushingPhase, onStartTimer, onRestartTimer }) {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonLabel =
    brushingPhase === "running"
      ? `Brushing... ${formatTime(timer.remaining)}`
      : brushingPhase === "complete"
          ? "Brush Again (2:00)"
          : "Start Brushing (2:00)";

  return (
    <section className="card calculator">
      <h2>Tempo Lab</h2>
      <p>
        Enter how many teeth you have on the top and bottom. BrushBeats uses those tooth counts to calculate your brushing tempo.
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

        <label>
          Seconds Per Section
          <select
            value={values.sectionSeconds}
            onChange={(event) => onChange("sectionSeconds", Number(event.target.value))}
          >
            <option value={15}>15 seconds (recommended)</option>
            <option value={30}>30 seconds</option>
          </select>
        </label>
      </div>

      <p className="form-note">These sliders represent your actual number of teeth, not brushing speed.</p>

      <div className="bpm-pill" data-loading={loading}>
        <span className="label">Search BPM</span>
        <strong>{bpmData?.searchBpm ?? bpmData?.musicBpm ?? "--"}</strong>
        <span className="sub">Raw BPM: {bpmData?.rawBpm ?? "--"} (x2 boost)</span>
      </div>

      <p className="headline">
        {bpmData ? `You're brushing at ${Math.round(bpmData.searchBpm ?? bpmData.musicBpm)} BPM.` : "Adjust teeth counts to calculate BPM."}
      </p>

      <div className="session-actions">
        <button type="button" className="action-btn" onClick={onStartTimer}>
          {buttonLabel}
        </button>

        <button type="button" className="action-btn secondary" onClick={onRestartTimer}>
          Restart Brushing
        </button>
      </div>

      <p className="timer-note">Start Brushing controls only the countdown and brush guide. It never reloads or restarts the YouTube video.</p>
    </section>
  );
}

export default BPMCalculator;
