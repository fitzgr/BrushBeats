export default function ProgressDashboardPanel({ t, dashboard, activeUserName, filters, onFilterChange, onLogActivity }) {
  if (!dashboard) {
    return null;
  }

  return (
    <section className="progress-dashboard-panel" aria-label={t("app.progressDashboard.ariaLabel")}>
      <div className="progress-dashboard-header">
        <div>
          <p className="progress-dashboard-eyebrow">{t("app.progressDashboard.eyebrow")}</p>
          <h2>{t("app.progressDashboard.title", { name: activeUserName || t("app.progressDashboard.defaultUser") })}</h2>
          <p>{t("app.progressDashboard.subtitle")}</p>
        </div>
        <div className="progress-dashboard-filters">
          <label>
            <span>{t("app.progressDashboard.filters.timeRange")}</span>
            <select value={filters.timeRange} onChange={(event) => onFilterChange("timeRange", event.target.value)}>
              <option value="7d">{t("app.progressDashboard.filters.options.7d")}</option>
              <option value="30d">{t("app.progressDashboard.filters.options.30d")}</option>
              <option value="all">{t("app.progressDashboard.filters.options.all")}</option>
            </select>
          </label>
          <label>
            <span>{t("app.progressDashboard.filters.activityType")}</span>
            <select value={filters.activityType} onChange={(event) => onFilterChange("activityType", event.target.value)}>
              <option value="all">{t("app.progressDashboard.filters.options.allActivities")}</option>
              <option value="brushing">{t("app.progressDashboard.filters.options.brushing")}</option>
              <option value="flossing">{t("app.progressDashboard.filters.options.flossing")}</option>
              <option value="water-picking">{t("app.progressDashboard.filters.options.waterPicking")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="progress-dashboard-stats">
        <article className="progress-dashboard-stat-card">
          <strong>{dashboard.totals.totalSessions}</strong>
          <span>{t("app.progressDashboard.stats.totalSessions")}</span>
        </article>
        <article className="progress-dashboard-stat-card">
          <strong>{dashboard.totals.completionRate}%</strong>
          <span>{t("app.progressDashboard.stats.completionRate")}</span>
        </article>
        <article className="progress-dashboard-stat-card">
          <strong>{dashboard.totals.streakDays}</strong>
          <span>{t("app.progressDashboard.stats.streak")}</span>
        </article>
        <article className="progress-dashboard-stat-card">
          <strong>{dashboard.totals.monthlySessions}</strong>
          <span>{t("app.progressDashboard.stats.monthlySessions")}</span>
        </article>
      </div>

      <div className="progress-dashboard-quick-actions">
        <strong>{t("app.progressDashboard.quickActionsTitle")}</strong>
        <div className="progress-dashboard-quick-action-list">
          <button type="button" className="action-btn secondary" onClick={() => onLogActivity("flossing")}>
            {t("app.progressDashboard.quickActions.flossing")}
          </button>
          <button type="button" className="action-btn secondary" onClick={() => onLogActivity("water-picking")}>
            {t("app.progressDashboard.quickActions.waterPicking")}
          </button>
        </div>
      </div>

      <div className="progress-dashboard-grid">
        <section className="progress-dashboard-section">
          <div className="progress-dashboard-section-header">
            <strong>{t("app.progressDashboard.recentSessionsTitle")}</strong>
            <span>{t("app.progressDashboard.recentSessionsSummary", { count: dashboard.recentSessions.length })}</span>
          </div>
          {dashboard.recentSessions.length > 0 ? (
            <div className="progress-dashboard-list">
              {dashboard.recentSessions.map((session) => (
                <article key={session.sessionId} className="progress-dashboard-list-item">
                  <strong>
                    {session.songTitle
                      ? t("app.progressDashboard.sessionWithSong", { title: session.songTitle })
                      : t(`app.progressDashboard.activityTypes.${session.sessionType || "brushing"}`)}
                  </strong>
                  <span>{t("app.progressDashboard.sessionMeta", { date: String(session.completedAt || session.startedAt || "").slice(0, 10), duration: session.targetDurationSeconds || session.durationSeconds || 0 })}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="progress-dashboard-empty">{t("app.progressDashboard.noSessions")}</p>
          )}
        </section>

        <section className="progress-dashboard-section">
          <div className="progress-dashboard-section-header">
            <strong>{t("app.progressDashboard.toothHistoryTitle")}</strong>
            <span>{t("app.progressDashboard.toothHistorySummary", { count: dashboard.toothMilestones.length })}</span>
          </div>
          {dashboard.toothMilestones.length > 0 ? (
            <div className="progress-dashboard-list">
              {dashboard.toothMilestones.map((entry) => (
                <article key={entry.toothHistoryId} className="progress-dashboard-list-item">
                  <strong>{t(`app.progressDashboard.toothEvents.${entry.label}`)}</strong>
                  <span>{t("app.progressDashboard.toothEventMeta", { date: String(entry.recordedAt || "").slice(0, 10), stage: t(`age.stages.${entry.newToothStage || entry.previousToothStage || "unknown"}.label`) })}</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="progress-dashboard-empty">{t("app.progressDashboard.noToothHistory")}</p>
          )}
        </section>
      </div>
    </section>
  );
}