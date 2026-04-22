import React from "react";

const DECOR_BY_AGE = {
  infant: [
    { x: "6%", y: "12%", size: "44px", delay: "0s" },
    { x: "82%", y: "10%", size: "32px", delay: "1.2s" },
    { x: "12%", y: "78%", size: "36px", delay: "0.7s" },
    { x: "86%", y: "72%", size: "52px", delay: "1.6s" }
  ],
  toddler: [
    { x: "8%", y: "16%", size: "26px", delay: "0s" },
    { x: "80%", y: "14%", size: "22px", delay: "0.5s" },
    { x: "14%", y: "76%", size: "30px", delay: "1.1s" },
    { x: "84%", y: "68%", size: "28px", delay: "1.6s" },
    { x: "50%", y: "9%", size: "18px", delay: "0.8s" }
  ],
  primary: [
    { x: "7%", y: "12%", size: "24px", delay: "0s" },
    { x: "86%", y: "16%", size: "30px", delay: "0.7s" },
    { x: "10%", y: "82%", size: "28px", delay: "1.3s" },
    { x: "84%", y: "74%", size: "26px", delay: "1.9s" },
    { x: "48%", y: "8%", size: "20px", delay: "0.4s" }
  ],
  mixed: [
    { x: "10%", y: "18%", size: "20px", delay: "0s" },
    { x: "84%", y: "16%", size: "18px", delay: "0.9s" },
    { x: "14%", y: "78%", size: "22px", delay: "1.4s" },
    { x: "80%", y: "74%", size: "20px", delay: "0.6s" }
  ],
  adult: [
    { x: "12%", y: "14%", size: "18px", delay: "0s" },
    { x: "82%", y: "12%", size: "16px", delay: "1s" },
    { x: "16%", y: "80%", size: "18px", delay: "1.7s" },
    { x: "80%", y: "76%", size: "14px", delay: "0.8s" }
  ]
};

function DecorShape({ ageGroup, x, y, size, delay = "0s" }) {
  return (
    <span
      className={`age-overlay__decor age-overlay__decor--${ageGroup}`}
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        "--delay": delay
      }}
      aria-hidden="true"
    />
  );
}

function AgeOverlay({ ageGroup = "adult", phase = "idle", reducedMotion = false, lowPowerMode = false, className = "" }) {
  const safeAgeGroup = DECOR_BY_AGE[ageGroup] ? ageGroup : "adult";
  const decorItems = DECOR_BY_AGE[safeAgeGroup];

  return (
    <div
      className={[
        "age-overlay",
        `theme-${safeAgeGroup}`,
        `phase-${phase}`,
        reducedMotion ? "is-reduced-motion" : "",
        lowPowerMode ? "is-low-power" : "",
        className
      ].filter(Boolean).join(" ")}
      aria-hidden="true"
      role="presentation"
    >
      <div className="age-overlay__bg" />
      <div className="age-overlay__pattern" />
      <div className="age-overlay__glow" />
      <div className="age-overlay__decor-layer">
        {decorItems.map((item, index) => (
          <DecorShape key={`${safeAgeGroup}-${index}`} ageGroup={safeAgeGroup} {...item} />
        ))}
      </div>
      <div className="age-overlay__phase-accent" />
      {phase === "complete" ? <div className="age-overlay__celebration" /> : null}
    </div>
  );
}

export default AgeOverlay;
