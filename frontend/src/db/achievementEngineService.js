import { createAchievement, getAchievementsByUser, getSessionsByUser, getToothHistoryByUser } from "./storeHelpers";

const ACHIEVEMENT_RULES = [
  {
    type: "first-session",
    title: "First session complete",
    description: "Finished the first tracked routine.",
    progressValue: 1,
    predicate: ({ completedSessions }) => completedSessions.length >= 1
  },
  {
    type: "streak-3",
    title: "Three day streak",
    description: "Completed routines across three consecutive days.",
    progressValue: 3,
    predicate: ({ streakDays }) => streakDays >= 3
  },
  {
    type: "streak-7",
    title: "Seven day streak",
    description: "Completed routines across seven consecutive days.",
    progressValue: 7,
    predicate: ({ streakDays }) => streakDays >= 7
  },
  {
    type: "ten-sessions",
    title: "Ten sessions tracked",
    description: "Logged ten completed routines.",
    progressValue: 10,
    predicate: ({ completedSessions }) => completedSessions.length >= 10
  },
  {
    type: "routine-mix",
    title: "Routine mix champion",
    description: "Completed brushing, flossing, and water-picking routines.",
    progressValue: 3,
    predicate: ({ distinctRoutineTypes }) => distinctRoutineTypes.includes("brushing") && distinctRoutineTypes.includes("flossing") && distinctRoutineTypes.includes("water-picking")
  },
  {
    type: "stage-transition",
    title: "Growth milestone",
    description: "Reached a new developmental tooth stage.",
    progressValue: 1,
    predicate: ({ toothHistory }) => toothHistory.some((entry) => entry.eventType === "stage-changed")
  }
];

function buildStreak(sessions) {
  const uniqueDays = [...new Set((sessions || []).map((session) => String(session.completedAt || session.startedAt || "").slice(0, 10)).filter(Boolean))];
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
  const streakDays = buildStreak(completedSessions);
  const distinctRoutineTypes = [...new Set(completedSessions.map((session) => session.sessionType).filter(Boolean))];
  const existingTypes = new Set(existingAchievements.map((achievement) => achievement.achievementType));

  const newlyAwarded = [];

  for (const rule of ACHIEVEMENT_RULES) {
    if (existingTypes.has(rule.type)) {
      continue;
    }

    if (!rule.predicate({ completedSessions, streakDays, toothHistory, distinctRoutineTypes })) {
      continue;
    }

    const achievement = await createAchievement({
      userId,
      householdId,
      achievementType: rule.type,
      title: rule.title,
      description: rule.description,
      relatedSessionId: context.relatedSessionId || null,
      progressValue: rule.progressValue,
      isSeen: false
    });

    newlyAwarded.push(achievement);
    existingTypes.add(rule.type);
  }

  return newlyAwarded;
}