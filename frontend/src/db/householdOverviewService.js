import { getHousehold, getRecentSessionsByUser, getToothHistoryByUser, getUsersByHousehold, setActiveUser } from "./storeHelpers";

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

export async function loadHouseholdOverview(householdId) {
  const household = await getHousehold(householdId);
  if (!household?.householdId) {
    return null;
  }

  const users = await getUsersByHousehold(household.householdId);
  const members = await Promise.all(
    users.map(async (user) => {
      const [sessions, toothHistory] = await Promise.all([
        getRecentSessionsByUser(user.userId, 30),
        getToothHistoryByUser(user.userId)
      ]);
      const latestSession = sessions[0] || null;
      const latestToothChange = toothHistory[0] || null;

      return {
        ...user,
        totalSessions: sessions.length,
        streakDays: buildStreak(sessions),
        lastActivityAt: latestSession?.completedAt || latestSession?.startedAt || latestToothChange?.recordedAt || null,
        lastSongTitle: latestSession?.songTitle || null
      };
    })
  );

  return {
    household,
    members,
    activeUserId: household.activeUserId || members.find((member) => member.isActive)?.userId || null
  };
}

export async function switchActiveHouseholdUser(householdId, userId) {
  await setActiveUser(userId, householdId);
  return loadHouseholdOverview(householdId);
}