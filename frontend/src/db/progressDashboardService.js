import { getSessionsByUser, getToothHistoryByUser } from "./storeHelpers";

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

function subtractDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() - days);
  return nextDate;
}

function isWithinRange(isoValue, timeRange) {
  if (!isoValue || timeRange === "all") {
    return true;
  }

  const now = new Date();
  const valueDate = new Date(isoValue);
  const cutoff = timeRange === "7d" ? subtractDays(now, 7) : subtractDays(now, 30);
  return valueDate.getTime() >= cutoff.getTime();
}

function normalizeToothEventLabel(eventType) {
  if (eventType === "tooth-added" || eventType === "tooth-lost" || eventType === "stage-changed") {
    return eventType;
  }

  return "manual-adjustment";
}

export async function loadUserProgressDashboard(userId, filters = { timeRange: "30d", activityType: "all" }) {
  if (!userId) {
    return null;
  }

  const [allSessions, allToothHistory] = await Promise.all([
    getSessionsByUser(userId),
    getToothHistoryByUser(userId)
  ]);

  const filteredSessions = allSessions.filter((session) => {
    if (!isWithinRange(session.completedAt || session.startedAt, filters.timeRange)) {
      return false;
    }

    if (filters.activityType !== "all" && session.sessionType !== filters.activityType) {
      return false;
    }

    return true;
  });

  const filteredToothHistory = allToothHistory.filter((entry) => isWithinRange(entry.recordedAt, filters.timeRange));
  const completedSessions = filteredSessions.filter((session) => session.completed);
  const weeklySessions = allSessions.filter((session) => isWithinRange(session.completedAt || session.startedAt, "7d") && session.completed);
  const monthlySessions = allSessions.filter((session) => isWithinRange(session.completedAt || session.startedAt, "30d") && session.completed);

  return {
    filters,
    totals: {
      totalSessions: filteredSessions.length,
      completedSessions: completedSessions.length,
      completionRate: filteredSessions.length > 0 ? Math.round((completedSessions.length / filteredSessions.length) * 100) : 0,
      streakDays: buildStreak(allSessions.filter((session) => session.completed)),
      weeklySessions: weeklySessions.length,
      monthlySessions: monthlySessions.length
    },
    recentSessions: filteredSessions.slice(0, 8),
    toothMilestones: filteredToothHistory.slice(0, 6).map((entry) => ({
      ...entry,
      label: normalizeToothEventLabel(entry.eventType)
    }))
  };
}