const express = require("express");
const { getPool } = require("../config/database");

const router = express.Router();

function normalizeInteger(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : fallback;
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function normalizeObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function normalizeHouseholdSnapshot(householdId, household = {}) {
  return {
    householdId,
    householdName: String(household.householdName || household.name || "BrushBeats Household").trim() || "BrushBeats Household",
    subscriptionTier: String(household.subscriptionTier || "free"),
    activeUserId: household.activeUserId ? String(household.activeUserId) : null,
    migrationSource: String(household.migrationSource || "manual"),
    syncStatus: "connected",
    rewardSettings: normalizeObject(household.rewardSettings),
    goalSettings: normalizeObject(household.goalSettings),
    createdAt: household.createdAt || new Date().toISOString(),
    updatedAt: household.updatedAt || new Date().toISOString()
  };
}

function normalizeMemberSnapshot(householdId, member = {}) {
  const preferences = normalizeObject(member.preferences);

  return {
    userId: String(member.userId || "").trim(),
    householdId,
    name: String(member.name || "Household Member").trim() || "Household Member",
    avatar: member.avatar || null,
    birthYear: Number.isFinite(Number(member.birthYear)) ? Number(member.birthYear) : null,
    ageGroup: String(member.ageGroup || member.toothStage || "unknown"),
    toothStage: String(member.toothStage || "unknown"),
    topTeethCount: normalizeInteger(member.topTeethCount, 0),
    bottomTeethCount: normalizeInteger(member.bottomTeethCount, 0),
    totalTeethCount: normalizeInteger(member.totalTeethCount, normalizeInteger(member.topTeethCount, 0) + normalizeInteger(member.bottomTeethCount, 0)),
    isActive: normalizeBoolean(member.isActive),
    isArchived: normalizeBoolean(member.isArchived),
    memberPreferences: preferences,
    createdAt: member.createdAt || new Date().toISOString(),
    updatedAt: member.updatedAt || new Date().toISOString(),
    syncVersion: normalizeInteger(member.syncVersion, 1),
    isDeleted: normalizeBoolean(member.isDeleted),
    deletedAt: member.deletedAt || null
  };
}

function mapHouseholdRow(row) {
  if (!row) {
    return null;
  }

  return {
    householdId: row.household_id,
    householdName: row.household_name,
    subscriptionTier: row.subscription_tier,
    activeUserId: row.active_user_id,
    migrationSource: row.migration_source,
    syncStatus: row.sync_status,
    rewardSettings: row.reward_settings || {},
    goalSettings: row.goal_settings || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function mapMemberRow(row) {
  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    householdId: row.household_id,
    name: row.name,
    avatar: row.avatar,
    birthYear: row.birth_year,
    ageGroup: row.age_group,
    toothStage: row.tooth_stage,
    topTeethCount: row.top_teeth_count,
    bottomTeethCount: row.bottom_teeth_count,
    totalTeethCount: row.total_teeth_count,
    isActive: row.is_active,
    isArchived: row.is_archived,
    preferences: row.member_preferences || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    syncVersion: row.sync_version,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at instanceof Date ? row.deleted_at.toISOString() : row.deleted_at
  };
}

async function loadSnapshot(client, householdId) {
  const householdResult = await client.query(
    `select * from households where household_id = $1`,
    [householdId]
  );

  if (householdResult.rowCount === 0) {
    return null;
  }

  const membersResult = await client.query(
    `
      select *
      from members
      where household_id = $1 and is_deleted = false
      order by updated_at desc, created_at desc
    `,
    [householdId]
  );

  return {
    household: mapHouseholdRow(householdResult.rows[0]),
    members: membersResult.rows.map(mapMemberRow)
  };
}

router.get("/:householdId", async (req, res, next) => {
  const householdId = String(req.params.householdId || "").trim();

  if (!householdId) {
    return res.status(400).json({ error: "householdId is required" });
  }

  const client = await getPool().connect();

  try {
    const snapshot = await loadSnapshot(client, householdId);

    if (!snapshot) {
      return res.status(404).json({ error: `Household not found: ${householdId}` });
    }

    return res.json(snapshot);
  } catch (error) {
    return next(error);
  } finally {
    client.release();
  }
});

router.post("/:householdId/sync", async (req, res, next) => {
  const householdId = String(req.params.householdId || "").trim();
  const household = normalizeHouseholdSnapshot(householdId, req.body?.household);
  const members = Array.isArray(req.body?.members)
    ? req.body.members
        .map((member) => normalizeMemberSnapshot(householdId, member))
        .filter((member) => member.userId)
    : [];

  if (!householdId) {
    return res.status(400).json({ error: "householdId is required" });
  }

  if (req.body?.household?.householdId && req.body.household.householdId !== householdId) {
    return res.status(400).json({ error: "householdId path parameter does not match household payload" });
  }

  const client = await getPool().connect();

  try {
    await client.query("begin");

    await client.query(
      `
        insert into households (
          household_id,
          household_name,
          subscription_tier,
          active_user_id,
          migration_source,
          sync_status,
          reward_settings,
          goal_settings,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::timestamptz, $10::timestamptz)
        on conflict (household_id) do update set
          household_name = excluded.household_name,
          subscription_tier = excluded.subscription_tier,
          active_user_id = excluded.active_user_id,
          migration_source = excluded.migration_source,
          sync_status = excluded.sync_status,
          reward_settings = excluded.reward_settings,
          goal_settings = excluded.goal_settings,
          updated_at = excluded.updated_at
      `,
      [
        household.householdId,
        household.householdName,
        household.subscriptionTier,
        household.activeUserId,
        household.migrationSource,
        household.syncStatus,
        JSON.stringify(household.rewardSettings || {}),
        JSON.stringify(household.goalSettings || {}),
        household.createdAt,
        household.updatedAt
      ]
    );

    for (const member of members) {
      await client.query(
        `
          insert into members (
            user_id,
            household_id,
            name,
            avatar,
            birth_year,
            age_group,
            tooth_stage,
            top_teeth_count,
            bottom_teeth_count,
            total_teeth_count,
            is_active,
            is_archived,
            member_preferences,
            created_at,
            updated_at,
            sync_version,
            is_deleted,
            deleted_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13::jsonb, $14::timestamptz, $15::timestamptz, $16, $17, $18::timestamptz
          )
          on conflict (user_id) do update set
            household_id = excluded.household_id,
            name = excluded.name,
            avatar = excluded.avatar,
            birth_year = excluded.birth_year,
            age_group = excluded.age_group,
            tooth_stage = excluded.tooth_stage,
            top_teeth_count = excluded.top_teeth_count,
            bottom_teeth_count = excluded.bottom_teeth_count,
            total_teeth_count = excluded.total_teeth_count,
            is_active = excluded.is_active,
            is_archived = excluded.is_archived,
            member_preferences = excluded.member_preferences,
            updated_at = excluded.updated_at,
            sync_version = excluded.sync_version,
            is_deleted = excluded.is_deleted,
            deleted_at = excluded.deleted_at
        `,
        [
          member.userId,
          member.householdId,
          member.name,
          member.avatar,
          member.birthYear,
          member.ageGroup,
          member.toothStage,
          member.topTeethCount,
          member.bottomTeethCount,
          member.totalTeethCount,
          member.isActive,
          member.isArchived,
          JSON.stringify(member.memberPreferences || {}),
          member.createdAt,
          member.updatedAt,
          member.syncVersion,
          member.isDeleted,
          member.deletedAt
        ]
      );
    }

    if (members.length > 0) {
      await client.query(
        `
          update members
          set is_deleted = true,
              deleted_at = coalesce(deleted_at, now()),
              updated_at = now()
          where household_id = $1
            and not (user_id = any($2::text[]))
        `,
        [householdId, members.map((member) => member.userId)]
      );
    } else {
      await client.query(
        `
          update members
          set is_deleted = true,
              deleted_at = coalesce(deleted_at, now()),
              updated_at = now()
          where household_id = $1
        `,
        [householdId]
      );
    }

    const snapshot = await loadSnapshot(client, householdId);
    await client.query("commit");
    return res.json({ ok: true, ...snapshot });
  } catch (error) {
    await client.query("rollback");
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;