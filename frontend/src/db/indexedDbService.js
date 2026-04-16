export const DB_NAME = "brushbeatsDB";
export const DB_VERSION = 1;

export const STORE_NAMES = {
  household: "household",
  users: "users",
  toothHistory: "toothHistory",
  brushingSessions: "brushingSessions",
  achievements: "achievements",
  appSettings: "appSettings",
  migrationLog: "migrationLog"
};

const STORE_DEFINITIONS = [
  {
    name: STORE_NAMES.household,
    keyPath: "householdId",
    comment: "Household-level metadata mirrors the future backend household model.",
    indexes: []
  },
  {
    name: STORE_NAMES.users,
    keyPath: "userId",
    comment: "Users are household-scoped and hold stable brushing defaults and developmental context.",
    indexes: [
      { name: "householdId", keyPath: "householdId" },
      { name: "isActive", keyPath: "isActive" },
      { name: "name", keyPath: "name" }
    ]
  },
  {
    name: STORE_NAMES.toothHistory,
    keyPath: "toothHistoryId",
    comment: "Tooth history tracks developmental changes so future milestones can be driven by durable history.",
    indexes: [
      { name: "userId", keyPath: "userId" },
      { name: "householdId", keyPath: "householdId" },
      { name: "eventType", keyPath: "eventType" },
      { name: "recordedAt", keyPath: "recordedAt" }
    ]
  },
  {
    name: STORE_NAMES.brushingSessions,
    keyPath: "sessionId",
    comment: "Brushing sessions persist the inputs and outputs needed for history, dashboards, and gamification.",
    indexes: [
      { name: "userId", keyPath: "userId" },
      { name: "householdId", keyPath: "householdId" },
      { name: "startedAt", keyPath: "startedAt" },
      { name: "sessionType", keyPath: "sessionType" },
      { name: "completed", keyPath: "completed" }
    ]
  },
  {
    name: STORE_NAMES.achievements,
    keyPath: "achievementId",
    comment: "Achievements align to a future backend awards model while remaining local-first today.",
    indexes: [
      { name: "userId", keyPath: "userId" },
      { name: "householdId", keyPath: "householdId" },
      { name: "achievementType", keyPath: "achievementType" },
      { name: "awardedAt", keyPath: "awardedAt" },
      { name: "isSeen", keyPath: "isSeen" }
    ]
  },
  {
    name: STORE_NAMES.appSettings,
    keyPath: "settingKey",
    comment: "App settings remain lightweight key/value state that can later map to synced preferences.",
    indexes: []
  },
  {
    name: STORE_NAMES.migrationLog,
    keyPath: "migrationId",
    comment: "Migration log supports deterministic upgrades and future cookie-to-IndexedDB import observability.",
    indexes: [
      { name: "migrationType", keyPath: "migrationType" },
      { name: "status", keyPath: "status" },
      { name: "ranAt", keyPath: "ranAt" }
    ]
  }
];

let databasePromise = null;
let activeDatabase = null;

function logDb(level, message, context) {
  const logger = console[level] || console.log;
  if (context === undefined) {
    logger(`[BrushBeats DB] ${message}`);
    return;
  }

  logger(`[BrushBeats DB] ${message}`, context);
}

export function isIndexedDBAvailable() {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

export function nowIso() {
  return new Date().toISOString();
}

export function createPrefixedId(prefix) {
  const uniqueValue =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}_${uniqueValue}`;
}

export function runRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

export function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed"));
  });
}

function ensureIndexes(store, indexes) {
  indexes.forEach((index) => {
    if (!store.indexNames.contains(index.name)) {
      store.createIndex(index.name, index.keyPath, index.options || {});
    }
  });
}

function createStoreIfMissing(database, transaction, definition) {
  const store = database.objectStoreNames.contains(definition.name)
    ? transaction.objectStore(definition.name)
    : database.createObjectStore(definition.name, { keyPath: definition.keyPath });

  ensureIndexes(store, definition.indexes);
  return store;
}

function appendMigrationLifecycleEntries(transaction, fromVersion, toVersion) {
  const migrationStore = transaction.objectStore(STORE_NAMES.migrationLog);
  const recordedAt = nowIso();
  const migrationType = "schema-upgrade";
  const details = `Applied schema upgrade from v${fromVersion} to v${toVersion}.`;

  migrationStore.put({
    migrationId: createPrefixedId("migration"),
    migrationType,
    fromVersion,
    toVersion,
    status: "started",
    details,
    ranAt: recordedAt
  });

  migrationStore.put({
    migrationId: createPrefixedId("migration"),
    migrationType,
    fromVersion,
    toVersion,
    status: "completed",
    details,
    ranAt: recordedAt
  });
}

function applyVersionOneSchema(database, transaction) {
  STORE_DEFINITIONS.forEach((definition) => {
    createStoreIfMissing(database, transaction, definition);
  });
}

function applyMigrations(database, transaction, oldVersion, newVersion) {
  if (oldVersion < 1) {
    applyVersionOneSchema(database, transaction);
    appendMigrationLifecycleEntries(transaction, oldVersion, 1);
  }

  if (oldVersion < 2) {
    // Future schema upgrades should be added here as explicit incremental blocks.
  }

  logDb("info", `Upgrade prepared for database versions ${oldVersion} -> ${newVersion}`);
}

export async function initDB() {
  if (!isIndexedDBAvailable()) {
    throw new Error("IndexedDB is not available in this browser environment.");
  }

  if (activeDatabase) {
    return activeDatabase;
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const openRequest = window.indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onblocked = () => {
      logDb("warn", "Database open is blocked by another open tab or connection.");
    };

    openRequest.onupgradeneeded = (event) => {
      const database = openRequest.result;
      const transaction = openRequest.transaction;

      try {
        applyMigrations(database, transaction, event.oldVersion, event.newVersion || DB_VERSION);
      } catch (error) {
        logDb("error", "Failed during database upgrade.", error);
        transaction.abort();
      }
    };

    openRequest.onsuccess = () => {
      activeDatabase = openRequest.result;
      activeDatabase.onversionchange = () => {
        logDb("warn", "Database version changed in another context. Closing local connection.");
        closeDB();
      };

      logDb("info", `Database ready: ${DB_NAME} v${DB_VERSION}`);
      resolve(activeDatabase);
    };

    openRequest.onerror = () => {
      const error = openRequest.error || new Error("Failed to open IndexedDB.");
      logDb("error", "Database open failed.", error);
      databasePromise = null;
      reject(error);
    };
  });

  return databasePromise;
}

export async function getDB() {
  return initDB();
}

export function closeDB() {
  if (activeDatabase) {
    activeDatabase.close();
  }

  activeDatabase = null;
  databasePromise = null;
}

export async function deleteDatabase() {
  closeDB();

  if (!isIndexedDBAvailable()) {
    return false;
  }

  return new Promise((resolve, reject) => {
    const deleteRequest = window.indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onsuccess = () => resolve(true);
    deleteRequest.onerror = () => reject(deleteRequest.error || new Error("Failed to delete database."));
    deleteRequest.onblocked = () => reject(new Error("Database delete blocked by another open connection."));
  });
}

export function getStoreDefinitions() {
  return STORE_DEFINITIONS.map((definition) => ({ ...definition, indexes: [...definition.indexes] }));
}