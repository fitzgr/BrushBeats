import { useTranslation } from "react-i18next";
import { teethToAgeFullChart } from "../lib/teethAge";

function BPMCalculator({
  brusherProfile,
  values,
  onChange,
  onContinueToMusic,
  bpmData,
  brushDurationSeconds,
  loading,
  isMobile,
}) {
  const { t } = useTranslation();
  const toothRange = { min: 0, max: 16, hint: t("settings.toothRangeHint") };
  const rangeMarks = Array.from({ length: toothRange.max - toothRange.min + 1 }, (_, index) => toothRange.min + index);
  const totalTeeth = Number(values.top || 0) + Number(values.bottom || 0);
  const perRowMarkers = [0, 2, 4, 6, 8, 10, 12, 14, 16];
  const linearMarkers = [0, 4, 8, 12, 16, 20, 24, 28, 32];
  const ageTimelineMarkers = [...teethToAgeFullChart].sort((left, right) => left.max - right.max);

  function formatApproximateAge(estimate) {
    if (!estimate) {
      return "";
    }

    const unit = t(`age.units.${estimate.unit}`);
    return estimate.maxAge >= 99
      ? t("settings.approximateAge.plus", { min: estimate.minAge, unit })
      : t("settings.approximateAge.range", { min: estimate.minAge, max: estimate.maxAge, unit });
  }

  return (
    <section className="card calculator">
      <h2>{isMobile ? t("settings.resultsTitleMobile") : t("settings.resultsTitle")}</h2>
      <p>
        {isMobile
          ? t("settings.topBottomIntroMobile")
          : t("settings.topBottomIntroDesktop")}
      </p>

      <div className="calculator-overview">
        <div className="profile-summary" aria-live="polite">
          <span className="profile-summary-label">{t("settings.detectedStage")}</span>
          <strong>{brusherProfile?.label || t("age.stages.adultSmile")}</strong>
          <span>{brusherProfile?.description || t("age.descriptions.yearsPlus", { min: 18 })}</span>
          {brusherProfile?.estimate && (
            <span className="profile-summary-age">
              {formatApproximateAge(brusherProfile.estimate)}
            </span>
          )}
        </div>

        <div className="bpm-pill" data-loading={loading}>
          <span className="label">{t("settings.searchBpm")}</span>
          <strong>{bpmData?.searchBpm ?? bpmData?.musicBpm ?? "--"}</strong>
          <span className="sub">
            {bpmData
              ? t("settings.searchBpmDetails", {
                  secondsPerTooth: bpmData.secondsPerTooth,
                  transitions: bpmData.totalTransitions,
                  transitionSeconds: bpmData.transitionBufferSeconds
                })
              : t("settings.searchBpmFallback", {
                  minutes: Math.round((brushDurationSeconds || 120) / 60 * 10) / 10
                })}
          </span>
        </div>
      </div>

      <div className="controls-grid">
        <label className="tooth-count-control">
          <span className="slider-label-row">
            <span>{t("settings.topTeeth")}</span>
            <strong className="slider-value-badge">{values.top}</strong>
          </span>
          <span className="tooth-range-shell">
            <input
              className="tooth-range-input"
              type="range"
              min={toothRange.min}
              max={toothRange.max}
              step="1"
              value={values.top}
              onChange={(event) => onChange("top", Number(event.target.value))}
            />
            <span className="tooth-range-ticks" aria-hidden="true">
              {rangeMarks.map((mark) => (
                <span
                  key={`top-${mark}`}
                  className="tooth-range-tick"
                  style={{ left: `${((mark - toothRange.min) / Math.max(1, toothRange.max - toothRange.min)) * 100}%` }}
                />
              ))}
            </span>
          </span>
          <span className="tooth-range-scale" aria-hidden="true">
            {perRowMarkers.map((marker) => (
              <span
                key={`top-scale-${marker}`}
                className="tooth-range-scale-label"
                style={{ left: `${(marker / toothRange.max) * 100}%` }}
              >
                {marker}
              </span>
            ))}
          </span>
          <span className="tooth-range-scale-caption">{t("settings.teethCount")}</span>
          <span className="slider-range-hint">{toothRange.hint}</span>
        </label>

        <label className="tooth-count-control">
          <span className="slider-label-row">
            <span>{t("settings.bottomTeeth")}</span>
            <strong className="slider-value-badge">{values.bottom}</strong>
          </span>
          <span className="tooth-range-shell">
            <input
              className="tooth-range-input"
              type="range"
              min={toothRange.min}
              max={toothRange.max}
              step="1"
              value={values.bottom}
              onChange={(event) => onChange("bottom", Number(event.target.value))}
            />
            <span className="tooth-range-ticks" aria-hidden="true">
              {rangeMarks.map((mark) => (
                <span
                  key={`bottom-${mark}`}
                  className="tooth-range-tick"
                  style={{ left: `${((mark - toothRange.min) / Math.max(1, toothRange.max - toothRange.min)) * 100}%` }}
                />
              ))}
            </span>
          </span>
          <span className="tooth-range-scale" aria-hidden="true">
            {perRowMarkers.map((marker) => (
              <span
                key={`bottom-scale-${marker}`}
                className="tooth-range-scale-label"
                style={{ left: `${(marker / toothRange.max) * 100}%` }}
              >
                {marker}
              </span>
            ))}
          </span>
        </label>
      </div>

      <div className="teeth-growth-scale" aria-label="Total teeth to age scale">
        <div className="teeth-growth-header">
          <span className="profile-summary-label">{t("settings.totalTeethSelected")}</span>
          <strong>{t("settings.totalTeethValue", { count: totalTeeth })}</strong>
        </div>
        <div className="teeth-growth-track">
          <span className="teeth-growth-fill" style={{ width: `${(totalTeeth / 32) * 100}%` }} />
          <span className="teeth-growth-indicator" style={{ left: `${(totalTeeth / 32) * 100}%` }} />
          {linearMarkers.map((marker) => (
            <span
              key={`teeth-marker-${marker}`}
              className="teeth-growth-marker"
              style={{ left: `${(marker / 32) * 100}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="teeth-growth-labels" aria-hidden="true">
          {linearMarkers.map((marker) => (
            <span key={`teeth-label-${marker}`}>{marker}</span>
          ))}
        </div>
        <div className="teeth-age-band-list">
          {ageTimelineMarkers.map((marker) => (
            <span key={`${marker.min}-${marker.max}`} className="teeth-age-band">
              <strong>{marker.min}-{marker.max}</strong>
              <span>{t(`age.phases.${marker.phase}`)}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="form-note">{t("settings.formNote")}</p>

      <p className="headline">
        {bpmData
          ? t("settings.headlineCalculated", {
              totalTeeth: bpmData.totalTeeth,
              toothTime: bpmData.totalToothTimeSeconds,
              transitionTime: bpmData.totalTransitionSeconds,
              minutes: Math.round((bpmData.totalBrushingSeconds / 60) * 10) / 10
            })
          : t("settings.headlineEmpty")}
      </p>

      <div className="next-step-card">
        <strong>{t("settings.nextStepTitle")}</strong>
        <span>{t("settings.nextStepDescription")}</span>
        <button type="button" className="action-btn secondary next-step-btn" onClick={onContinueToMusic} disabled={totalTeeth <= 0}>
          {t("common.buttons.continueToMusic")}
        </button>
      </div>
    </section>
  );
}

export default BPMCalculator;
