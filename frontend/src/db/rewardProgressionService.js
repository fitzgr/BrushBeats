export const DEFAULT_REWARD_SETTINGS = {
  levelBasePoints: 100,
  levelStepPoints: 120,
  levelGrowthPoints: 20,
  brushingSessionPoints: 12,
  supportRoutinePoints: 8,
  toothMilestonePoints: 18,
  routineVarietyPoints: 10
};

export const DEFAULT_GOAL_SETTINGS = {
  weeklyBrushingSessions: 14,
  weeklySupportRoutines: 5
};

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeInteger(value, fallback, min, max) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return clampNumber(Math.round(nextValue), min, max);
}

export function normalizeRewardSettings(input = {}) {
  return {
    levelBasePoints: normalizeInteger(input.levelBasePoints, DEFAULT_REWARD_SETTINGS.levelBasePoints, 40, 500),
    levelStepPoints: normalizeInteger(input.levelStepPoints, DEFAULT_REWARD_SETTINGS.levelStepPoints, 40, 500),
    levelGrowthPoints: normalizeInteger(input.levelGrowthPoints, DEFAULT_REWARD_SETTINGS.levelGrowthPoints, 0, 120),
    brushingSessionPoints: normalizeInteger(input.brushingSessionPoints, DEFAULT_REWARD_SETTINGS.brushingSessionPoints, 1, 100),
    supportRoutinePoints: normalizeInteger(input.supportRoutinePoints, DEFAULT_REWARD_SETTINGS.supportRoutinePoints, 1, 100),
    toothMilestonePoints: normalizeInteger(input.toothMilestonePoints, DEFAULT_REWARD_SETTINGS.toothMilestonePoints, 1, 120),
    routineVarietyPoints: normalizeInteger(input.routineVarietyPoints, DEFAULT_REWARD_SETTINGS.routineVarietyPoints, 0, 80)
  };
}

export function normalizeGoalSettings(input = {}) {
  return {
    weeklyBrushingSessions: normalizeInteger(input.weeklyBrushingSessions, DEFAULT_GOAL_SETTINGS.weeklyBrushingSessions, 1, 40),
    weeklySupportRoutines: normalizeInteger(input.weeklySupportRoutines, DEFAULT_GOAL_SETTINGS.weeklySupportRoutines, 0, 20)
  };
}

function buildLevelThresholds(settings, levelsToBuild = 10) {
  const safeSettings = normalizeRewardSettings(settings);
  const thresholds = [0];

  for (let levelIndex = 1; levelIndex <= levelsToBuild; levelIndex += 1) {
    const previousThreshold = thresholds[levelIndex - 1];
    const increment = levelIndex === 1
      ? safeSettings.levelBasePoints
      : safeSettings.levelStepPoints + safeSettings.levelGrowthPoints * (levelIndex - 2);
    thresholds.push(previousThreshold + increment);
  }

  return thresholds;
}

export function buildProgressionProfile(rewardSettings = {}) {
  const normalizedSettings = normalizeRewardSettings(rewardSettings);

  return {
    rewardSettings: normalizedSettings,
    routineTypes: ["brushing", "flossing", "water-picking"],
    levelThresholds: buildLevelThresholds(normalizedSettings),
    points: {
      brushingSession: normalizedSettings.brushingSessionPoints,
      supportRoutine: normalizedSettings.supportRoutinePoints,
      toothMilestone: normalizedSettings.toothMilestonePoints,
      routineVarietyPerType: normalizedSettings.routineVarietyPoints,
      achievementFallback: 40
    }
  };
}

function subtractDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() - days);
  return nextDate;
}

function isWithinLastDays(isoValue, days) {
  if (!isoValue) {
    return false;
  }

  const cutoff = subtractDays(new Date(), days);
  return new Date(isoValue).getTime() >= cutoff.getTime();
}

function buildGoalState(current, target) {
  const numericTarget = Number(target);
  const safeTarget = Number.isFinite(numericTarget) ? Math.max(0, numericTarget) : 0;
  const safeCurrent = Math.max(0, Number(current || 0));
  const percent = safeTarget === 0 ? 100 : clampNumber(Math.round((safeCurrent / safeTarget) * 100), 0, 100);

  return {
    current: safeCurrent,
    target: safeTarget,
    remaining: Math.max(0, safeTarget - safeCurrent),
    percent,
    complete: safeCurrent >= safeTarget
  };
}

export function calculateGoalProgress(sessions = [], goalSettings = {}) {
  const normalizedGoals = normalizeGoalSettings(goalSettings);
  const weeklyCompletedSessions = sessions.filter((session) => session.completed && isWithinLastDays(session.completedAt || session.startedAt, 7));
  const weeklyBrushingSessions = weeklyCompletedSessions.filter((session) => session.sessionType === "brushing").length;
  const weeklySupportRoutines = weeklyCompletedSessions.filter((session) => session.sessionType && session.sessionType !== "brushing").length;

  return {
    settings: normalizedGoals,
    weeklyBrushing: buildGoalState(weeklyBrushingSessions, normalizedGoals.weeklyBrushingSessions),
    weeklySupport: buildGoalState(weeklySupportRoutines, normalizedGoals.weeklySupportRoutines),
    summary: {
      allComplete: weeklyBrushingSessions >= normalizedGoals.weeklyBrushingSessions && weeklySupportRoutines >= normalizedGoals.weeklySupportRoutines,
      nextFocus: weeklyBrushingSessions >= normalizedGoals.weeklyBrushingSessions
        ? "support"
        : weeklySupportRoutines >= normalizedGoals.weeklySupportRoutines
          ? "brushing"
          : weeklyBrushingSessions <= weeklySupportRoutines
            ? "brushing"
            : "support"
    }
  };
}

function countCompletedSessionsWithinDays(sessions = [], days, sessionType) {
  return sessions.filter((session) => {
    if (!session.completed || !isWithinLastDays(session.completedAt || session.startedAt, days)) {
      return false;
    }

    if (sessionType && session.sessionType !== sessionType) {
      return false;
    }

    return true;
  }).length;
}

function getRecentStageTransition(toothHistory = []) {
  return toothHistory.find((entry) => entry.eventType === "stage-changed" && isWithinLastDays(entry.recordedAt, 30)) || null;
}

function buildNudgePriority(priority, key, values = {}) {
  return { priority, key, values };
}

export function calculateCaregiverNudges(sessions = [], progressionSummary, goalProgress) {
  const nudges = [];
  const brushingLastTwoDays = countCompletedSessionsWithinDays(sessions, 2, "brushing");
  const supportLastSevenDays = countCompletedSessionsWithinDays(sessions, 7) - countCompletedSessionsWithinDays(sessions, 7, "brushing");
  const recentStageTransition = getRecentStageTransition(progressionSummary?.snapshot?.toothHistory || []);

  if (goalProgress?.weeklyBrushing && !goalProgress.weeklyBrushing.complete) {
    nudges.push(buildNudgePriority(1, "weeklyBrushing", {
      remaining: goalProgress.weeklyBrushing.remaining,
      target: goalProgress.weeklyBrushing.target,
      current: goalProgress.weeklyBrushing.current
    }));
  }

  if (goalProgress?.weeklySupport && !goalProgress.weeklySupport.complete) {
    nudges.push(buildNudgePriority(2, "weeklySupport", {
      remaining: goalProgress.weeklySupport.remaining,
      target: goalProgress.weeklySupport.target,
      current: goalProgress.weeklySupport.current
    }));
  }

  if (brushingLastTwoDays === 0 && progressionSummary?.snapshot?.completedSessions?.length > 0) {
    nudges.push(buildNudgePriority(3, "restartMomentum", {
      streak: progressionSummary.snapshot.streakDays
    }));
  }

  if (recentStageTransition) {
    nudges.push(buildNudgePriority(4, "stageTransition", {
      previousStage: recentStageTransition.previousToothStage || "unknown",
      newStage: recentStageTransition.newToothStage || "unknown"
    }));
  }

  if (supportLastSevenDays === 0 && progressionSummary?.caregiverSummary?.routineCoverage?.missingTypes?.length > 0) {
    nudges.push(buildNudgePriority(5, "routineVariety", {
      missingCount: progressionSummary.caregiverSummary.routineCoverage.missingTypes.length
    }));
  }

  if (progressionSummary?.nextAchievement?.progress?.remaining > 0) {
    nudges.push(buildNudgePriority(6, "nextAchievement", {
      achievementType: progressionSummary.nextAchievement.achievementType,
      remaining: progressionSummary.nextAchievement.progress.remaining,
      target: progressionSummary.nextAchievement.progress.target,
      measure: progressionSummary.nextAchievement.progress.measure
    }));
  }

  if (goalProgress?.summary?.allComplete) {
    nudges.unshift(buildNudgePriority(0, "goalsComplete", {
      brushing: goalProgress.weeklyBrushing.target,
      support: goalProgress.weeklySupport.target
    }));
  }

  return nudges
    .sort((left, right) => left.priority - right.priority)
    .slice(0, 3);
}

const DEFAULT_PROGRESSION_PROFILE = buildProgressionProfile();

export const ACHIEVEMENT_RULES = [
  {
    type: "first-session",
    title: "First session complete",
    description: "Finished the first tracked routine.",
    tier: "bronze",
    category: "consistency",
    pointsAwarded: 40,
    getProgress: ({ completedSessions }) => ({
      measure: "completedSessions",
      current: completedSessions.length,
      target: 1
    }),
    predicate: ({ completedSessions }) => completedSessions.length >= 1
  },
  {
    type: "streak-3",
    title: "Three day streak",
    description: "Completed routines across three consecutive days.",
    tier: "bronze",
    category: "streak",
    pointsAwarded: 55,
    getProgress: ({ streakDays }) => ({
      measure: "streakDays",
      current: streakDays,
      target: 3
    }),
    predicate: ({ streakDays }) => streakDays >= 3
  },
  {
    type: "streak-7",
    title: "Seven day streak",
    description: "Stayed consistent for a full week.",
    tier: "silver",
    category: "streak",
    pointsAwarded: 85,
    getProgress: ({ streakDays }) => ({
      measure: "streakDays",
      current: streakDays,
      target: 7
    }),
    predicate: ({ streakDays }) => streakDays >= 7
  },
  {
    type: "streak-14",
    title: "Two week streak",
    description: "Held the routine together for two full weeks.",
    tier: "gold",
    category: "streak",
    pointsAwarded: 120,
    getProgress: ({ streakDays }) => ({
      measure: "streakDays",
      current: streakDays,
      target: 14
    }),
    predicate: ({ streakDays }) => streakDays >= 14
  },
  {
    type: "ten-sessions",
    title: "Ten sessions tracked",
    description: "Logged ten completed routines.",
    tier: "silver",
    category: "volume",
    pointsAwarded: 75,
    getProgress: ({ completedSessions }) => ({
      measure: "completedSessions",
      current: completedSessions.length,
      target: 10
    }),
    predicate: ({ completedSessions }) => completedSessions.length >= 10
  },
  {
    type: "twenty-sessions",
    title: "Twenty sessions tracked",
    description: "Built a deeper history with twenty completed routines.",
    tier: "gold",
    category: "volume",
    pointsAwarded: 110,
    getProgress: ({ completedSessions }) => ({
      measure: "completedSessions",
      current: completedSessions.length,
      target: 20
    }),
    predicate: ({ completedSessions }) => completedSessions.length >= 20
  },
  {
    type: "routine-mix",
    title: "Routine mix champion",
    description: "Completed brushing, flossing, and water-picking routines.",
    tier: "silver",
    category: "variety",
    pointsAwarded: 80,
    getProgress: ({ distinctRoutineTypes }, profile = DEFAULT_PROGRESSION_PROFILE) => ({
      measure: "distinctRoutineTypes",
      current: distinctRoutineTypes.length,
      target: profile.routineTypes.length
    }),
    predicate: ({ distinctRoutineTypes }, profile = DEFAULT_PROGRESSION_PROFILE) => profile.routineTypes.every((routineType) => distinctRoutineTypes.includes(routineType))
  },
  {
    type: "stage-transition",
    title: "Growth milestone",
    description: "Reached a new dental development stage.",
    tier: "silver",
    category: "development",
    pointsAwarded: 70,
    getProgress: ({ stageTransitions }) => ({
      measure: "stageTransitions",
      current: stageTransitions,
      target: 1
    }),
    predicate: ({ stageTransitions }) => stageTransitions >= 1
  }
];

export function buildSessionStreak(sessions) {
  const uniqueDays = [...new Set((sessions || [])
    .map((session) => String(session.completedAt || session.startedAt || "").slice(0, 10))
    .filter(Boolean))].sort((left, right) => right.localeCompare(left));

  if (uniqueDays.length === 0) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date(`${uniqueDays[0]}T00:00:00Z`);

  for (const day of uniqueDays) {
    const currentDay = new Date(`${day}T00:00:00Z`);
    if (streak === 0) {
      streak = 1;
      cursor = currentDay;
      continue;
    }

    const expectedPreviousDay = new Date(cursor);
    expectedPreviousDay.setUTCDate(expectedPreviousDay.getUTCDate() - 1);

    if (currentDay.getTime() === expectedPreviousDay.getTime()) {
      streak += 1;
      cursor = currentDay;
      continue;
    }

    break;
  }

  return streak;
}

function getAchievementRule(type) {
  return ACHIEVEMENT_RULES.find((rule) => rule.type === type) || null;
}

function buildRewardSnapshot(sessions = [], toothHistory = []) {
  const completedSessions = sessions.filter((session) => session.completed);
  const distinctRoutineTypes = [...new Set(completedSessions.map((session) => session.sessionType).filter(Boolean))];

  return {
    completedSessions,
    completedBrushingSessions: completedSessions.filter((session) => session.sessionType === "brushing"),
    completedSupportSessions: completedSessions.filter((session) => session.sessionType && session.sessionType !== "brushing"),
    distinctRoutineTypes,
    streakDays: buildSessionStreak(completedSessions),
    toothHistory,
    stageTransitions: toothHistory.filter((entry) => entry.eventType === "stage-changed").length
  };
}

function decorateAchievement(achievement) {
  const rule = getAchievementRule(achievement?.achievementType);

  return {
    ...achievement,
    tier: achievement?.tier || rule?.tier || "bronze",
    category: achievement?.category || rule?.category || "consistency",
    pointsAwarded: Number(achievement?.pointsAwarded || rule?.pointsAwarded || DEFAULT_PROGRESSION_PROFILE.points.achievementFallback)
  };
}

export function decorateAchievements(achievements = []) {
  return achievements.map((achievement) => decorateAchievement(achievement));
}

function deriveLevel(points, profile = DEFAULT_PROGRESSION_PROFILE) {
  const thresholds = profile.levelThresholds;
  let currentIndex = 0;

  for (let index = 0; index < thresholds.length; index += 1) {
    if (points >= thresholds[index]) {
      currentIndex = index;
    } else {
      break;
    }
  }

  const previousLevelPoints = thresholds[currentIndex] || 0;
  const nextLevelPoints = thresholds[currentIndex + 1] || (previousLevelPoints + profile.rewardSettings.levelStepPoints + profile.rewardSettings.levelGrowthPoints * currentIndex);
  const currentLevel = currentIndex + 1;
  const levelSpan = Math.max(1, nextLevelPoints - previousLevelPoints);
  const progressPercent = clampNumber(Math.round(((points - previousLevelPoints) / levelSpan) * 100), 0, 100);

  return {
    currentLevel,
    previousLevelPoints,
    nextLevelPoints,
    pointsToNextLevel: Math.max(0, nextLevelPoints - points),
    progressPercent
  };
}

function buildProgressState(rule, snapshot, profile) {
  const progress = rule.getProgress(snapshot, profile);
  const safeCurrent = Math.max(0, Number(progress.current || 0));
  const safeTarget = Math.max(1, Number(progress.target || 1));

  return {
    measure: progress.measure,
    current: safeCurrent,
    target: safeTarget,
    remaining: Math.max(0, safeTarget - safeCurrent),
    percent: clampNumber(Math.round((safeCurrent / safeTarget) * 100), 0, 100)
  };
}

function selectNextAchievement(snapshot, achievements, profile) {
  const existingTypes = new Set(achievements.map((achievement) => achievement.achievementType));

  const candidates = ACHIEVEMENT_RULES
    .filter((rule) => !existingTypes.has(rule.type))
    .map((rule, index) => ({
      index,
      achievementType: rule.type,
      tier: rule.tier,
      category: rule.category,
      pointsAwarded: rule.pointsAwarded,
      progress: buildProgressState(rule, snapshot, profile)
    }))
    .sort((left, right) => {
      if (left.progress.remaining !== right.progress.remaining) {
        return left.progress.remaining - right.progress.remaining;
      }

      if (left.progress.percent !== right.progress.percent) {
        return right.progress.percent - left.progress.percent;
      }

      return left.index - right.index;
    });

  return candidates[0] || null;
}

export function calculateProgressionSummary(sessions = [], toothHistory = [], achievements = [], rewardSettings = {}) {
  const profile = buildProgressionProfile(rewardSettings);
  const snapshot = buildRewardSnapshot(sessions, toothHistory);
  const decorated = decorateAchievements(achievements);
  const brushingPoints = snapshot.completedBrushingSessions.length * profile.points.brushingSession;
  const supportRoutinePoints = snapshot.completedSupportSessions.length * profile.points.supportRoutine;
  const toothMilestonePoints = toothHistory.length * profile.points.toothMilestone;
  const routineVarietyPoints = snapshot.distinctRoutineTypes.length * profile.points.routineVarietyPerType;
  const achievementPoints = decorated.reduce((sum, achievement) => sum + Number(achievement.pointsAwarded || 0), 0);
  const points = brushingPoints + supportRoutinePoints + toothMilestonePoints + routineVarietyPoints + achievementPoints;
  const levelState = deriveLevel(points, profile);
  const nextAchievement = selectNextAchievement(snapshot, decorated, profile);
  const tierCounts = decorated.reduce((counts, achievement) => {
    counts[achievement.tier] = (counts[achievement.tier] || 0) + 1;
    return counts;
  }, { bronze: 0, silver: 0, gold: 0 });

  return {
    profile,
    snapshot,
    achievements: decorated,
    points,
    currentLevel: levelState.currentLevel,
    previousLevelPoints: levelState.previousLevelPoints,
    nextLevelPoints: levelState.nextLevelPoints,
    pointsToNextLevel: levelState.pointsToNextLevel,
    progressPercent: levelState.progressPercent,
    pointsBreakdown: [
      { key: "brushing", points: brushingPoints },
      { key: "support", points: supportRoutinePoints },
      { key: "milestones", points: toothMilestonePoints },
      { key: "variety", points: routineVarietyPoints },
      { key: "achievements", points: achievementPoints }
    ],
    nextAchievement,
    caregiverSummary: {
      momentum: snapshot.streakDays >= 7 ? "strong" : snapshot.streakDays >= 3 ? "building" : snapshot.completedSessions.length > 0 ? "starting" : "idle",
      tierCounts,
      routineCoverage: {
        current: snapshot.distinctRoutineTypes.length,
        target: profile.routineTypes.length,
        missingTypes: profile.routineTypes.filter((routineType) => !snapshot.distinctRoutineTypes.includes(routineType))
      },
      latestToothMilestone: toothHistory[0] || null,
      nextAchievement
    }
  };
}

export function getAchievementPresentation(achievement) {
  return decorateAchievement(achievement);
}