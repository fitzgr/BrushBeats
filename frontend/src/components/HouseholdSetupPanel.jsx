import { estimateAgeFromTeethFull } from "../lib/teethAge";

function buildAgeSummary(t, totalTeethCount) {
  const ageEstimate = estimateAgeFromTeethFull(totalTeethCount);
  if (!ageEstimate) {
    return t("age.descriptions.unknownRange");
  }

  if (ageEstimate.unit === "months") {
    return t("age.descriptions.monthRange", {
      min: ageEstimate.minAge,
      max: ageEstimate.maxAge
    });
  }

  if (ageEstimate.maxAge >= 99) {
    return t("age.descriptions.yearsPlus", {
      min: ageEstimate.minAge
    });
  }

  return t("age.descriptions.yearRange", {
    min: ageEstimate.minAge,
    max: ageEstimate.maxAge
  });
}

export default function HouseholdSetupPanel({
  t,
  draft,
  saving,
  requiresMigrationReview,
  onDraftChange,
  onAdditionalMemberChange,
  onAddMember,
  onRemoveMember,
  onDismiss,
  onSubmit
}) {
  const totalTeethCount = Number(draft?.topTeethCount || 0) + Number(draft?.bottomTeethCount || 0);
  const ageEstimate = estimateAgeFromTeethFull(totalTeethCount);
  const stageKey = ageEstimate?.phase === "adult"
    ? totalTeethCount >= 29 ? "fullAdultSmile" : "adultSmile"
    : ["infant", "toddler", "primary", "mixed"].includes(ageEstimate?.phase)
      ? ageEstimate.phase
      : "unknown";
  const stageLabel = stageKey === "unknown"
    ? t("age.stages.unknown.label")
    : t(`age.stages.${stageKey}`);

  return (
    <section className="household-setup-panel" aria-label={t("app.householdSetup.ariaLabel")}>
      <div className="household-setup-copy">
        <p className="household-setup-eyebrow">{t("app.householdSetup.eyebrow")}</p>
        <h2>{requiresMigrationReview ? t("app.householdSetup.reviewTitle") : t("app.householdSetup.title")}</h2>
        <p>{requiresMigrationReview ? t("app.householdSetup.reviewIntro") : t("app.householdSetup.intro")}</p>
        <div className="household-setup-summary">
          <span>{t("app.householdSetup.summary.mode", { mode: requiresMigrationReview ? t("app.householdSetup.summary.review") : t("app.householdSetup.summary.setup") })}</span>
          <span>{t("app.householdSetup.summary.teeth", { count: totalTeethCount })}</span>
          <span>{t("app.householdSetup.summary.stage", { stage: stageLabel })}</span>
        </div>
      </div>
      <form className="household-setup-form" onSubmit={onSubmit}>
        <label>
          <span>{t("app.householdSetup.fields.householdName")}</span>
          <input value={draft.householdName} onChange={(event) => onDraftChange("householdName", event.target.value)} />
        </label>
        <label>
          <span>{t("app.householdSetup.fields.memberName")}</span>
          <input value={draft.memberName} onChange={(event) => onDraftChange("memberName", event.target.value)} />
        </label>
        <div className="household-setup-grid">
          <label>
            <span>{t("app.householdSetup.fields.topTeeth")}</span>
            <input type="number" min="0" max="16" value={draft.topTeethCount} onChange={(event) => onDraftChange("topTeethCount", event.target.value)} />
          </label>
          <label>
            <span>{t("app.householdSetup.fields.bottomTeeth")}</span>
            <input type="number" min="0" max="16" value={draft.bottomTeethCount} onChange={(event) => onDraftChange("bottomTeethCount", event.target.value)} />
          </label>
        </div>
        <p className="household-setup-helper">{t("app.householdSetup.inferredAge", { description: buildAgeSummary(t, totalTeethCount) })}</p>
        <div className="household-setup-grid">
          <label>
            <span>{t("app.householdSetup.fields.brushingHand")}</span>
            <select value={draft.brushingHand} onChange={(event) => onDraftChange("brushingHand", event.target.value)}>
              <option value="right">{t("common.buttons.rightHand")}</option>
              <option value="left">{t("common.buttons.leftHand")}</option>
            </select>
          </label>
          <label>
            <span>{t("app.householdSetup.fields.brushType")}</span>
            <select value={draft.brushType} onChange={(event) => onDraftChange("brushType", event.target.value)}>
              <option value="manual">{t("brushing.brushTypeManual")}</option>
              <option value="electric">{t("brushing.brushTypeElectric")}</option>
            </select>
          </label>
        </div>
        <div className="household-setup-grid">
          <label>
            <span>{t("app.householdSetup.fields.duration")}</span>
            <select value={draft.brushDurationSeconds} onChange={(event) => onDraftChange("brushDurationSeconds", Number(event.target.value))}>
              <option value="90">1:30</option>
              <option value="120">2:00</option>
              <option value="150">2:30</option>
              <option value="180">3:00</option>
            </select>
          </label>
          <label>
            <span>{t("app.householdSetup.fields.keyword")}</span>
            <input value={draft.keyword} onChange={(event) => onDraftChange("keyword", event.target.value)} placeholder={t("music.searchPlaceholder")} />
          </label>
        </div>
        <section className="household-members-section" aria-label={t("app.householdSetup.additionalMembersTitle")}>
          <div className="household-members-header">
            <strong>{t("app.householdSetup.additionalMembersTitle")}</strong>
            <button type="button" className="action-btn secondary" onClick={onAddMember}>
              {t("common.buttons.addMember")}
            </button>
          </div>
          {(draft.additionalMembers || []).map((member, index) => (
            <div key={member.clientId || index} className="household-member-card">
              <div className="household-member-card-header">
                <strong>{t("app.householdSetup.memberLabel", { number: index + 2 })}</strong>
                <button type="button" className="action-btn secondary" onClick={() => onRemoveMember(member.clientId)}>
                  {t("common.buttons.removeMember")}
                </button>
              </div>
              <div className="household-setup-grid">
                <label>
                  <span>{t("app.householdSetup.fields.memberName")}</span>
                  <input value={member.memberName} onChange={(event) => onAdditionalMemberChange(member.clientId, "memberName", event.target.value)} />
                </label>
                <label>
                  <span>{t("app.householdSetup.fields.topTeeth")}</span>
                  <input type="number" min="0" max="16" value={member.topTeethCount} onChange={(event) => onAdditionalMemberChange(member.clientId, "topTeethCount", event.target.value)} />
                </label>
              </div>
              <label>
                <span>{t("app.householdSetup.fields.bottomTeeth")}</span>
                <input type="number" min="0" max="16" value={member.bottomTeethCount} onChange={(event) => onAdditionalMemberChange(member.clientId, "bottomTeethCount", event.target.value)} />
              </label>
            </div>
          ))}
        </section>
        <div className="household-setup-actions">
          <button type="submit" className="action-btn" disabled={saving}>
            {saving ? t("app.householdSetup.saving") : t("app.householdSetup.complete")}
          </button>
          <button type="button" className="action-btn secondary" onClick={onDismiss} disabled={saving}>
            {t("common.buttons.continueLater")}
          </button>
        </div>
      </form>
    </section>
  );
}