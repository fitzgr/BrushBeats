function AgeThemePanel({ profile, variant = "hero", className = "", chipLimit }) {
  if (!profile) {
    return null;
  }

  const content = profile.content?.[variant] || profile.content?.hero;
  const chips = Number.isFinite(chipLimit)
    ? profile.chips.slice(0, chipLimit)
    : profile.chips;
  const classes = ["age-theme-panel", `variant-${variant}`, profile.themeClassName, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} data-age-phase={profile.phase}>
      <div className="age-theme-panel-copy">
        <span className="age-theme-panel-eyebrow">{content?.eyebrow}</span>
        <strong>{content?.title}</strong>
        <p>{content?.body}</p>
      </div>

      <div className="age-theme-panel-meta" aria-label="Age theme meta">
        {profile.metaChips.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {chips.length > 0 && (
        <div className="age-theme-panel-chip-row" aria-label="Age theme features">
          {chips.map((chip) => (
            <span key={chip} className="age-theme-panel-chip">{chip}</span>
          ))}
        </div>
      )}

      <div className="age-theme-panel-art" aria-hidden="true">
        {profile.decorations.map((decoration) => (
          <span key={decoration.id} className={`age-theme-orbit ${decoration.orbitClassName}`}>
            {decoration.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export default AgeThemePanel;