import { estimateAgeFromTeethFull } from "../lib/teethAge";
import { nowIso } from "./indexedDbService";
import { createUser, getUserById, logToothChange, setActiveUser, setAppSetting, updateHousehold, updateUser } from "./storeHelpers";

export const HOUSEHOLD_ONBOARDING_SETTING_KEY = "system.householdOnboarding";
export const HOUSEHOLD_ONBOARDING_UI_SETTING_KEY = "system.householdOnboardingUi";
export const HOUSEHOLD_ONBOARDING_DRAFT_SETTING_KEY = "system.householdOnboardingDraft";

function normalizeCount(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(16, Math.max(0, Math.round(numericValue)));
}

function normalizeMember(input = {}, index = 0) {
  return {
    clientId: input.clientId || `member-${index + 1}`,
    userId: input.userId || null,
    memberName: String(input.memberName || "").trim() || `Member ${index + 2}`,
    topTeethCount: normalizeCount(input.topTeethCount, 16),
    bottomTeethCount: normalizeCount(input.bottomTeethCount, 16)
  };
}

function normalizeDraft(input = {}) {
  return {
    householdName: String(input.householdName || "BrushBeats Household").trim() || "BrushBeats Household",
    memberName: String(input.memberName || "Primary Brusher").trim() || "Primary Brusher",
    topTeethCount: normalizeCount(input.topTeethCount, 16),
    bottomTeethCount: normalizeCount(input.bottomTeethCount, 16),
    brushingHand: input.brushingHand === "left" ? "left" : "right",
    brushType: input.brushType === "electric" ? "electric" : "manual",
    brushDurationSeconds: [90, 120, 150, 180].includes(Number(input.brushDurationSeconds)) ? Number(input.brushDurationSeconds) : 120,
    keyword: typeof input.keyword === "string" ? input.keyword : "",
    filters:
      input.filters && typeof input.filters === "object"
        ? {
            tolerance: Number.isFinite(Number(input.filters.tolerance)) ? Number(input.filters.tolerance) : 4,
            danceability: Number.isFinite(Number(input.filters.danceability)) ? Number(input.filters.danceability) : 50,
            acousticness: Number.isFinite(Number(input.filters.acousticness)) ? Number(input.filters.acousticness) : 50
          }
        : {
            tolerance: 4,
            danceability: 50,
            acousticness: 50
          },
      additionalMembers: Array.isArray(input.additionalMembers)
        ? input.additionalMembers.slice(0, 4).map((member, index) => normalizeMember(member, index))
        : [],
    reviewSource: input.reviewSource || "bootstrap"
  };
}

  export async function setHouseholdOnboardingUiDismissed(dismissed) {
    const timestamp = nowIso();

    await setAppSetting(HOUSEHOLD_ONBOARDING_UI_SETTING_KEY, {
      dismissedAt: dismissed ? timestamp : null,
      updatedAt: timestamp
    });

    return { dismissedAt: dismissed ? timestamp : null };
  }

export async function saveHouseholdOnboardingDraft(input) {
  const nextDraft = normalizeDraft(input);
  await setAppSetting(HOUSEHOLD_ONBOARDING_DRAFT_SETTING_KEY, {
    ...nextDraft,
    updatedAt: nowIso()
  });
  return nextDraft;
}

export async function completeHouseholdOnboarding({ household, activeUser, draft, migrationState }) {
  if (!household?.householdId) {
    throw new Error("Household setup requires an existing household.");
  }

  const normalizedDraft = normalizeDraft(draft);
  const totalTeethCount = normalizedDraft.topTeethCount + normalizedDraft.bottomTeethCount;
  const ageEstimate = estimateAgeFromTeethFull(totalTeethCount);
  const nextToothStage = ageEstimate?.phase || "unknown";

  const updatedHousehold = await updateHousehold(household.householdId, {
    householdName: normalizedDraft.householdName
  });

  let nextUser = activeUser;
  if (!nextUser?.userId) {
    nextUser = await createUser({
      householdId: household.householdId,
      name: normalizedDraft.memberName,
      isActive: true,
      topTeethCount: normalizedDraft.topTeethCount,
      bottomTeethCount: normalizedDraft.bottomTeethCount,
      totalTeethCount,
      toothStage: nextToothStage,
      ageGroup: nextToothStage
    });
  } else {
    const previousUser = await getUserById(nextUser.userId);
    nextUser = await updateUser(nextUser.userId, {
      name: normalizedDraft.memberName,
      topTeethCount: normalizedDraft.topTeethCount,
      bottomTeethCount: normalizedDraft.bottomTeethCount,
      totalTeethCount,
      toothStage: nextToothStage,
      ageGroup: nextToothStage,
      isActive: true
    });

    if (
      previousUser &&
      (Number(previousUser.topTeethCount) !== normalizedDraft.topTeethCount ||
        Number(previousUser.bottomTeethCount) !== normalizedDraft.bottomTeethCount ||
        previousUser.toothStage !== nextToothStage)
    ) {
      await logToothChange({
        householdId: household.householdId,
        userId: nextUser.userId,
        eventType: "manual-adjustment",
        previousTopTeethCount: previousUser.topTeethCount ?? null,
        previousBottomTeethCount: previousUser.bottomTeethCount ?? null,
        newTopTeethCount: normalizedDraft.topTeethCount,
        newBottomTeethCount: normalizedDraft.bottomTeethCount,
        previousToothStage: previousUser.toothStage || null,
        newToothStage: nextToothStage,
        reason: "phase-2-household-setup",
        recordedAt: nowIso()
      });
    }
  }

  await setActiveUser(nextUser.userId, household.householdId);

  const additionalUsers = [];
  for (const member of normalizedDraft.additionalMembers) {
    const memberTeethCount = member.topTeethCount + member.bottomTeethCount;
    const memberAgeEstimate = estimateAgeFromTeethFull(memberTeethCount);
    const memberToothStage = memberAgeEstimate?.phase || "unknown";

    if (member.userId) {
      const updatedMember = await updateUser(member.userId, {
        name: member.memberName,
        topTeethCount: member.topTeethCount,
        bottomTeethCount: member.bottomTeethCount,
        totalTeethCount: memberTeethCount,
        toothStage: memberToothStage,
        ageGroup: memberToothStage,
        isActive: false
      });
      additionalUsers.push(updatedMember);
      continue;
    }

    const createdMember = await createUser({
      householdId: household.householdId,
      name: member.memberName,
      isActive: false,
      topTeethCount: member.topTeethCount,
      bottomTeethCount: member.bottomTeethCount,
      totalTeethCount: memberTeethCount,
      toothStage: memberToothStage,
      ageGroup: memberToothStage
    });
    additionalUsers.push(createdMember);
  }

  await setAppSetting("user.defaults", {
    householdId: household.householdId,
    userId: nextUser.userId,
    brushingHand: normalizedDraft.brushingHand,
    brushType: normalizedDraft.brushType,
    brushDurationSeconds: normalizedDraft.brushDurationSeconds,
    keyword: normalizedDraft.keyword,
    filters: normalizedDraft.filters,
    values: {
      top: normalizedDraft.topTeethCount,
      bottom: normalizedDraft.bottomTeethCount
    },
    savedAt: Date.now()
  });
  await setAppSetting(HOUSEHOLD_ONBOARDING_SETTING_KEY, {
    completedAt: nowIso(),
    householdId: household.householdId,
    userId: nextUser.userId,
    additionalUserIds: additionalUsers.map((member) => member.userId),
    reviewSource: normalizedDraft.reviewSource,
    reviewedMigration: Boolean(migrationState?.completedAt)
  });
  await setAppSetting(HOUSEHOLD_ONBOARDING_UI_SETTING_KEY, {
    dismissedAt: null,
    updatedAt: nowIso()
  });
  await setAppSetting(HOUSEHOLD_ONBOARDING_DRAFT_SETTING_KEY, null);

  return {
    household: updatedHousehold,
    user: nextUser,
    additionalUsers,
    defaults: {
      values: {
        top: normalizedDraft.topTeethCount,
        bottom: normalizedDraft.bottomTeethCount
      },
      filters: normalizedDraft.filters,
      keyword: normalizedDraft.keyword,
      brushingHand: normalizedDraft.brushingHand,
      brushType: normalizedDraft.brushType,
      brushDurationSeconds: normalizedDraft.brushDurationSeconds,
      savedAt: Date.now()
    }
  };
}