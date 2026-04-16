export const ROADMAP_DATA = {
  title: "Brush Beats Development Roadmap",
  description:
    "Brush Beats is transitioning from cookie-based local storage to IndexedDB so the app can support richer household data, multi-user household profiles, longitudinal brushing and flossing history, developmental tooth tracking, gamification, and future backend/cloud sync.",
  buildOrder: [
    "Phase 1 MVP: IndexedDB foundation and migration framework",
    "Phase 2 MVP: Cookie import flow and household onboarding",
    "Phase 3: Multi-user household management, session logging, tooth history, and dashboards",
    "Phase 4: Gamification, achievements, and encouragement systems",
    "Phase 5: Sync-ready backend compatibility and subscription placeholders",
    "Ongoing: Testing, admin tooling, analytics, and backup/export support"
  ],
  architectureDecisions: [
    "Treat IndexedDB as the source of truth for household, users, toothHistory, brushingSessions, achievements, appSettings, and migrationLog data; keep cookies only as a short-lived import source.",
    "Use stable generated IDs and sync metadata now so local models can map cleanly to future backend tables and multi-device sync.",
    "Keep migration logic idempotent, resumable, and explicitly versioned so upgrades and imports can be retried without duplicating data.",
    "Separate domain services from UI components so brushing, developmental tracking, gamification, and sync logic remain testable outside React views."
  ],
  phases: [
    {
      id: "phase-1",
      eyebrow: "Phase 1 MVP",
      title: "IndexedDB Foundation",
      priority: "Highest priority",
      summary:
        "Establish the local data platform before expanding product behavior. This phase should produce a stable storage layer that can survive future migrations, richer local data, and eventual sync.",
      groups: [
        {
          title: "IndexedDB Architecture",
          items: [
            {
              text: "Design a database versioning strategy.",
              children: [
                "Choose a stable database name and explicit semantic version-to-schema mapping.",
                "Reserve upgrade handlers per database version instead of one large upgrade block.",
                "Document what constitutes a breaking schema change versus a data backfill."
              ]
            },
            {
              text: "Define the initial schema and object stores.",
              children: [
                "Create stores for household, users, toothHistory, brushingSessions, achievements, appSettings, and migrationLog.",
                "Normalize frequently queried entities and add indexes for householdId, userId, startedAt, recordedAt, awardedAt, completed, isSeen, and sync state.",
                "Add sync-friendly metadata fields now: createdAt, updatedAt, syncVersion, isDeleted, and deletedAt when relevant."
              ]
            },
            {
              text: "Build an IndexedDB wrapper and service abstraction layer.",
              children: [
                "Expose typed read/write helpers instead of direct IndexedDB calls in UI components.",
                "Centralize transaction handling, retries, and structured error mapping.",
                "Keep service interfaces aligned with future backend repository patterns."
              ]
            }
          ]
        },
        {
          title: "Migration Framework",
          items: [
            {
              text: "Create a reusable migration framework for future schema upgrades.",
              children: [
                "Register upgrade steps per version and keep them deterministic.",
                "Add upgrade/version handling logic for first install, incremental upgrades, and partial failures.",
                "Persist migration completion state so failed upgrades can resume safely."
              ]
            },
            {
              text: "Lay technical debt guardrails from the start.",
              children: [
                "Add structured logging around database open, upgrade, and transaction failures.",
                "Create developer debug utilities for inspecting stores and clearing local state safely.",
                "Define test fixtures for version upgrade tests before more data models are added."
              ]
            }
          ]
        }
      ],
      dependencies: "No downstream features should ship on IndexedDB until schema ownership, IDs, indexing, and upgrade mechanics are stable."
    },
    {
      id: "phase-2",
      eyebrow: "Phase 2 MVP",
      title: "Cookie to IndexedDB Migration and Household Onboarding",
      priority: "High priority",
      summary: "Move existing users forward without data loss, then establish the first household-aware setup flow.",
      groups: [
        {
          title: "Cookie to IndexedDB Migration",
          items: [
            {
              text: "Detect legacy cookie users and build a one-time import process.",
              children: [
                "Detect whether legacy storage exists before the new household/user bootstrap runs.",
                "Map cookie data such as preferences, last session, stored songs, and consent flags into the IndexedDB schema.",
                "Mark migrated users and imported cookie payload fingerprints so import is not re-run on every load."
              ]
            },
            {
              text: "Make migration idempotent and resumable.",
              children: [
                "Write import steps so a partially completed migration can be retried safely.",
                "Log migration start, completion, and failure states in migrationLog.",
                "Resume or recover gracefully if the app closes mid-migration."
              ]
            },
            {
              text: "Deprecate old cookie storage safely.",
              children: [
                "Switch cookie writes to read-only compatibility mode once IndexedDB is active.",
                "Clear or expire obsolete cookies only after successful migration verification.",
                "Provide fallback recovery messaging if import fails or data is incomplete."
              ]
            },
            {
              text: "Add user-facing migration UX.",
              children: [
                "Show a migration popup or notice explaining what data is being upgraded locally.",
                "Offer a review/confirm step for households that may contain mixed child/adult data.",
                "Track migration success and failure events for support and debugging."
              ]
            }
          ]
        },
        {
          title: "Household Setup",
          items: [
            {
              text: "Define the initial household profile structure.",
              children: [
                "Create a default local household with household-level preferences and ownership metadata.",
                "Support caregiver-oriented naming and user labeling for kids versus adults.",
                "Reserve fields for future subscription tier, sync owner, and invite relationships."
              ]
            },
            {
              text: "Build a household onboarding wizard.",
              children: [
                "Collect household name, member names, approximate age/development stage, and brushing defaults.",
                "Set the first active user after onboarding completes.",
                "Keep onboarding resumable in case the user leaves mid-flow."
              ]
            }
          ]
        }
      ],
      dependencies: "Depends on Phase 1 database services and migration registries being complete and tested."
    },
    {
      id: "phase-3",
      eyebrow: "Phase 3",
      title: "Household Management, Tracking, and Progress Views",
      priority: "Core product phase",
      summary:
        "After the data foundation exists, ship the household workflows and persistent tracking that make Brush Beats feel like a family app instead of a single-session tool.",
      groups: [
        {
          title: "Household and Multi-User Support",
          items: [
            {
              text: "Add user profile management.",
              children: [
                "Support add, edit, archive, and remove flows for household members.",
                "Store avatar, preferred language, brush type, tooth counts, developmental stage, and routine defaults per user.",
                "Define guardrails for deleting users with historical session data."
              ]
            },
            {
              text: "Implement active user switching UI.",
              children: [
                "Surface profile chips or a household switcher in the main brush flow.",
                "Persist the active user locally across reloads and browser restarts.",
                "Ensure last-session restore, favorites, and routine prompts are user-scoped."
              ]
            },
            {
              text: "Add household management screens.",
              children: [
                "Provide a household overview screen showing all members and their current streak/last activity.",
                "Separate household-level settings from per-user settings.",
                "Prepare caregiver-only actions for future sync/subscription controls."
              ]
            }
          ]
        },
        {
          title: "Brushing, Flossing, and Tooth Development Tracking",
          items: [
            {
              text: "Design the brushingSessions logging structure.",
              children: [
                "Capture session type, startedAt, completedAt, duration target, actual completion state, selected song/video, and brush type.",
                "Record tooth count snapshots and inferred developmental stage at session time.",
                "Leave room for flossing and water-picking session variants in the same event model."
              ]
            },
            {
              text: "Track tooth development over time.",
              children: [
                "Use toothHistory to log tooth-added, tooth-lost, manual-adjustment, and stage-changed events.",
                "Store previous and new counts/stages so progress can be explained to caregivers and kids.",
                "Support future milestone logic based on dental development history."
              ]
            },
            {
              text: "Persist brushing logic inputs and performance history.",
              children: [
                "Store dynamic BPM targets, transition timing, hand preference, and session outcome.",
                "Track historical performance trends such as completed sessions, skipped sessions, and restart frequency.",
                "Implement streak calculations and rolling weekly/monthly summaries."
              ]
            },
            {
              text: "Ship progress dashboards and history views.",
              children: [
                "Add user-level history views for brushing and flossing sessions.",
                "Highlight streaks, totals, developmental milestones, and recent routine consistency.",
                "Support filters by member, activity type, and time range."
              ]
            }
          ]
        }
      ],
      dependencies: "Requires user IDs, household scoping, and session repositories from earlier phases."
    },
    {
      id: "phase-4",
      eyebrow: "Phase 4",
      title: "Gamification and Encouragement Systems",
      priority: "Build after stable tracking",
      summary:
        "Gamification should sit on top of reliable session data. Build rules and rewards only after logging quality is trustworthy.",
      groups: [
        {
          title: "Achievement and Progression Engine",
          items: [
            {
              text: "Build a badge and achievement engine.",
              children: [
                "Define achievement rule types for streaks, milestones, consistency, user growth, and routine completion mixes.",
                "Store unlocked achievements with awardedAt and source event metadata.",
                "Support hidden achievements and seasonal/event-based badges later."
              ]
            },
            {
              text: "Add progression and leveling systems.",
              children: [
                "Award points or progress based on completed sessions and routine diversity.",
                "Create milestone unlock thresholds that are easy to explain to kids and caregivers.",
                "Keep formulas configurable rather than hard-coded in UI components."
              ]
            }
          ]
        },
        {
          title: "Developmental Logic and Messaging",
          items: [
            {
              text: "Extend developmental tooth eruption and tooth loss logic.",
              children: [
                "Track tooth-count changes over time as user milestones.",
                "Trigger educational nudges when a child transitions between dental stages.",
                "Use these transitions as inputs for encouragement messaging and milestone unlocks."
              ]
            },
            {
              text: "Upgrade reward and encouragement messaging.",
              children: [
                "Personalize rewards by age/developmental stage, brush type, and streak state.",
                "Add caregiver-friendly summary messaging alongside kid-facing celebration copy.",
                "Surface badges and progress summaries in dashboard and completion views."
              ]
            }
          ]
        }
      ],
      dependencies: "Achievement rules should read from stable session summaries and tooth history, not raw UI state."
    },
    {
      id: "phase-5",
      eyebrow: "Phase 5",
      title: "Backend and Cloud Sync Readiness",
      priority: "Later phase",
      summary:
        "Prepare the local-first model for future accounts, subscriptions, and multi-device sync without overbuilding backend code prematurely.",
      groups: [
        {
          title: "Future Backend Compatibility",
          items: [
            {
              text: "Design local schema to mirror likely backend tables/models.",
              children: [
                "Align household, users, toothHistory, brushingSessions, achievements, subscriptions, and settings with backend-ready model boundaries.",
                "Keep soft-delete fields and syncVersion semantics consistent across stores.",
                "Document entity ownership and foreign-key assumptions now to reduce future migration pain."
              ]
            },
            {
              text: "Add sync metadata and queueing considerations.",
              children: [
                "Store createdAt, updatedAt, syncVersion, isDeleted, deletedAt, syncStatus, and lastSyncedAt where needed.",
                "Prepare a local outbound sync queue for create/update/delete operations.",
                "Plan conflict resolution rules for household edits, user merges, and duplicate session uploads."
              ]
            },
            {
              text: "Create placeholders for authentication and subscription architecture.",
              children: [
                "Reserve account linking fields at the household and caregiver level.",
                "Sketch entitlement checks for premium household size, sync, and advanced dashboards.",
                "Keep auth/subscription concerns decoupled from local-only MVP flows."
              ]
            }
          ]
        },
        {
          title: "Resilience and Portability",
          items: [
            {
              text: "Plan backup, export, and import strategies.",
              children: [
                "Support JSON export for household and history data before cloud sync exists.",
                "Add import validation and conflict warnings for restoring backups.",
                "Document what data is local-only versus sync-ready."
              ]
            },
            {
              text: "Prepare cloud-sync readiness checks.",
              children: [
                "Define feature flags for turning on remote sync gradually.",
                "Audit which entities can be safely synced versus device-local only.",
                "Ensure telemetry and privacy disclosures are updated before any remote storage launches."
              ]
            }
          ]
        }
      ],
      dependencies: "Do not start full sync until local migrations, exports, and user-scoped history are proven stable."
    }
  ],
  infrastructureItems: [
    "Testing strategy for migrations, upgrade/version handling, and user-scoped history correctness.",
    "Robust error handling and fallback logic for blocked IndexedDB opens, quota issues, and failed transactions.",
    "Admin/debug tools for inspecting IndexedDB stores, simulating migrations, and resetting environments safely.",
    "Analytics and telemetry plans focused on migration success, retention, and feature adoption while respecting family privacy."
  ],
  futureIdeas: [
    "Family challenges, caregiver approval flows, and weekly household goals.",
    "Premium insights such as trend forecasts, printable charts, and pediatric-dentist-ready summaries.",
    "Cross-device household sync with conflict handling and offline-first reconciliation.",
    "Content packs for themed rewards, seasonal events, and educational tooth-development journeys."
  ]
};

export const ROADMAP_TITLE = ROADMAP_DATA.title;
export const ROADMAP_DESCRIPTION = ROADMAP_DATA.description;
export const ROADMAP_UI_TITLE = "Brush Beats IndexedDB, Household, Tooth History, and Gamification Roadmap";
export const ROADMAP_UI_DESCRIPTION =
  "This roadmap aligns Brush Beats storage, migration, tooth development history, gamification, and future sync work under a single IndexedDB-first plan.";
export const BUILD_ORDER = ROADMAP_DATA.buildOrder;
export const ARCHITECTURE_DECISIONS = ROADMAP_DATA.architectureDecisions;
export const ROADMAP_PHASES = ROADMAP_DATA.phases;
export const INFRASTRUCTURE_ITEMS = ROADMAP_DATA.infrastructureItems;
export const FUTURE_IDEAS = ROADMAP_DATA.futureIdeas;

export function getRoadmapData() {
  return ROADMAP_DATA;
}

function appendNestedMarkdown(lines, items, depth = 0) {
  items.forEach((item) => {
    const prefix = `${"  ".repeat(depth)}- `;

    if (typeof item === "string") {
      lines.push(`${prefix}${item}`);
      return;
    }

    lines.push(`${prefix}${item.text}`);

    if (item.children?.length) {
      appendNestedMarkdown(lines, item.children, depth + 1);
    }
  });
}

export function buildRoadmapMarkdown() {
  const lines = [
    `# ${ROADMAP_TITLE}`,
    "",
    ROADMAP_DESCRIPTION,
    "",
    "## Suggested Build Order",
    ""
  ];

  BUILD_ORDER.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });

  lines.push("", "## Recommended Architecture Decisions", "");

  ARCHITECTURE_DECISIONS.forEach((item) => {
    lines.push(`- ${item}`);
  });

  ROADMAP_PHASES.forEach((phase) => {
    lines.push("", `## ${phase.eyebrow}: ${phase.title}`, "", `Priority: ${phase.priority}`, "", phase.summary, "");

    phase.groups.forEach((group) => {
      lines.push(`### ${group.title}`, "");
      appendNestedMarkdown(lines, group.items);
      lines.push("");
    });

    lines.push(`Dependencies / Notes: ${phase.dependencies}`, "");
  });

  lines.push("## Technical Debt and Infrastructure Track", "");

  INFRASTRUCTURE_ITEMS.forEach((item) => {
    lines.push(`- ${item}`);
  });

  lines.push("", "## Optional Future / Nice-to-Have", "");

  FUTURE_IDEAS.forEach((item) => {
    lines.push(`- ${item}`);
  });

  lines.push("");
  return lines.join("\n");
}
