import React from "react";
import { resolveOverlayTheme } from "../lib/overlayThemes";

function DecorShape({ item, index }) {
  return (
    <span
      className={`age-overlay__decor age-overlay__decor--${item.kind} motion-${item.motion}`}
      style={{
        left: item.x,
        top: item.y,
        width: item.size,
        height: item.size,
        "--delay": `${index * 0.24}s`
      }}
      aria-hidden="true"
    >
      <span className="age-overlay__decor-token">{item.shortLabel}</span>
      <span className="age-overlay__decor-caption">{item.label}</span>
    </span>
  );
}

function AgeOverlay({ ageGroup = "adult", themeId = "auto", phase = "idle", reducedMotion = false, lowPowerMode = false, className = "" }) {
  const safeAgeGroup = ["infant", "toddler", "primary", "mixed", "adult"].includes(ageGroup) ? ageGroup : "adult";
  const theme = resolveOverlayTheme({ ageGroup: safeAgeGroup, themeId });

  return (
    <div
      className={[
        "age-overlay",
        `theme-${safeAgeGroup}`,
        `overlay-theme-${theme.id}`,
        `phase-${phase}`,
        reducedMotion ? "is-reduced-motion" : "",
        lowPowerMode ? "is-low-power" : "",
        className
      ].filter(Boolean).join(" ")}
      data-overlay-theme={theme.id}
      data-overlay-pattern={theme.pattern}
      data-overlay-celebration={theme.celebration}
      style={{
        "--overlay-bg-1": theme.colors.bgPrimary,
        "--overlay-bg-2": theme.colors.bgSecondary,
        "--overlay-accent-1": theme.colors.accent,
        "--overlay-accent-2": theme.colors.edge,
        "--overlay-accent-3": theme.colors.chipText,
        "--overlay-glow": theme.colors.glow,
        "--overlay-pattern-color": theme.colors.pattern,
        "--overlay-chip-bg": theme.colors.chip,
        "--overlay-chip-text": theme.colors.chipText,
        "--overlay-chip-edge": theme.colors.edge,
        "--overlay-accent-soft": theme.colors.accentSoft
      }}
      aria-hidden="true"
      role="presentation"
    >
      <div className="age-overlay__bg" />
      <div className="age-overlay__pattern" />
      <div className="age-overlay__glow" />
      <div className="age-overlay__decor-layer">
        {theme.assets.map((item, index) => (
          <DecorShape key={`${theme.id}-${index}`} item={item} index={index} />
        ))}
      </div>
      <div className="age-overlay__phase-accent" />
      {phase === "complete" ? <div className="age-overlay__celebration" /> : null}
    </div>
  );
}

export default AgeOverlay;
