# Brush Beats MVP 1 Copilot Prompt

Build Phase 1 MVP for the Brush Beats web app: the IndexedDB foundation.

## Goal

Create a production-friendly, modular IndexedDB layer for a browser-based brushing and flossing app that supports one local household per browser, multiple users in that household, tooth development tracking over time, brushing session history, achievements, app settings, and a migration framework for future schema upgrades.

Use plain JavaScript or TypeScript, whichever best fits the current project.

## Scope for This Task

Only implement Phase 1 MVP. Do not build the cookie migration UX, onboarding UI, dashboards, or gamification screens yet. Focus on the storage foundation, migration logging, and developer utilities.

## Database Requirements

- Database name: `brushbeatsDB`
- Initial version: `1`

## Object Stores to Create in Version 1

1. `household`
2. `users`
3. `toothHistory`
4. `brushingSessions`
5. `achievements`
6. `appSettings`
7. `migrationLog`

## Architecture Constraints

- Treat IndexedDB as the source of truth for `household`, `users`, `toothHistory`, `brushingSessions`, `achievements`, `appSettings`, and `migrationLog`.
- Use stable prefixed IDs such as `household_...`, `user_...`, `toothhist_...`, `session_...`, `achievement_...`, and `migration_...`.
- Add `createdAt`, `updatedAt`, `syncVersion`, `isDeleted`, and `deletedAt` where relevant.
- Keep record shapes aligned with a future backend and sync layer.
- Use `householdId` and `userId` consistently across related stores.
- Keep migration logic deterministic, idempotent, resumable, and easy to extend.

## Phase 1 Implementation Requirements

### 1. IndexedDB service layer

- Create a reusable service module for opening, upgrading, and querying IndexedDB.
- Wrap IndexedDB requests in Promise-based async helpers.
- Keep direct IndexedDB calls out of UI components.
- Centralize transaction creation, error handling, retries, and structured logging.

### 2. Versioning and migrations

- Implement `onupgradeneeded` using incremental migration blocks:

```js
if (oldVersion < 1) {
  // create version 1 stores and indexes
}

if (oldVersion < 2) {
  // future schema upgrades
}
```

- In version 1, create all required stores and indexes.
- Add clear comments showing where version 2+ schema upgrades would go.
- Add a migration logging helper that records `started`, `completed`, and `failed` states to `migrationLog`.
- Make sure partial upgrades and retries do not duplicate records or corrupt state.

### 3. Required store design

#### Household

- `householdId`
- `householdName`
- `createdAt`
- `updatedAt`
- `subscriptionTier`
- `activeUserId`
- `migrationSource`
- `syncStatus`

#### Users

- `userId`
- `householdId`
- `name`
- `avatar`
- `birthYear`
- `ageGroup`
- `toothStage`
- `topTeethCount`
- `bottomTeethCount`
- `totalTeethCount`
- `isActive`
- `createdAt`
- `updatedAt`
- `syncVersion`
- `isDeleted`
- `deletedAt`

#### ToothHistory

- `toothHistoryId`
- `userId`
- `householdId`
- `eventType`
- `previousTopTeethCount`
- `previousBottomTeethCount`
- `newTopTeethCount`
- `newBottomTeethCount`
- `previousToothStage`
- `newToothStage`
- `reason`
- `recordedAt`
- `createdAt`
- `syncVersion`
- `isDeleted`
- `deletedAt`

#### BrushingSessions

- `sessionId`
- `userId`
- `householdId`
- `sessionType`
- `startedAt`
- `completedAt`
- `durationSeconds`
- `targetDurationSeconds`
- `songId`
- `songTitle`
- `artistName`
- `bpmUsed`
- `topTeethCount`
- `bottomTeethCount`
- `totalTeethCount`
- `performanceRating`
- `completed`
- `source`
- `notes`
- `createdAt`
- `updatedAt`
- `syncVersion`
- `isDeleted`
- `deletedAt`

#### Achievements

- `achievementId`
- `userId`
- `householdId`
- `achievementType`
- `title`
- `description`
- `awardedAt`
- `relatedSessionId`
- `progressValue`
- `isSeen`
- `createdAt`
- `updatedAt`
- `syncVersion`
- `isDeleted`
- `deletedAt`

#### AppSettings

- `settingKey`
- `value`
- `updatedAt`

#### MigrationLog

- `migrationId`
- `migrationType`
- `fromVersion`
- `toVersion`
- `status`
- `details`
- `ranAt`

### 4. Required indexes

#### Users

- `householdId`
- `isActive`
- `name`

#### ToothHistory

- `userId`
- `householdId`
- `eventType`
- `recordedAt`

#### BrushingSessions

- `userId`
- `householdId`
- `startedAt`
- `sessionType`
- `completed`

#### Achievements

- `userId`
- `householdId`
- `achievementType`
- `awardedAt`
- `isSeen`

#### MigrationLog

- `migrationType`
- `status`
- `ranAt`

### 5. Required helper methods

#### Core

- `initDB()`
- `getDB()`
- `closeDB()`

#### Generic

- `addItem(storeName, item)`
- `putItem(storeName, item)`
- `getItem(storeName, key)`
- `getAllItems(storeName)`
- `deleteItem(storeName, key)`

#### Household

- `createHousehold()`
- `getHousehold()`

#### Users

- `createUser()`
- `updateUser()`
- `getUserById()`
- `getUsersByHousehold()`
- `setActiveUser()`

#### ToothHistory

- `logToothChange()`
- `getToothHistoryByUser()`

#### Sessions

- `createBrushingSession()`
- `getSessionsByUser()`
- `getRecentSessionsByUser()`

#### Achievements

- `createAchievement()`
- `getAchievementsByUser()`

#### Settings

- `setAppSetting()`
- `getAppSetting()`

#### Migration

- `logMigration()`

### 6. Developer support and quality

- Add developer debug utilities for inspecting stores and clearing local state safely.
- Add structured console logging around database open, upgrade, and transaction failures.
- Keep the code modular and production-friendly, not demo-level.
- Add comments explaining why each store exists and how future backend sync would use the same record shapes.

### 7. Deliverables

Generate the implementation split into files like:

- `db/indexedDbService.js` or `.ts`
- `db/storeHelpers.js`
- `db/debugTools.js`
- `db/exampleUsage.js`

Also include example usage for:

- creating a household and first user
- logging a tooth development event
- saving a brushing session
- reading the active user and their recent session history

## Important

- Use the canonical store names exactly as listed above.
- Use `users` rather than `profiles` everywhere.
- Include `toothHistory` explicitly as a first-class store.
- Keep the code aligned with a future Phase 2 cookie-to-IndexedDB migration, but do not implement the cookie migration flow yet.
- Generate the full code, not just an outline.
