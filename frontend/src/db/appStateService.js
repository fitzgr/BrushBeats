import { getDB, STORE_NAMES, waitForTransaction } from "./indexedDbService";
import { getHousehold, getAppSetting, getUserById, getUsersByHousehold } from "./storeHelpers";

async function resolveActiveUser(household) {
  if (!household?.householdId) {
    return null;
  }

  if (household.activeUserId) {
    const activeUser = await getUserById(household.activeUserId);
    if (activeUser) {
      return activeUser;
    }
  }

  const householdUsers = await getUsersByHousehold(household.householdId);
  return householdUsers.find((item) => item.isActive) || householdUsers[0] || null;
}

export async function loadPersistedAppState(fallbackState = {}) {
  const household = await getHousehold();
  const activeUser = await resolveActiveUser(household);
  const [
    storageConsent,
    storageBannerDismissed,
    legacyPreferences,
    legacyLastSession,
    legacyFavoriteSongs,
    migrationState,
    onboardingState,
    onboardingUiState,
    onboardingDraft,
    userDefaults
  ] = await Promise.all([
    getAppSetting("legacy.storageConsent"),
    getAppSetting("legacy.storageBannerDismissed"),
    getAppSetting("legacy.preferences"),
    getAppSetting("legacy.lastSession"),
    getAppSetting("legacy.favoriteSongs"),
    getAppSetting("system.phase2LegacyMigration"),
    getAppSetting("system.householdOnboarding"),
    getAppSetting("system.householdOnboardingUi"),
    getAppSetting("system.householdOnboardingDraft"),
    getAppSetting("user.defaults")
  ]);

  return {
    storageConsent: storageConsent?.value || fallbackState.storageConsent || "unknown",
    storageBannerDismissed: storageBannerDismissed?.value ?? fallbackState.storageBannerDismissed ?? false,
    preferences: legacyPreferences?.value || fallbackState.preferences || null,
    lastSession: legacyLastSession?.value || fallbackState.lastSession || null,
    favoriteSongs: Array.isArray(legacyFavoriteSongs?.value)
      ? legacyFavoriteSongs.value
      : Array.isArray(fallbackState.favoriteSongs)
        ? fallbackState.favoriteSongs
        : [],
    household,
    activeUser,
    migrationState: migrationState?.value || null,
    onboardingState: onboardingState?.value || null,
    onboardingUiState: onboardingUiState?.value || null,
    onboardingDraft: onboardingDraft?.value || null,
    userDefaults: userDefaults?.value || null
  };
}

export async function clearPersistedPhase2Data() {
  const db = await getDB();
  const storeNames = Object.values(STORE_NAMES);
  const transaction = db.transaction(storeNames, "readwrite");

  storeNames.forEach((storeName) => {
    transaction.objectStore(storeName).clear();
  });

  await waitForTransaction(transaction);
  return true;
}