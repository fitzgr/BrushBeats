import {
  createAchievement,
  createBrushingSession,
  createHousehold,
  createUser,
  getHousehold,
  getRecentSessionsByUser,
  getUserById,
  logToothChange,
  setActiveUser
} from "./storeHelpers";

export async function createExampleHouseholdAndFirstUser() {
  const household = await createHousehold({
    householdName: "Brush Beats Family",
    migrationSource: "phase-1-example"
  });

  const user = await createUser({
    householdId: household.householdId,
    name: "First Brusher",
    toothStage: "mixed",
    topTeethCount: 10,
    bottomTeethCount: 10,
    isActive: true
  });

  await setActiveUser(user.userId, household.householdId);
  return { household, user };
}

export async function logExampleToothDevelopment(user) {
  return logToothChange({
    householdId: user.householdId,
    userId: user.userId,
    eventType: "tooth-added",
    previousTopTeethCount: user.topTeethCount,
    previousBottomTeethCount: user.bottomTeethCount,
    newTopTeethCount: user.topTeethCount + 1,
    newBottomTeethCount: user.bottomTeethCount,
    previousToothStage: user.toothStage,
    newToothStage: user.toothStage,
    reason: "example-eruption-event"
  });
}

export async function saveExampleBrushingSession(user) {
  const session = await createBrushingSession({
    householdId: user.householdId,
    userId: user.userId,
    sessionType: "brushing",
    durationSeconds: 120,
    targetDurationSeconds: 120,
    songTitle: "Brush Beats Example Song",
    artistName: "Brush Beats",
    bpmUsed: 118,
    topTeethCount: user.topTeethCount,
    bottomTeethCount: user.bottomTeethCount,
    completed: true,
    completedAt: new Date().toISOString(),
    performanceRating: "great"
  });

  await createAchievement({
    householdId: user.householdId,
    userId: user.userId,
    achievementType: "first-session",
    title: "First Session Logged",
    description: "Example achievement created from a completed brushing session.",
    relatedSessionId: session.sessionId,
    progressValue: 1
  });

  return session;
}

export async function readActiveUserAndRecentHistory() {
  const household = await getHousehold();
  if (!household?.activeUserId) {
    return { household, activeUser: null, recentSessions: [] };
  }

  const activeUser = await getUserById(household.activeUserId);
  const recentSessions = await getRecentSessionsByUser(household.activeUserId, 5);
  return { household, activeUser, recentSessions };
}