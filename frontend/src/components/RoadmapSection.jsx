import {
  ARCHITECTURE_DECISIONS,
  BUILD_ORDER,
  FUTURE_IDEAS,
  INFRASTRUCTURE_ITEMS,
  ROADMAP_PHASES,
  ROADMAP_UI_DESCRIPTION,
  ROADMAP_UI_TITLE
} from "../data/roadmapData";

function renderNestedItems(items, keyPrefix) {
  return (
    <ul className="roadmap-list">
      {items.map((item, index) => {
        if (typeof item === "string") {
          return <li key={`${keyPrefix}-${index}`}>{item}</li>;
        }

        return (
          <li key={`${keyPrefix}-${index}`}>
            {item.text}
            {item.children?.length ? renderNestedItems(item.children, `${keyPrefix}-${index}`) : null}
          </li>
        );
      })}
    </ul>
  );
}

function RoadmapSection() {
  return (
    <section className="roadmap-view">
      <div className="roadmap-header-card">
        <div className="roadmap-header-topline">
          <p className="eyebrow">Development Roadmap</p>
          <div className="roadmap-export-links" aria-label="Roadmap exports">
            <a href="roadmap.json" target="_blank" rel="noreferrer">
              Roadmap JSON
            </a>
            <a href="roadmap.md" target="_blank" rel="noreferrer">
              Roadmap Markdown
            </a>
          </div>
        </div>
        <h3>{ROADMAP_UI_TITLE}</h3>
        <p>{ROADMAP_UI_DESCRIPTION}</p>
        <p className="roadmap-machine-note">
          For AI or GPT design sessions, reference the static roadmap endpoints directly so the app does not need to be
          rendered first.
        </p>
      </div>

      <div className="roadmap-grid">
        <article className="roadmap-card">
          <h4>Suggested Build Order</h4>
          <ol className="roadmap-order-list">
            {BUILD_ORDER.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article className="roadmap-card">
          <h4>Architecture Decisions and Cautions</h4>
          <ul className="roadmap-list">
            {ARCHITECTURE_DECISIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="roadmap-phase-list">
        {ROADMAP_PHASES.map((phase) => (
          <article key={phase.id} className="roadmap-phase-card">
            <div className="roadmap-phase-header">
              <div>
                <p className="eyebrow">{phase.eyebrow}</p>
                <h4>{phase.title}</h4>
              </div>
              <span className="roadmap-priority-chip">{phase.priority}</span>
            </div>
            <p className="roadmap-summary">{phase.summary}</p>
            <div className="roadmap-groups">
              {phase.groups.map((group) => (
                <section key={`${phase.id}-${group.title}`} className="roadmap-group">
                  <h5>{group.title}</h5>
                  {renderNestedItems(group.items, `${phase.id}-${group.title}`)}
                </section>
              ))}
            </div>
            <p className="roadmap-dependency-note">
              <strong>Dependencies / Notes:</strong> {phase.dependencies}
            </p>
          </article>
        ))}
      </div>

      <div className="roadmap-grid roadmap-grid-secondary">
        <article className="roadmap-card">
          <h4>Technical Debt and Infrastructure Track</h4>
          <ul className="roadmap-list">
            {INFRASTRUCTURE_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="roadmap-card">
          <h4>Optional Future / Nice-to-Have</h4>
          <ul className="roadmap-list">
            {FUTURE_IDEAS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

export default RoadmapSection;