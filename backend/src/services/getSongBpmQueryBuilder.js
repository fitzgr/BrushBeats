const { COUNTRY_TERMS, LANGUAGE_TERMS, AGE_TERMS, BPM_TOLERANCE } = require("../config/musicContextConfig");
const { inferAgeBucketFromToothCount } = require("./ageInferenceService");
const { normalizeCountryCode } = require("./geoLocationService");

function normalizeLanguageTag(language) {
  const safe = String(language || "en-US").trim().replace("_", "-");
  const [primary = "en", region = "US"] = safe.split("-");
  return `${primary.toLowerCase()}-${region.toUpperCase()}`;
}

function dedupeTerms(terms) {
  const seen = new Set();
  const output = [];

  for (const term of terms || []) {
    const normalized = String(term || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(String(term).trim());
  }

  return output;
}

function buildBpmTermWindow(targetBpm) {
  const bpm = Math.max(60, Math.min(220, Math.round(Number(targetBpm) || 120)));
  const tolerance = BPM_TOLERANCE;
  return [`${bpm} bpm`, `${bpm - tolerance} bpm`, `${bpm + tolerance} bpm`];
}

function buildSongSearchContext(input = {}) {
  const browserLanguage = normalizeLanguageTag(input.browserLanguage || "en-US");
  const languagePrimary = browserLanguage.split("-")[0];
  const countryCode = normalizeCountryCode(input.countryCode || "US");
  const toothCount = Math.max(0, Math.min(32, Math.floor(Number(input.toothCount) || 0)));
  const ageBucket = inferAgeBucketFromToothCount(toothCount);
  const targetBpm = Math.max(60, Math.min(220, Math.round(Number(input.targetBpm) || 120)));
  const genreHint = String(input.genreHint || "").trim();

  return {
    browserLanguage,
    languagePrimary,
    countryCode,
    toothCount,
    ageBucket,
    targetBpm,
    genreHint: genreHint || undefined
  };
}

function buildGetSongBpmQuery(context, keyword = "") {
  const localeTerms = dedupeTerms([
    ...(COUNTRY_TERMS[context.countryCode] || []),
    ...(LANGUAGE_TERMS[context.languagePrimary] || [])
  ]);
  const ageTerms = dedupeTerms(AGE_TERMS[context.ageBucket] || AGE_TERMS.adult);
  const bpmTerms = buildBpmTermWindow(context.targetBpm);
  const keywordTerms = String(keyword || "").trim() ? [String(keyword).trim()] : [];
  const genreTerms = context.genreHint ? [context.genreHint] : [];

  const finalTerms = dedupeTerms([
    ...keywordTerms,
    ...genreTerms,
    ...localeTerms,
    ...ageTerms,
    ...bpmTerms,
    "official"
  ]);

  return finalTerms.join(" ").trim();
}

module.exports = {
  buildSongSearchContext,
  buildGetSongBpmQuery
};
