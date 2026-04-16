import { ACHIEVEMENT_RULES, buildSessionStreak } from "./rewardProgressionService";
import { createAchievement, getAchievementsByUser, getSessionsByUser, getToothHistoryByUser } from "./storeHelpers";

export async function awardAchievementsForUser(userId, householdId, context = {}) {
  if (!userId || !householdId) {
    return [];
  }

  const [sessions, toothHistory, existingAchievements] = await Promise.all([
    getSessionsByUser(userId),
    getToothHistoryByUser(userId),
    getAchievementsByUser(userId)
  ]);

  const completedSessions = sessions.filter((session) => session.completed);
  const streakDays = buildSessionStreak(completedSessions);
  const stageTransitions = toothHistory.filter((entry) => entry.eventType === "stage-changed").length;
  const distinctRoutineTypes = [...new Set(completedSessions.map((session) => session.sessionType).filter(Boolean))];
  const existingTypes = new Set(existingAchievements.map((achievement) => achievement.achievementType));

  const newlyAwarded = [];

  for (const rule of ACHIEVEMENT_RULES) {
    if (existingTypes.has(rule.type)) {
      continue;
    }

    if (!rule.predicate({ completedSessions, streakDays, toothHistory, distinctRoutineTypes, stageTransitions })) {
      continue;
    }

    const progress = rule.getProgress({ completedSessions, streakDays, toothHistory, distinctRoutineTypes, stageTransitions });
    const achievement = await createAchievement({
      userId,
      householdId,
      achievementType: rule.type,
      title: rule.title,
      description: rule.description,
      relatedSessionId: context.relatedSessionId || null,
      sourceEventType: context.sourceEventType || null,
      sourceEventId: context.sourceEventId || null,
      sourceEventAt: context.sourceEventAt || null,
      sourceContext: context.sourceContext || null,
      progressValue: progress.target,
      tier: rule.tier,
      category: rule.category,
      pointsAwarded: rule.pointsAwarded,
      isSeen: false
    });

    newlyAwarded.push(achievement);
    existingTypes.add(rule.type);
  }

  return newlyAwarded;
}