# Brush Beats Development Roadmap

Brush Beats is transitioning from cookie-based local storage to IndexedDB so the app can support richer household data, multi-user profiles, longitudinal brushing and flossing history, gamification, and future backend/cloud sync.

## Suggested Build Order

1. Phase 1 MVP: IndexedDB foundation and migration framework
2. Phase 2 MVP: Cookie import flow and household onboarding
3. Phase 3: Multi-user profiles, session logging, and dashboards
4. Phase 4: Gamification, achievements, and encouragement systems
5. Phase 5: Sync-ready backend compatibility and subscription placeholders
6. Ongoing: Testing, admin tooling, analytics, and backup/export support

## Recommended Architecture Decisions

- Treat IndexedDB as the source of truth for household, profile, and session data; keep cookies only as a short-lived import source.
- Use stable generated IDs and sync metadata now so local models can map cleanly to future backend tables and multi-device sync.
- Keep migration logic idempotent and explicitly versioned so upgrades can be retried without duplicating data.
- Separate domain services from UI components so brushing, gamification, and sync logic remain testable outside React views.

## Phase 1 MVP: IndexedDB Foundation

Priority: Highest priority

Establish the local data platform before expanding product behavior. This phase should produce a stable storage layer that can survive future migrations, richer local data, and eventual sync.

### IndexedDB Architecture

- Design a database versioning strategy.
  - Choose a stable database name and explicit semantic version-to-schema mapping.
  - Reserve upgrade handlers per database version instead of one large upgrade block.
  - Document what constitutes a breaking schema change versus a data backfill.
- Define the initial schema and object stores.
  - Create stores for households, profiles, sessions, achievements, app settings, and migration state.
  - Normalize frequently queried entities and add indexes for householdId, profileId, date, streak windows, and pending sync state.
  - Add sync-friendly metadata fields now: createdAt, updatedAt, syncVersion, deleted, and deletedAt when relevant.
- Build an IndexedDB wrapper and service abstraction layer.
  - Expose typed read/write helpers instead of direct IndexedDB calls in UI components.
  - Centralize transaction handling, retries, and structured error mapping.
  - Keep service interfaces aligned with future backend repository patterns.

### Migration Framework

- Create a reusable migration framework for future schema upgrades.
  - Register upgrade steps per version and keep them deterministic.
  - Add upgrade/version handling logic for first install, incremental upgrades, and partial failures.
  - Persist migration completion state so failed upgrades can resume safely.
- Lay technical debt guardrails from the start.
  - Add structured logging around database open, upgrade, and transaction failures.
  - Create developer debug utilities for inspecting stores and clearing local state safely.
  - Define test fixtures for version upgrade tests before more data models are added.

Dependencies / Notes: No downstream features should ship on IndexedDB until schema ownership, IDs, and upgrade mechanics are stable.


## Phase 2 MVP: Cookie to IndexedDB Migration and Household Onboarding

Priority: High priority

Move existing users forward without data loss, then establish the first household-aware setup flow.

### Cookie to IndexedDB Migration

- Detect legacy cookie users and build a one-time import process.
  - Detect whether legacy storage exists before the new household/profile bootstrap runs.
  - Map cookie data such as preferences, last session, stored songs, and consent flags into the IndexedDB schema.
  - Mark migrated users so import is not re-run on every load.
- Deprecate old cookie storage safely.
  - Switch cookie writes to read-only compatibility mode once IndexedDB is active.
  - Clear or expire obsolete cookies only after successful migration verification.
  - Provide fallback recovery messaging if import fails or data is incomplete.
- Add user-facing migration UX.
  - Show a migration popup or notice explaining what data is being upgraded locally.
  - Offer a review/confirm step for households that may contain mixed child/adult data.
  - Track migration success and failure events for support and debugging.

### Household Setup

- Define the initial household profile structure.
  - Create a default local household with household-level preferences and ownership metadata.
  - Support caregiver-oriented naming and profile labeling for kids versus adults.
  - Reserve fields for future subscription tier, sync owner, and invite relationships.
- Build a profile setup and onboarding wizard.
  - Collect household name, member names, approximate age/development stage, and brushing defaults.
  - Set the first active profile after onboarding completes.
  - Keep onboarding resumable in case the user leaves mid-flow.

Dependencies / Notes: Depends on Phase 1 database services and migration registries being complete and tested.


## Phase 3: Household Management, Tracking, and Progress Views

Priority: Core product phase

After the data foundation exists, ship the household workflows and persistent tracking that make Brush Beats feel like a family app instead of a single-session tool.

### Household and Multi-User Support

- Add user profile management.
  - Support add, edit, archive, and remove flows for household members.
  - Store avatar, preferred language, brush type, tooth counts, developmental stage, and routine defaults per user.
  - Define guardrails for deleting users with historical session data.
- Implement active profile switching UI.
  - Surface profile chips or a household switcher in the main brush flow.
  - Persist the active profile locally across reloads and browser restarts.
  - Ensure last-session restore, favorites, and routine prompts are profile-scoped.
- Add household management screens.
  - Provide a household overview screen showing all members and their current streak/last activity.
  - Separate household-level settings from per-user settings.
  - Prepare caregiver-only actions for future sync/subscription controls.

### Brushing and Flossing Tracking

- Design the session logging structure.
  - Capture session type, startedAt, completedAt, duration target, actual completion state, selected song/video, and brush type.
  - Record tooth count snapshots and inferred developmental stage at session time.
  - Leave room for flossing and water-picking session variants in the same event model.
- Persist brushing logic inputs and performance history.
  - Store dynamic BPM targets, transition timing, hand preference, and session outcome.
  - Track historical performance trends such as completed sessions, skipped sessions, and restart frequency.
  - Implement streak calculations and rolling weekly/monthly summaries.
- Ship progress dashboards and history views.
  - Add profile-level history views for brushing and flossing sessions.
  - Highlight streaks, totals, and recent routine consistency.
  - Support filters by member, activity type, and time range.

Dependencies / Notes: Requires profile IDs, household scoping, and session repositories from earlier phases.


## Phase 4: Gamification and Encouragement Systems

Priority: Build after stable tracking

Gamification should sit on top of reliable session data. Build rules and rewards only after logging quality is trustworthy.

### Achievement and Progression Engine

- Build a badge and achievement engine.
  - Define achievement rule types for streaks, milestones, consistency, profile growth, and routine completion mixes.
  - Store unlocked achievements with awardedAt and source event metadata.
  - Support hidden achievements and seasonal/event-based badges later.
- Add progression and leveling systems.
  - Award points or progress based on completed sessions and routine diversity.
  - Create milestone unlock thresholds that are easy to explain to kids and caregivers.
  - Keep formulas configurable rather than hard-coded in UI components.

### Developmental Logic and Messaging

- Extend developmental tooth eruption and tooth loss logic.
  - Track tooth-count changes over time as profile milestones.
  - Trigger educational nudges when a child transitions between dental stages.
  - Use these transitions as inputs for encouragement messaging and milestone unlocks.
- Upgrade reward and encouragement messaging.
  - Personalize rewards by age/developmental stage, brush type, and streak state.
  - Add caregiver-friendly summary messaging alongside kid-facing celebration copy.
  - Surface badges and progress summaries in dashboard and completion views.

Dependencies / Notes: Achievement rules should read from stable session summaries, not raw UI state.


## Phase 5: Backend and Cloud Sync Readiness

Priority: Later phase

Prepare the local-first model for future accounts, subscriptions, and multi-device sync without overbuilding backend code prematurely.

### Future Backend Compatibility

- Design local schema to mirror likely backend tables/models.
  - Align households, profiles, sessions, achievements, and subscriptions with backend-ready model boundaries.
  - Keep soft-delete fields and syncVersion semantics consistent across stores.
  - Document entity ownership and foreign-key assumptions now to reduce future migration pain.
- Add sync metadata and queueing considerations.
  - Store createdAt, updatedAt, syncVersion, deleted flags, syncStatus, and lastSyncedAt where needed.
  - Prepare a local outbound sync queue for create/update/delete operations.
  - Plan conflict resolution rules for household edits, profile merges, and duplicate session uploads.
- Create placeholders for authentication and subscription architecture.
  - Reserve account linking fields at the household and caregiver level.
  - Sketch entitlement checks for premium household size, sync, and advanced dashboards.
  - Keep auth/subscription concerns decoupled from local-only MVP flows.

### Resilience and Portability

- Plan backup, export, and import strategies.
  - Support JSON export for household and history data before cloud sync exists.
  - Add import validation and conflict warnings for restoring backups.
  - Document what data is local-only versus sync-ready.
- Prepare cloud-sync readiness checks.
  - Define feature flags for turning on remote sync gradually.
  - Audit which entities can be safely synced versus device-local only.
  - Ensure telemetry and privacy disclosures are updated before any remote storage launches.

Dependencies / Notes: Do not start full sync until local migrations, exports, and profile-scoped history are proven stable.

## Technical Debt and Infrastructure Track

- Testing strategy for migrations, upgrade/version handling, and profile-scoped history correctness.
- Robust error handling and fallback logic for blocked IndexedDB opens, quota issues, and failed transactions.
- Admin/debug tools for inspecting IndexedDB stores, simulating migrations, and resetting environments safely.
- Analytics and telemetry plans focused on migration success, retention, and feature adoption while respecting family privacy.

## Optional Future / Nice-to-Have

- Family challenges, caregiver approval flows, and weekly household goals.
- Premium insights such as trend forecasts, printable charts, and pediatric-dentist-ready summaries.
- Cross-device household sync with conflict handling and offline-first reconciliation.
- Content packs for themed rewards, seasonal events, and educational tooth-development journeys.
