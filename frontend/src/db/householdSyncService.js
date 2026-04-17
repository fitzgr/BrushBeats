import { nowIso } from "./indexedDbService";
import { syncHouseholdSnapshot as syncHouseholdSnapshotRequest } from "../api/client";
import { getHousehold, getUsersByHousehold, updateHousehold } from "./storeHelpers";
import { getUserScopedState } from "./userScopedStateService";

function normalizeSubscriptionTier(value) {
  return String(value || "free").trim().toLowerCase();
}

export function hasCloudSyncAccess(subscriptionTier) {
  return normalizeSubscriptionTier(subscriptionTier) !== "free";
}

function buildMemberPreferences(defaults) {
  if (!defaults || typeof defaults !== "object") {
    return {};
  }

  return {
    preferredLanguage: defaults.preferredLanguage || "en",
    brushingHand: defaults.brushingHand || "right",
    brushType: defaults.brushType || "manual",
    brushDurationSeconds: Number(defaults.brushDurationSeconds || 120),
    keyword: defaults.keyword || "",
    filters: defaults.filters || {
      tolerance: 4,
      danceability: 50,
      acousticness: 50
    },
    values: defaults.values || {
      top: Number(defaults.topTeethCount || 0),
      bottom: Number(defaults.bottomTeethCount || 0)
    },
    savedAt: defaults.savedAt || Date.now()
  };
}

async function buildSnapshot(householdId) {
  const household = await getHousehold(householdId);
  if (!household?.householdId) {
    return null;
  }

  const users = await getUsersByHousehold(householdId);
  const members = await Promise.all(
    users
      .filter((member) => !member.isDeleted)
      .map(async (member) => {
        const scopedState = await getUserScopedState(member.userId, {});

        return {
          ...member,
          preferences: buildMemberPreferences(scopedState.defaults)
        };
      })
  );

  return {
    household,
    members
  };
}

export async function syncHouseholdSnapshot(householdId) {
  const snapshot = await buildSnapshot(householdId);
  if (!snapshot) {
    return null;
  }

  if (!hasCloudSyncAccess(snapshot.household.subscriptionTier)) {
    await updateHousehold(householdId, {
      syncStatus: "subscriber-required"
    });

    return {
      ok: false,
      skipped: true,
      reason: "subscriber-required"
    };
  }

  const response = await syncHouseholdSnapshotRequest(householdId, snapshot);
  const syncedAt = nowIso();
  await updateHousehold(householdId, {
    syncStatus: response?.household?.syncStatus || "connected",
    lastSyncedAt: syncedAt
  });
  return {
    ...response,
    lastSyncedAt: syncedAt
  };
}

export async function trySyncHouseholdSnapshot(householdId) {
  if (!householdId) {
    return { ok: false, error: new Error("householdId is required") };
  }

  try {
    const response = await syncHouseholdSnapshot(householdId);
    if (response?.skipped) {
      return { ok: false, skipped: true, reason: response.reason, response };
    }

    return { ok: true, response };
  } catch (error) {
    await updateHousehold(householdId, {
      syncStatus: "sync-error"
    });

    return { ok: false, error };
  }
}