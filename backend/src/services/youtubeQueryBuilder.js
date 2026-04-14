const {
  AGE_TERMS,
  COUNTRY_TERMS,
  LANGUAGE_TERMS,
  YOUTUBE_LANGUAGE_MAP,
  QUERY_VARIANT_COUNT,
  BPM_TOLERANCE
} = require("../config/musicContextConfig");

function normalizeLanguageTag(language) {
  const safe = String(language || "en").trim().replace("_", "-");
  const [primary = "en", region = ""] = safe.split("-");
  return `${primary.toLowerCase()}${region ? `-${region.toUpperCase()}` : ""}`;
}

function getPrimaryLanguage(languageTag) {
  return normalizeLanguageTag(languageTag).split("-")[0] || "en";
}

function buildBpmTerms(targetBpm) {
  const bpm = Math.max(60, Math.min(220, Math.round(Number(targetBpm) || 120)));
  const low = bpm - BPM_TOLERANCE;
  const high = bpm + BPM_TOLERANCE;
  return [`${bpm} bpm`, `${low} bpm`, `${high} bpm`];
}

function dedupeTerms(terms) {
  const seen = new Set();
  const output = [];

  for (const term of terms) {
    const normalized = String(term || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(String(term).trim());
  }

  return output;
}

function buildBaseTermGroups(context, songTitle, songArtist) {
  const primaryLanguage = getPrimaryLanguage(context.browserLanguage);
  const localeTerms = dedupeTerms([
    ...(COUNTRY_TERMS[context.countryCode] || []),
    ...(LANGUAGE_TERMS[primaryLanguage] || [])
  ]);
  const ageTerms = AGE_TERMS[context.ageBucket] || AGE_TERMS.adult;
  const bpmTerms = buildBpmTerms(context.targetBpm);
  const genreTerms = context.genreHint ? [context.genreHint] : ["pop", "dance"];
  const songTerms = dedupeTerms([songArtist, songTitle]);

  return {
    bpmTerms,
    localeTerms,
    ageTerms,
    genreTerms,
    songTerms
  };
}

function joinOrGroup(terms) {
  const safe = dedupeTerms(terms);
  if (!safe.length) {
    return "";
  }
  return `(${safe.map((term) => `\"${term}\"`).join(" OR ")})`;
}

function buildQueryVariants(context, songTitle, songArtist) {
  const groups = buildBaseTermGroups(context, songTitle, songArtist);
  const variants = [
    [joinOrGroup(groups.bpmTerms), joinOrGroup(groups.localeTerms), joinOrGroup(groups.genreTerms), joinOrGroup(groups.ageTerms), "-live"],
    [joinOrGroup(groups.songTerms), joinOrGroup(groups.localeTerms), joinOrGroup(groups.bpmTerms), joinOrGroup(groups.ageTerms), "-live"],
    [joinOrGroup(groups.genreTerms), joinOrGroup(groups.bpmTerms), joinOrGroup(groups.songTerms), "official", "-live"],
    [joinOrGroup(groups.songTerms), joinOrGroup(groups.bpmTerms), "official", "clean", "-live"],
    [joinOrGroup(groups.songTerms), joinOrGroup(groups.genreTerms), joinOrGroup(groups.bpmTerms), "-live"]
  ];

  return variants
    .slice(0, QUERY_VARIANT_COUNT)
    .map((parts) => parts.filter(Boolean).join(" "));
}

function buildYoutubeSearchRequest(_context, query) {
  return {
    part: "snippet",
    type: "video",
    maxResults: 25,
    q: query,
    videoEmbeddable: "true",
    videoSyndicated: "true",
    safeSearch: "moderate"
  };
}

function buildYoutubeSearchRequests(context, songTitle, songArtist) {
  const safeTitle = String(songTitle || "").trim();
  const safeArtist = String(songArtist || "").trim();
  const baseSong = [`"${safeArtist}"`, `"${safeTitle}"`].filter(Boolean).join(" ");
  const queries = [
    `${baseSong} official audio -live -karaoke -cover -remix`,
    `${baseSong} official video -live -karaoke -cover -remix`,
    `${baseSong} lyric -live -karaoke -cover`,
    `${baseSong} clean audio -live -karaoke -cover`,
    `${baseSong} audio -live -karaoke -cover -remix`
  ];

  return queries.slice(0, QUERY_VARIANT_COUNT).map((query, index) => ({
    label: `variant-${index + 1}`,
    query,
    params: buildYoutubeSearchRequest(context, query)
  }));
}

module.exports = {
  normalizeLanguageTag,
  buildYoutubeSearchRequest,
  buildYoutubeSearchRequests
};
