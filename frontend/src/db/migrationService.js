import { estimateAgeFromTeethFull } from "../lib/teethAge";
import { clearLegacyCookieMirrors, getLegacyStorageSnapshot } from "../lib/storagePreference";
import { createPrefixedId, nowIso } from "./indexedDbService";
import {
  createBrushingSession,
  createHousehold,
  createUser,
  getAppSetting,
  getHousehold,
  getUsersByHousehold,
  logMigration,
  logToothChange,
  setActiveUser,
  setAppSetting
} from "./storeHelpers";

const LEGACY_MIGRATION_TYPE = "legacy-storage-import";
const LEGACY_MIGRATION_SETTING_KEY = "system.phase2LegacyMigration";
const LEGACY_FINGERPRINT_SETTING_KEY = "system.phase2LegacyFingerprint";
const HOUSEHOLD_BOOTSTRAP_SETTING_KEY = "system.phase2HouseholdBootstrap";

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `legacy_${Math.abs(hash)}`;
}

function buildLegacyFingerprint(snapshot) {
  return hashString(JSON.stringify(snapshot.rawValues || {}));
}

function resolveToothSnapshot(snapshot) {
  const topTeethCount = Number(snapshot?.preferences?.values?.top ?? snapshot?.lastSession?.values?.top ?? 16);
  const bottomTeethCount = Number(snapshot?.preferences?.values?.bottom ?? snapshot?.lastSession?.values?.bottom ?? 16);
  const totalTeethCount = topTeethCount + bottomTeethCount;
  const ageEstimate = snapshot?.lastSession?.bpmSnapshot?.ageEstimate || estimateAgeFromTeethFull(totalTeethCount);

  return {
    topTeethCount,
    bottomTeethCount,
    totalTeethCount,
    toothStage: ageEstimate?.phase || "unknown",
    ageGroup: ageEstimate?.phase || "unknown"
  };
}

async function ensureDefaultHouseholdAndUser() {
  const existingHousehold = await getHousehold();
  if (existingHousehold) {
    const existingUsers = await getUsersByHousehold(existingHousehold.householdId);

    if (existingUsers.length > 0) {
      return {
        action: "existing",
        household: existingHousehold,
        users: existingUsers
      };
    }

    const user = await createUser({
      householdId: existingHousehold.householdId,
      name: "Primary Brusher",
      isActive: true,
      toothStage: "adult",
      ageGroup: "adult",
      topTeethCount: 16,
      bottomTeethCount: 16,
      totalTeethCount: 32
    });

    await setActiveUser(user.userId, existingHousehold.householdId);
    await setAppSetting(HOUSEHOLD_BOOTSTRAP_SETTING_KEY, {
      createdAt: nowIso(),
      householdId: existingHousehold.householdId,
      userId: user.userId
    });

    return {
      action: "bootstrapped",
      household: existingHousehold,
      users: [user]
    };
  }

  const household = await createHousehold({
    householdName: "BrushBeats Household",
    migrationSource: "phase-2-bootstrap"
  });

  const user = await createUser({
    householdId: household.householdId,
    name: "Primary Brusher",
    isActive: true,
    toothStage: "adult",
    ageGroup: "adult",
    topTeethCount: 16,
    bottomTeethCount: 16,
    totalTeethCount: 32
  });

  await setActiveUser(user.userId, household.householdId);
  await setAppSetting(HOUSEHOLD_BOOTSTRAP_SETTING_KEY, {
    createdAt: nowIso(),
    householdId: household.householdId,
    userId: user.userId
  });

  return {
    action: "bootstrapped",
    household,
    users: [user]
  };
}

async function persistLegacySettings(snapshot, householdId, userId, importedAt) {
  await setAppSetting("legacy.storageConsent", snapshot.consentStatus);
  await setAppSetting("legacy.storageBannerDismissed", snapshot.storageBannerDismissed);
  await setAppSetting("legacy.favoriteSongs", snapshot.favoriteSongs || []);
  await setAppSetting("legacy.importedAt", importedAt);

  if (snapshot.preferences) {
    await setAppSetting("legacy.preferences", snapshot.preferences);
    await setAppSetting("user.defaults", {
      householdId,
      userId,
      brushingHand: snapshot.preferences.brushingHand,
      brushType: snapshot.preferences.brushType,
      brushDurationSeconds: snapshot.preferences.brushDurationSeconds,
      keyword: snapshot.preferences.keyword,
      filters: snapshot.preferences.filters
    });
  }

  if (snapshot.lastSession) {
    await setAppSetting("legacy.lastSession", snapshot.lastSession);
  }
}

async function importLegacySnapshot(snapshot) {
  const existingHousehold = await getHousehold();
  const importedAt = nowIso();
  const migrationFingerprint = buildLegacyFingerprint(snapshot);
  const toothSnapshot = resolveToothSnapshot(snapshot);
  const household =
    existingHousehold ||
    (await createHousehold({
      householdName: "Imported BrushBeats Household",
      migrationSource: "legacy-storage"
    }));

  const user = await createUser({
    householdId: household.householdId,
    name: "Imported Brusher",
    isActive: true,
    ageGroup: toothSnapshot.ageGroup,
    toothStage: toothSnapshot.toothStage,
    topTeethCount: toothSnapshot.topTeethCount,
    bottomTeethCount: toothSnapshot.bottomTeethCount,
    totalTeethCount: toothSnapshot.totalTeethCount
  });

  await setActiveUser(user.userId, household.householdId);

  await logToothChange({
    householdId: household.householdId,
    userId: user.userId,
    eventType: "manual-adjustment",
    previousTopTeethCount: null,
    previousBottomTeethCount: null,
    newTopTeethCount: toothSnapshot.topTeethCount,
    newBottomTeethCount: toothSnapshot.bottomTeethCount,
    previousToothStage: null,
    newToothStage: toothSnapshot.toothStage,
    reason: "legacy-storage-import",
    recordedAt: importedAt
  });

  if (snapshot.lastSession?.song?.title && snapshot.lastSession?.song?.artist) {
    const durationSeconds = Number(snapshot.lastSession.brushDurationSeconds || snapshot.lastSession.bpmSnapshot?.totalBrushingSeconds || 120);

    await createBrushingSession({
      sessionId: createPrefixedId("session"),
      householdId: household.householdId,
      userId: user.userId,
      sessionType: "brushing",
      startedAt: importedAt,
      completedAt: importedAt,
      durationSeconds,
      targetDurationSeconds: durationSeconds,
      songTitle: snapshot.lastSession.song.title,
      artistName: snapshot.lastSession.song.artist,
      bpmUsed: Number(snapshot.lastSession.song.bpm || snapshot.lastSession.bpmSnapshot?.searchBpm || 0),
      topTeethCount: toothSnapshot.topTeethCount,
      bottomTeethCount: toothSnapshot.bottomTeethCount,
      totalTeethCount: toothSnapshot.totalTeethCount,
      completed: true,
      source: "legacy-storage-import",
      notes: "Imported from legacy cookie/localStorage session state."
    });
  }

  await persistLegacySettings(snapshot, household.householdId, user.userId, importedAt);
  await setAppSetting(LEGACY_MIGRATION_SETTING_KEY, {
    completedAt: importedAt,
    householdId: household.householdId,
    userId: user.userId,
    importedFavoriteSongs: snapshot.favoriteSongs?.length || 0
  });
  await setAppSetting(LEGACY_FINGERPRINT_SETTING_KEY, migrationFingerprint);

  const clearedCookieKeys = clearLegacyCookieMirrors();

  return {
    kind: "imported-legacy-storage",
    householdId: household.householdId,
    userId: user.userId,
    importedAt,
    clearedCookieKeys,
    migrationFingerprint
  };
}

export async function initializePhase2Migration() {
  try {
    const snapshot = getLegacyStorageSnapshot();
    const migrationState = await getAppSetting(LEGACY_MIGRATION_SETTING_KEY);

    if (snapshot.hasImportableLegacyData && !migrationState?.value?.completedAt) {
      const fingerprint = buildLegacyFingerprint(snapshot);
      const existingFingerprint = await getAppSetting(LEGACY_FINGERPRINT_SETTING_KEY);
      if (existingFingerprint?.value === fingerprint) {
        return { kind: "no-op" };
      }

      await logMigration({
        migrationType: LEGACY_MIGRATION_TYPE,
        fromVersion: 0,
        toVersion: 1,
        status: "started",
        details: `Importing legacy storage snapshot with fingerprint ${fingerprint}.`,
        ranAt: nowIso()
      });

      const result = await importLegacySnapshot(snapshot);

      await logMigration({
        migrationType: LEGACY_MIGRATION_TYPE,
        fromVersion: 0,
        toVersion: 1,
        status: "completed",
        details: `Legacy storage imported into household ${result.householdId}.`,
        ranAt: nowIso()
      });

      return result;
    }

    const bootstrapResult = await ensureDefaultHouseholdAndUser();
    if (migrationState?.value?.completedAt || !snapshot.hasImportableLegacyData) {
      return bootstrapResult.action === "bootstrapped"
        ? {
            kind: "bootstrapped-household",
            householdId: bootstrapResult.household.householdId,
            userId: bootstrapResult.users[0]?.userId || null
          }
        : {
            kind: "no-op"
          };
    }

    return { kind: "no-op" };
  } catch (error) {
    await logMigration({
      migrationType: LEGACY_MIGRATION_TYPE,
      fromVersion: 0,
      toVersion: 1,
      status: "failed",
      details: error?.message || "Unknown legacy migration failure.",
      ranAt: nowIso()
    }).catch(() => undefined);

    return {
      kind: "migration-failed",
      error: error?.message || "Unknown legacy migration failure"
    };
  }
}
