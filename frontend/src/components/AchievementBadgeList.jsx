export default function AchievementBadgeList({ t, achievements, title, compact = false }) {
  if (!Array.isArray(achievements) || achievements.length === 0) {
    return null;
  }

  return (
    <section className={`achievement-badge-list${compact ? " compact" : ""}`} aria-label={title || t("app.achievements.ariaLabel")}>
      {title && <strong>{title}</strong>}
      <div className="achievement-badge-grid">
        {achievements.map((achievement) => (
          <article key={achievement.achievementId || achievement.achievementType} className="achievement-badge-card">
            <span className="achievement-badge-icon" aria-hidden="true">★</span>
            <div>
              <strong>{t(`app.achievements.types.${achievement.achievementType}.title`)}</strong>
              <span>{t(`app.achievements.types.${achievement.achievementType}.description`)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}