import { useState } from "react";

function buildRewardSettingsDraft(rewardSettings = {}) {
  return {
    levelBasePoints: Number(rewardSettings.levelBasePoints || 100),
    levelStepPoints: Number(rewardSettings.levelStepPoints || 120),
    levelGrowthPoints: Number(rewardSettings.levelGrowthPoints || 20),
    brushingSessionPoints: Number(rewardSettings.brushingSessionPoints || 12),
    supportRoutinePoints: Number(rewardSettings.supportRoutinePoints || 8),
    toothMilestonePoints: Number(rewardSettings.toothMilestonePoints || 18),
    routineVarietyPoints: Number(rewardSettings.routineVarietyPoints || 10)
  };
}

function buildGoalSettingsDraft(goalSettings = {}) {
  return {
    weeklyBrushingSessions: Number(goalSettings.weeklyBrushingSessions || 14),
    weeklySupportRoutines: Number(goalSettings.weeklySupportRoutines || 5)
  };
}

function buildEmptyMemberDraft() {
  return {
    name: "",
    topTeethCount: 16,
    bottomTeethCount: 16,
    preferredLanguage: "en",
    brushingHand: "right",
    brushType: "manual",
    brushDurationSeconds: 120,
    keyword: ""
  };
}

function MemberEditor({ t, member, saving, activeUserId, onSave, onArchive, onRestore, onRemove, onActivate }) {
  const [draft, setDraft] = useState(() => ({
    name: member.name || "",
    topTeethCount: Number(member.topTeethCount || 0),
    bottomTeethCount: Number(member.bottomTeethCount || 0),
    preferredLanguage: member.preferredLanguage || "en",
    brushingHand: member.brushingHand || "right",
    brushType: member.brushType || "manual",
    brushDurationSeconds: Number(member.brushDurationSeconds || 120),
    keyword: member.keyword || ""
  }));

  return (
    <article className={`household-member-editor${member.userId === activeUserId ? " active" : ""}`}>
      <div className="household-member-editor-header">
        <div>
          <strong>{member.name}</strong>
          <span>{t("app.householdManagement.memberSummary", { stage: t(`age.stages.${member.toothStage || "unknown"}.label`) })}</span>
        </div>
        <div className="household-member-editor-actions">
          {member.userId !== activeUserId && !member.isArchived && (
            <button type="button" className="action-btn secondary" onClick={() => onActivate(member.userId)}>
              {t("app.householdManagement.activate")}
            </button>
          )}
          {!member.isArchived ? (
            <button type="button" className="action-btn secondary" onClick={() => onArchive(member.userId)}>
              {t("app.householdManagement.archive")}
            </button>
          ) : (
            <button type="button" className="action-btn secondary" onClick={() => onRestore(member.userId)}>
              {t("app.householdManagement.restore")}
            </button>
          )}
          <button type="button" className="action-btn secondary" onClick={() => onRemove(member.userId)}>
            {t("common.buttons.remove")}
          </button>
        </div>
      </div>
      <div className="household-management-grid">
        <label>
          <span>{t("app.householdManagement.fields.memberName")}</span>
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          <span>{t("app.householdManagement.fields.topTeeth")}</span>
          <input type="number" min="0" max="16" value={draft.topTeethCount} onChange={(event) => setDraft((current) => ({ ...current, topTeethCount: Number(event.target.value) }))} />
        </label>
        <label>
          <span>{t("app.householdManagement.fields.bottomTeeth")}</span>
          <input type="number" min="0" max="16" value={draft.bottomTeethCount} onChange={(event) => setDraft((current) => ({ ...current, bottomTeethCount: Number(event.target.value) }))} />
        </label>
        <label>
          <span>{t("app.householdManagement.fields.language")}</span>
          <select value={draft.preferredLanguage} onChange={(event) => setDraft((current) => ({ ...current, preferredLanguage: event.target.value }))}>
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="tr">Turkce</option>
          </select>
        </label>
        <label>
          <span>{t("app.householdManagement.fields.brushingHand")}</span>
          <select value={draft.brushingHand} onChange={(event) => setDraft((current) => ({ ...current, brushingHand: event.target.value }))}>
            <option value="right">{t("common.hands.right")}</option>
            <option value="left">{t("common.hands.left")}</option>
          </select>
        </label>
        <label>
          <span>{t("app.householdManagement.fields.brushType")}</span>
          <select value={draft.brushType} onChange={(event) => setDraft((current) => ({ ...current, brushType: event.target.value }))}>
            <option value="manual">{t("brushing.brushTypeOptions.manual")}</option>
            <option value="electric">{t("brushing.brushTypeOptions.electric")}</option>
          </select>
        </label>
        <label>
          <span>{t("app.householdManagement.fields.duration")}</span>
          <input type="number" min="30" step="30" value={draft.brushDurationSeconds} onChange={(event) => setDraft((current) => ({ ...current, brushDurationSeconds: Number(event.target.value) }))} />
        </label>
        <label>
          <span>{t("app.householdManagement.fields.keyword")}</span>
          <input value={draft.keyword} onChange={(event) => setDraft((current) => ({ ...current, keyword: event.target.value }))} />
        </label>
      </div>
      <div className="household-management-inline-actions">
        <button type="button" className="action-btn" disabled={saving} onClick={() => onSave(member.userId, draft)}>
          {saving ? t("app.householdManagement.saving") : t("common.buttons.save")}
        </button>
      </div>
    </article>
  );
}

export default function HouseholdManagementPanel({
  t,
  management,
  activeUserId,
  saving,
  onSaveHousehold,
  onSaveMember,
  onArchiveMember,
  onRestoreMember,
  onRemoveMember,
  onActivateMember
}) {
  const [householdName, setHouseholdName] = useState(() => management?.household?.householdName || "");
  const [rewardSettings, setRewardSettings] = useState(() => buildRewardSettingsDraft(management?.household?.rewardSettings));
  const [goalSettings, setGoalSettings] = useState(() => buildGoalSettingsDraft(management?.household?.goalSettings));
  const [newMemberDraft, setNewMemberDraft] = useState(buildEmptyMemberDraft());

  if (!management?.household) {
    return null;
  }

  return (
    <section className="household-management-panel" aria-label={t("app.householdManagement.ariaLabel")}>
      <div className="household-management-header">
        <div>
          <p className="household-management-eyebrow">{t("app.householdManagement.eyebrow")}</p>
          <h2>{t("app.householdManagement.title")}</h2>
          <p>{t("app.householdManagement.subtitle")}</p>
        </div>
      </div>

      <section className="household-management-section">
        <div className="household-management-section-header">
          <strong>{t("app.householdManagement.householdSettingsTitle")}</strong>
          <span>{t("app.householdManagement.householdSettingsSummary")}</span>
        </div>
        <div className="household-management-grid">
          <label>
            <span>{t("app.householdManagement.fields.householdName")}</span>
            <input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} />
          </label>
          <div className="household-management-readonly">
            <span>{t("app.householdManagement.fields.subscriptionTier")}</span>
            <strong>{management.household.subscriptionTier || "free"}</strong>
          </div>
          <div className="household-management-readonly">
            <span>{t("app.householdManagement.fields.syncStatus")}</span>
            <strong>{management.household.syncStatus || "local-only"}</strong>
          </div>
          <label>
            <span>{t("app.householdManagement.fields.levelBasePoints")}</span>
            <input type="number" min="40" step="10" value={rewardSettings.levelBasePoints} onChange={(event) => setRewardSettings((current) => ({ ...current, levelBasePoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.levelStepPoints")}</span>
            <input type="number" min="40" step="10" value={rewardSettings.levelStepPoints} onChange={(event) => setRewardSettings((current) => ({ ...current, levelStepPoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.levelGrowthPoints")}</span>
            <input type="number" min="0" step="5" value={rewardSettings.levelGrowthPoints} onChange={(event) => setRewardSettings((current) => ({ ...current, levelGrowthPoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.brushingSessionPoints")}</span>
            <input type="number" min="1" step="1" value={rewardSettings.brushingSessionPoints} onChange={(event) => setRewardSettings((current) => ({ ...current, brushingSessionPoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.supportRoutinePoints")}</span>
            <input type="number" min="1" step="1" value={rewardSettings.supportRoutinePoints} onChange={(event) => setRewardSettings((current) => ({ ...current, supportRoutinePoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.toothMilestonePoints")}</span>
            <input type="number" min="1" step="1" value={rewardSettings.toothMilestonePoints} onChange={(event) => setRewardSettings((current) => ({ ...current, toothMilestonePoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.routineVarietyPoints")}</span>
            <input type="number" min="0" step="1" value={rewardSettings.routineVarietyPoints} onChange={(event) => setRewardSettings((current) => ({ ...current, routineVarietyPoints: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.weeklyBrushingSessions")}</span>
            <input type="number" min="1" step="1" value={goalSettings.weeklyBrushingSessions} onChange={(event) => setGoalSettings((current) => ({ ...current, weeklyBrushingSessions: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.weeklySupportRoutines")}</span>
            <input type="number" min="0" step="1" value={goalSettings.weeklySupportRoutines} onChange={(event) => setGoalSettings((current) => ({ ...current, weeklySupportRoutines: Number(event.target.value) }))} />
          </label>
        </div>
        <p className="household-management-helper-copy">{t("app.householdManagement.rewardSettingsSummary")}</p>
        <div className="household-management-inline-actions">
          <button type="button" className="action-btn" disabled={saving} onClick={() => onSaveHousehold({ householdName, rewardSettings, goalSettings })}>
            {saving ? t("app.householdManagement.saving") : t("common.buttons.save")}
          </button>
        </div>
      </section>

      <section className="household-management-section">
        <div className="household-management-section-header">
          <strong>{t("app.householdManagement.membersTitle")}</strong>
          <span>{t("app.householdManagement.membersSummary", { count: management.members.length })}</span>
        </div>
        <div className="household-management-list">
          {management.members.map((member) => (
            <MemberEditor
              key={`${member.userId}:${member.updatedAt || "active"}:${member.isArchived ? "archived" : "live"}`}
              t={t}
              member={member}
              saving={saving}
              activeUserId={activeUserId}
              onSave={onSaveMember}
              onArchive={onArchiveMember}
              onRestore={onRestoreMember}
              onRemove={onRemoveMember}
              onActivate={onActivateMember}
            />
          ))}
        </div>
      </section>

      <section className="household-management-section">
        <div className="household-management-section-header">
          <strong>{t("app.householdManagement.addMemberTitle")}</strong>
          <span>{t("app.householdManagement.addMemberSummary")}</span>
        </div>
        <div className="household-management-grid">
          <label>
            <span>{t("app.householdManagement.fields.memberName")}</span>
            <input value={newMemberDraft.name} onChange={(event) => setNewMemberDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.topTeeth")}</span>
            <input type="number" min="0" max="16" value={newMemberDraft.topTeethCount} onChange={(event) => setNewMemberDraft((current) => ({ ...current, topTeethCount: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.bottomTeeth")}</span>
            <input type="number" min="0" max="16" value={newMemberDraft.bottomTeethCount} onChange={(event) => setNewMemberDraft((current) => ({ ...current, bottomTeethCount: Number(event.target.value) }))} />
          </label>
          <label>
            <span>{t("app.householdManagement.fields.language")}</span>
            <select value={newMemberDraft.preferredLanguage} onChange={(event) => setNewMemberDraft((current) => ({ ...current, preferredLanguage: event.target.value }))}>
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="tr">Turkce</option>
            </select>
          </label>
        </div>
        <div className="household-management-inline-actions">
          <button
            type="button"
            className="action-btn"
            disabled={saving || !newMemberDraft.name.trim()}
            onClick={async () => {
              await onSaveMember(null, newMemberDraft);
              setNewMemberDraft(buildEmptyMemberDraft());
            }}
          >
            {saving ? t("app.householdManagement.saving") : t("common.buttons.addMember")}
          </button>
        </div>
      </section>

      {management.archivedMembers.length > 0 && (
        <section className="household-management-section">
          <div className="household-management-section-header">
            <strong>{t("app.householdManagement.archivedTitle")}</strong>
            <span>{t("app.householdManagement.archivedSummary", { count: management.archivedMembers.length })}</span>
          </div>
          <div className="household-management-list">
            {management.archivedMembers.map((member) => (
              <MemberEditor
                key={`${member.userId}:${member.updatedAt || "archived"}:archived`}
                t={t}
                member={member}
                saving={saving}
                activeUserId={activeUserId}
                onSave={onSaveMember}
                onArchive={onArchiveMember}
                onRestore={onRestoreMember}
                onRemove={onRemoveMember}
                onActivate={onActivateMember}
              />
            ))}
          </div>
        </section>
      )}

      <section className="household-management-section household-management-caregiver-note">
        <div className="household-management-section-header">
          <strong>{t("app.householdManagement.caregiverTitle")}</strong>
          <span>{t("app.householdManagement.caregiverSummary")}</span>
        </div>
        <p>{t("app.householdManagement.caregiverNote")}</p>
      </section>
    </section>
  );
}