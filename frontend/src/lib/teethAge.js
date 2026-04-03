function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export const teethToAgeFullChart = [
  { min: 28, max: 28, minAge: 12, maxAge: 99, unit: "years", phase: "adult" },
  { min: 29, max: 32, minAge: 17, maxAge: 25, unit: "years", phase: "adult" },
  { min: 25, max: 27, minAge: 7, maxAge: 12, unit: "years", phase: "mixed" },
  { min: 21, max: 24, minAge: 5, maxAge: 7, unit: "years", phase: "mixed" },
  { min: 17, max: 20, minAge: 20, maxAge: 36, unit: "months", phase: "primary" },
  { min: 13, max: 16, minAge: 16, maxAge: 22, unit: "months", phase: "toddler" },
  { min: 9, max: 12, minAge: 12, maxAge: 18, unit: "months", phase: "toddler" },
  { min: 5, max: 8, minAge: 10, maxAge: 14, unit: "months", phase: "infant" },
  { min: 1, max: 4, minAge: 6, maxAge: 10, unit: "months", phase: "infant" },
  { min: 0, max: 0, minAge: 0, maxAge: 5, unit: "months", phase: "infant" }
];

export function estimateAgeFromTeethFull(teethCount) {
  const safeTeeth = clamp(Math.floor(Number(teethCount) || 0), 0, 32);

  return teethToAgeFullChart.find((range) => safeTeeth >= range.min && safeTeeth <= range.max) || null;
}

export function describeTeethStage(teethCount) {
  const safeTeeth = clamp(Math.floor(Number(teethCount) || 0), 0, 32);
  const estimate = estimateAgeFromTeethFull(safeTeeth);

  if (!estimate) {
    return {
      safeTeeth,
      estimate: null,
      label: "Unknown Stage",
      description: "No tooth-age estimate available"
    };
  }

  const labelByPhase = {
    infant: "Infant Teeth",
    toddler: "Toddler Teeth",
    primary: "Primary Teeth",
    mixed: "Mixed Dentition",
    adult: safeTeeth >= 29 ? "Full Adult Smile" : "Adult Smile"
  };

  const description =
    estimate.unit === "months"
      ? `About ${estimate.minAge}-${estimate.maxAge} months old`
      : estimate.maxAge >= 99
        ? `${estimate.minAge}+ years old`
        : `About ${estimate.minAge}-${estimate.maxAge} years old`;

  return {
    safeTeeth,
    estimate,
    label: labelByPhase[estimate.phase] || "Detected Stage",
    description
  };
}