import AchievementBadgeList from "./AchievementBadgeList";

function formatNextAchievementSummary(t, nextAchievement) {
  if (!nextAchievement) {
    return t("app.progressDashboard.caregiverCards.noPendingReward");
  }

  const achievementTitle = t(`app.achievements.types.${nextAchievement.achievementType}.title`);
  if (nextAchievement.progress.measure === "distinctRoutineTypes") {
    return t("app.progressDashboard.caregiverCards.nextRewardRoutineMix", {
      title: achievementTitle,
      remaining: nextAchievement.progress.remaining,
      target: nextAchievement.progress.target
    });
  }

  if (nextAchievement.progress.measure === "stageTransitions") {
    return t("app.progressDashboard.caregiverCards.nextRewardDevelopment", {
      title: achievementTitle
    });
  }

  return t("app.progressDashboard.caregiverCards.nextRewardCount", {
    title: achievementTitle,
    remaining: nextAchievement.progress.remaining,
    target: nextAchievement.progress.target
  });
}

function formatMissingRoutineTypes(t, routineCoverage) {
  if (!routineCoverage || routineCoverage.missingTypes.length === 0) {
    return t("app.progressDashboard.caregiverCards.routineMixComplete");
  }

  const labels = routineCoverage.missingTypes.map((routineType) => t(`app.progressDashboard.activityTypes.${routineType}`));
  return t("app.progressDashboard.caregiverCards.routineMixPending", { items: labels.join(", ") });
}

function formatGoalSummary(t, goal, kind) {
  if (!goal) {
    return "";
  }

  if (goal.complete) {
    return t(`app.progressDashboard.goalCards.${kind}Complete`, { current: goal.current, target: goal.target });
  }

  return t(`app.progressDashboard.goalCards.${kind}Progress`, {
    current: goal.current,
    target: goal.target,
    remaining: goal.remaining
  });
}

function formatCaregiverNudge(t, nudge) {
  if (!nudge) {
    return "";
  }

  if (nudge.key === "stageTransition") {
    return t("app.progressDashboard.nudges.stageTransition", {
      previousStage: t(`age.stages.${nudge.values.previousStage}.label`),
      newStage: t(`age.stages.${nudge.values.newStage}.label`)
    });
  }

  if (nudge.key === "nextAchievement") {
    return t("app.progressDashboard.nudges.nextAchievement", {
      badge: t(`app.achievements.types.${nudge.values.achievementType}.title`),
      remaining: nudge.values.remaining,
      target: nudge.values.target
    });
  }

  return t(`app.progressDashboard.nudges.${nudge.key}`, nudge.values);
}

export default function ProgressDashboardPanel({ t, dashboard, activeUserName, filters, onFilterChange, onLogActivity, readOnly = false, previewLabel = "" }) {
  if (!dashboard) {
    return null;
  }

  return (
    <section className={`progress-dashboard-panel${readOnly ? " readonly-preview" : ""}`} aria-label={t("app.progressDashboard.ariaLabel")}>
      <div className="progress-dashboard-header">
        <div>
          <p className="progress-dashboard-eyebrow">{t("app.progressDashboard.eyebrow")}</p>
          <h2>{t("app.progressDashboard.title", { name: activeUserName || t("app.progressDashboard.defaultUser") })}</h2>
          <p>{t("app.progressDashboard.subtitle")}</p>
        </div>
        <div className="progress-dashboard-filters">
          {previewLabel && <span className="progress-dashboard-preview-badge">{previewLabel}</span>}
          <label>
            <span>{t("app.progressDashboard.filters.timeRange")}</span>
            <select value={filters.timeRange} onChange={(event) => onFilterChange("timeRange", event.target.value)} disabled={readOnly}>
              <option value="7d">{t("app.progressDashboard.filters.options.7d")}</option>
              <option value="30d">{t("app.progressDashboard.filters.options.30d")}</option>
              <option value="all">{t("app.progressDashboard.filters.options.all")}</option>
            </select>
          </label>
          <label>
            <span>{t("app.progressDashboard.filters.activityType")}</span>
            <select value={filters.activityType} onChange={(event) => onFilterChange("activityType", event.target.value)} disabled={readOnly}>
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
        <article className="progress-dashboard-stat-card">
          <strong>{dashboard.progression.currentLevel}</strong>
          <span>{t("app.progressDashboard.stats.level")}</span>
        </article>
      </div>

      <section className="progress-dashboard-level-card">
        <strong>{t("app.progressDashboard.levelTitle", { level: dashboard.progression.currentLevel })}</strong>
        <span>{t("app.progressDashboard.levelSummary", { points: dashboard.progression.points, next: dashboard.progression.nextLevelPoints })}</span>
        <div className="progress-dashboard-level-track" aria-hidden="true">
          <span className="progress-dashboard-level-fill" style={{ width: `${dashboard.progression.progressPercent}%` }} />
        </div>
        <small>{t("app.progressDashboard.levelSummaryDetailed", { remaining: dashboard.progression.pointsToNextLevel })}</small>
      </section>

      <section className="progress-dashboard-caregiver-card">
        <div className="progress-dashboard-section-header">
          <strong>{t("app.progressDashboard.caregiverSummaryTitle")}</strong>
          <span>{t("app.progressDashboard.caregiverSummarySubtitle")}</span>
        </div>
        <div className="progress-dashboard-caregiver-grid">
          <article className="progress-dashboard-caregiver-item">
            <strong>{t("app.progressDashboard.goalCards.weeklyBrushingTitle")}</strong>
            <span>{formatGoalSummary(t, dashboard.goals.weeklyBrushing, "weeklyBrushing")}</span>
            <div className="progress-dashboard-level-track" aria-hidden="true">
              <span className="progress-dashboard-level-fill" style={{ width: `${dashboard.goals.weeklyBrushing.percent}%` }} />
            </div>
          </article>
          <article className="progress-dashboard-caregiver-item">
            <strong>{t("app.progressDashboard.goalCards.weeklySupportTitle")}</strong>
            <span>{formatGoalSummary(t, dashboard.goals.weeklySupport, "weeklySupport")}</span>
            <div className="progress-dashboard-level-track" aria-hidden="true">
              <span className="progress-dashboard-level-fill" style={{ width: `${dashboard.goals.weeklySupport.percent}%` }} />
            </div>
          </article>
          <article className="progress-dashboard-caregiver-item">
            <strong>{t("app.progressDashboard.caregiverCards.nextRewardTitle")}</strong>
            <span>{formatNextAchievementSummary(t, dashboard.nextAchievement)}</span>
          </article>
          <article className="progress-dashboard-caregiver-item">
            <strong>{t("app.progressDashboard.caregiverCards.routineMixTitle", { current: dashboard.caregiverSummary.routineCoverage.current, total: dashboard.caregiverSummary.routineCoverage.target })}</strong>
            <span>{formatMissingRoutineTypes(t, dashboard.caregiverSummary.routineCoverage)}</span>
          </article>
          <article className="progress-dashboard-caregiver-item">
            <strong>{t("app.progressDashboard.caregiverCards.badgeMixTitle")}</strong>
            <span>{t("app.progressDashboard.caregiverCards.badgeMixValue", {
              bronze: dashboard.caregiverSummary.tierCounts.bronze,
              silver: dashboard.caregiverSummary.tierCounts.silver,
              gold: dashboard.caregiverSummary.tierCounts.gold
            })}</span>
          </article>
        </div>
        <div className="progress-dashboard-points-breakdown" aria-label={t("app.progressDashboard.pointsBreakdownTitle")}>
          {dashboard.progression.pointsBreakdown.map((entry) => (
            <span key={entry.key}>{t(`app.progressDashboard.pointsBreakdown.${entry.key}`, { points: entry.points })}</span>
          ))}
        </div>
        {dashboard.caregiverNudges.length > 0 && (
          <div className="progress-dashboard-nudges" aria-label={t("app.progressDashboard.nudgesTitle")}>
            {dashboard.caregiverNudges.map((nudge) => (
              <article key={`${nudge.key}-${nudge.priority}`} className="progress-dashboard-nudge-card">
                <strong>{t(`app.progressDashboard.nudgeTitles.${nudge.key}`)}</strong>
                <span>{formatCaregiverNudge(t, nudge)}</span>
              </article>
            ))}
          </div>
        )}
        <p className="progress-dashboard-caregiver-note">{t(`app.progressDashboard.momentum.${dashboard.caregiverSummary.momentum}`)}</p>
      </section>

      <AchievementBadgeList
        t={t}
        achievements={dashboard.recentAchievements}
        title={t("app.progressDashboard.achievementsTitle")}
      />

      <div className="progress-dashboard-quick-actions">
        <strong>{t("app.progressDashboard.quickActionsTitle")}</strong>
        <div className="progress-dashboard-quick-action-list">
          <button type="button" className="action-btn secondary" onClick={() => onLogActivity("flossing")} disabled={readOnly}>
            {t("app.progressDashboard.quickActions.flossing")}
          </button>
          <button type="button" className="action-btn secondary" onClick={() => onLogActivity("water-picking")} disabled={readOnly}>
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