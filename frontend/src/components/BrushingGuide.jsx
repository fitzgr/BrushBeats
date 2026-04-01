const sections = [
  "Front Top",
  "Back Top",
  "Front Bottom",
  "Back Bottom"
];

function BrushingGuide({ timer }) {
  const totalSeconds = 120;
  const elapsed = totalSeconds - timer.remaining;
  const activeIndex = timer.running ? Math.min(3, Math.floor(elapsed / 30)) : -1;
  const progress = Math.min(100, (elapsed / totalSeconds) * 100);

  return (
    <section className="card guide">
      <h2>Brush Map</h2>
      <p>When brushing starts, follow the highlighted section every 30 seconds.</p>

      <div className="guide-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="guide-grid">
        {sections.map((name, index) => {
          const isActive = index === activeIndex;
          const isDone = timer.running ? index < activeIndex : timer.remaining === 0;

          return (
            <article key={name} className={`guide-cell${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
              <small>Section {index + 1}</small>
              <strong>{name}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default BrushingGuide;
