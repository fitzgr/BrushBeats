function BPMCalculator({ values, onChange, bpmData, loading, timer, onStartTimer }) {
  return (
    <section className="card calculator">
      <h2>Tempo Lab</h2>
      <p>Dial in your brushing setup and BrushBeats calculates your ideal rhythm.</p>

      <div className="controls-grid">
        <label>
          Top Teeth: {values.top}
          <input
            type="range"
            min="8"
            max="16"
            value={values.top}
            onChange={(event) => onChange("top", Number(event.target.value))}
          />
        </label>

        <label>
          Bottom Teeth: {values.bottom}
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
            <option value={30}>30 seconds</option>
            <option value={15}>15 seconds</option>
          </select>
        </label>
      </div>

      <div className="bpm-pill" data-loading={loading}>
        <span className="label">Search BPM</span>
        <strong>{bpmData?.searchBpm ?? bpmData?.musicBpm ?? "--"}</strong>
        <span className="sub">Raw BPM: {bpmData?.rawBpm ?? "--"} (x2 boost)</span>
      </div>

      <p className="headline">
        {bpmData ? `You're brushing at ${Math.round(bpmData.searchBpm ?? bpmData.musicBpm)} BPM.` : "Adjust teeth counts to calculate BPM."}
      </p>

      <button type="button" className="action-btn" onClick={onStartTimer}>
        {timer.running ? `Brushing... ${timer.remaining}s` : "Start Brushing (2:00)"}
      </button>
    </section>
  );
}

export default BPMCalculator;
