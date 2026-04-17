import { estimateAgeFromTeethFull } from "../lib/teethAge";
import { trySyncHouseholdSnapshot } from "./householdSyncService";
import { normalizeGoalSettings, normalizeRewardSettings } from "./rewardProgressionService";
import { STORE_NAMES } from "./indexedDbService";
import { deleteItem, getAchievementsByUser, getHousehold, getToothHistoryByUser, getUsersByHousehold, setActiveUser, updateHousehold, createUser, updateUser, getSessionsByUser, getUserById } from "./storeHelpers";
import { getUserScopedState, saveUserScopedDefaults } from "./userScopedStateService";

const DEFAULT_SCOPED_FILTERS = {
  tolerance: 4,
  danceability: 50,
  acousticness: 50
};

function buildStageFromCounts(topTeethCount, bottomTeethCount) {
  return estimateAgeFromTeethFull(Number(topTeethCount || 0) + Number(bottomTeethCount || 0))?.phase || "unknown";
}

function normalizeScopedFilters(filters) {
  if (!filters || typeof filters !== "object") {
    return { ...DEFAULT_SCOPED_FILTERS };
  }

  return {
    tolerance: Number.isFinite(Number(filters.tolerance)) ? Number(filters.tolerance) : DEFAULT_SCOPED_FILTERS.tolerance,
    danceability: Number.isFinite(Number(filters.danceability)) ? Number(filters.danceability) : DEFAULT_SCOPED_FILTERS.danceability,
    acousticness: Number.isFinite(Number(filters.acousticness)) ? Number(filters.acousticness) : DEFAULT_SCOPED_FILTERS.acousticness
  };
}

function buildDefaultScopedState(member, existingDefaults = {}) {
  const topTeethCount = Number(member.topTeethCount ?? existingDefaults.values?.top ?? 0);
  const bottomTeethCount = Number(member.bottomTeethCount ?? existingDefaults.values?.bottom ?? 0);

  return {
    values: {
      top: topTeethCount,
      bottom: bottomTeethCount
    },
    filters: normalizeScopedFilters(member.filters || existingDefaults.filters),
    keyword: member.keyword ?? existingDefaults.keyword ?? "",
    brushingHand: member.brushingHand || existingDefaults.brushingHand || "right",
    brushType: member.brushType || existingDefaults.brushType || "manual",
    brushDurationSeconds: Number(member.brushDurationSeconds || existingDefaults.brushDurationSeconds || 120),
    preferredLanguage: member.preferredLanguage || existingDefaults.preferredLanguage || "en",
    savedAt: Date.now()
  };
}

async function hydrateMember(user) {
  const scopedState = await getUserScopedState(user.userId, {});
  return {
    ...user,
    preferredLanguage: scopedState.defaults?.preferredLanguage || "en",
    brushingHand: scopedState.defaults?.brushingHand || "right",
    brushType: scopedState.defaults?.brushType || "manual",
    brushDurationSeconds: Number(scopedState.defaults?.brushDurationSeconds || 120),
    keyword: scopedState.defaults?.keyword || "",
    filters: normalizeScopedFilters(scopedState.defaults?.filters),
    values: scopedState.defaults?.values || {
      top: Number(user.topTeethCount || 0),
      bottom: Number(user.bottomTeethCount || 0)
    }
  };
}

export async function loadHouseholdManagement(householdId) {
  const household = await getHousehold(householdId);
  if (!household?.householdId) {
    return null;
  }

  const users = await getUsersByHousehold(household.householdId);
  const hydratedMembers = await Promise.all(users.map(hydrateMember));

  return {
    household: {
      ...household,
      rewardSettings: normalizeRewardSettings(household.rewardSettings),
      goalSettings: normalizeGoalSettings(household.goalSettings)
    },
    members: hydratedMembers.filter((member) => !member.isArchived && !member.isDeleted),
    archivedMembers: hydratedMembers.filter((member) => member.isArchived && !member.isDeleted)
  };
}

export async function saveHouseholdSettings(householdId, updates = {}) {
  const updatedHousehold = await updateHousehold(householdId, {
    ...updates,
    rewardSettings: normalizeRewardSettings(updates.rewardSettings),
    goalSettings: normalizeGoalSettings(updates.goalSettings)
  });

  await trySyncHouseholdSnapshot(householdId);
  return getHousehold(updatedHousehold.householdId);
}

export async function saveHouseholdMember(householdId, input = {}) {
  const topTeethCount = Number(input.topTeethCount || 0);
  const bottomTeethCount = Number(input.bottomTeethCount || 0);
  const memberPayload = {
    name: input.name?.trim() || "Household Member",
    topTeethCount,
    bottomTeethCount,
    totalTeethCount: topTeethCount + bottomTeethCount,
    toothStage: buildStageFromCounts(topTeethCount, bottomTeethCount),
    isArchived: false
  };

  const member = input.userId
    ? await updateUser(input.userId, memberPayload)
    : await createUser({ householdId, ...memberPayload, isActive: false });

  const scopedState = await getUserScopedState(member.userId, {});

  await saveUserScopedDefaults(member.userId, buildDefaultScopedState({
    ...member,
    preferredLanguage: input.preferredLanguage,
    brushingHand: input.brushingHand,
    brushType: input.brushType,
    brushDurationSeconds: input.brushDurationSeconds,
    keyword: input.keyword,
    filters: input.filters
  }, scopedState.defaults));

  await trySyncHouseholdSnapshot(householdId);
  return hydrateMember(member);
}

export async function archiveHouseholdMember(householdId, userId) {
  const management = await loadHouseholdManagement(householdId);
  const activeMembers = management?.members || [];
  const target = activeMembers.find((member) => member.userId === userId);
  if (!target) {
    throw new Error("Member not found.");
  }

  if (activeMembers.length <= 1) {
    throw new Error("At least one active household member is required.");
  }

  await updateUser(userId, { isArchived: true, isActive: false });

  if (management.household.activeUserId === userId) {
    const nextActive = activeMembers.find((member) => member.userId !== userId);
    if (nextActive) {
      await setActiveUser(nextActive.userId, householdId);
    }
  }

  await trySyncHouseholdSnapshot(householdId);
  return loadHouseholdManagement(householdId);
}

export async function restoreHouseholdMember(householdId, userId) {
  await updateUser(userId, { isArchived: false });
  await trySyncHouseholdSnapshot(householdId);
  return loadHouseholdManagement(householdId);
}

export async function removeHouseholdMember(householdId, userId) {
  const [user, sessions, toothHistory, achievements, management] = await Promise.all([
    getUserById(userId),
    getSessionsByUser(userId),
    getToothHistoryByUser(userId),
    getAchievementsByUser(userId),
    loadHouseholdManagement(householdId)
  ]);

  if (!user || user.householdId !== householdId) {
    throw new Error("Member not found.");
  }

  if ((management?.members?.length || 0) <= 1 && !user.isArchived) {
    throw new Error("At least one active household member is required.");
  }

  if (sessions.length > 0 || toothHistory.length > 0 || achievements.length > 0) {
    throw new Error("Members with saved history must be archived instead of removed.");
  }

  if (management?.household?.activeUserId === userId) {
    const nextActive = management.members.find((member) => member.userId !== userId);
    if (nextActive) {
      await setActiveUser(nextActive.userId, householdId);
    }
  }

  await deleteItem(STORE_NAMES.users, userId);
  await trySyncHouseholdSnapshot(householdId);
  return loadHouseholdManagement(householdId);
}