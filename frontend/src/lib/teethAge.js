function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeAgeUnit(unit) {
  return unit === "months" ? "months" : "years";
}

function normalizeAgeValue(value, unit) {
  const numericValue = Number(value);
  const fallback = unit === "months" ? 24 : 2;
  const max = unit === "months" ? 216 : 99;

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return clamp(Math.round(numericValue), 0, max);
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

export function buildAgeEstimateFromActualAge(value, unit = "years") {
  const normalizedUnit = normalizeAgeUnit(unit);
  const exactAge = normalizeAgeValue(value, normalizedUnit);
  const ageInMonths = normalizedUnit === "months" ? exactAge : exactAge * 12;

  let phase = "adult";

  if (ageInMonths <= 14) {
    phase = "infant";
  } else if (ageInMonths <= 22) {
    phase = "toddler";
  } else if (ageInMonths <= 59) {
    phase = "primary";
  } else if (ageInMonths <= 144) {
    phase = "mixed";
  }

  return {
    phase,
    unit: normalizedUnit,
    minAge: exactAge,
    maxAge: exactAge,
    exactAge,
    ageInMonths,
    simulated: true
  };
}

export function buildAgeEstimateFromPhase(phase = "adult") {
  const representativeByPhase = {
    infant: { unit: "months", value: 10 },
    toddler: { unit: "months", value: 18 },
    primary: { unit: "years", value: 3 },
    mixed: { unit: "years", value: 9 },
    adult: { unit: "years", value: 24 }
  };
  const selected = representativeByPhase[phase] || representativeByPhase.adult;
  const estimate = buildAgeEstimateFromActualAge(selected.value, selected.unit);

  return {
    ...estimate,
    phase: representativeByPhase[phase] ? phase : "adult",
    simulatedFromPhase: true
  };
}

export function inferMusicAgeBucket(ageEstimate) {
  if (!ageEstimate) {
    return "adult";
  }

  const ageInMonths = Number.isFinite(Number(ageEstimate.ageInMonths))
    ? Number(ageEstimate.ageInMonths)
    : ageEstimate.unit === "months"
      ? Number(ageEstimate.maxAge || ageEstimate.minAge || 0)
      : Number(ageEstimate.maxAge || ageEstimate.minAge || 0) * 12;

  if (ageInMonths >= 65 * 12) {
    return "senior";
  }

  if (ageInMonths >= 13 * 12 && ageInMonths < 18 * 12) {
    return "teen";
  }

  if (ageInMonths >= 18 * 12) {
    return "adult";
  }

  return "child";
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