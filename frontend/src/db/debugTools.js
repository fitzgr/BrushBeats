import { deleteDatabase, getStoreDefinitions, STORE_NAMES } from "./indexedDbService";
import { deleteItem, getAllItems } from "./storeHelpers";

export async function inspectStore(storeName) {
  if (!Object.values(STORE_NAMES).includes(storeName)) {
    throw new Error(`Unknown BrushBeats store: ${storeName}`);
  }

  return getAllItems(storeName);
}

export async function dumpDatabase() {
  const dump = {};

  for (const definition of getStoreDefinitions()) {
    dump[definition.name] = await getAllItems(definition.name);
  }

  return dump;
}

export async function clearStore(storeName) {
  const items = await inspectStore(storeName);

  await Promise.all(
    items.map((item) => {
      const keyField =
        storeName === STORE_NAMES.household
          ? "householdId"
          : storeName === STORE_NAMES.users
            ? "userId"
            : storeName === STORE_NAMES.toothHistory
              ? "toothHistoryId"
              : storeName === STORE_NAMES.brushingSessions
                ? "sessionId"
                : storeName === STORE_NAMES.achievements
                  ? "achievementId"
                  : storeName === STORE_NAMES.migrationLog
                    ? "migrationId"
                    : "settingKey";

      return deleteItem(storeName, item[keyField]);
    })
  );

  return true;
}

export async function resetDatabase(confirmReset = false) {
  if (!confirmReset) {
    throw new Error("Pass true to resetDatabase(true) to confirm a destructive local reset.");
  }

  return deleteDatabase();
}

export function installDebugTools() {
  if (typeof window === "undefined") {
    return;
  }

  window.__brushbeatsDB = {
    inspectStore,
    dumpDatabase,
    clearStore,
    resetDatabase,
    getStoreDefinitions
  };

  console.info("[BrushBeats DB] Debug tools available on window.__brushbeatsDB");
}