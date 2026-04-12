function normalizeLanguageTag(language) {
  const safe = String(language || "en-US").trim().replace("_", "-");
  const [primary = "en", region = "US"] = safe.split("-");
  return `${primary.toLowerCase()}-${region.toUpperCase()}`;
}

export function detectBrowserLanguage() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "en-US";
  }

  const languages = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || "en-US"];

  return normalizeLanguageTag(languages[0]);
}

export function buildUserMusicContext({ countryCode, targetBpm, toothCount, genreHint }) {
  return {
    browserLanguage: detectBrowserLanguage(),
    countryCode: String(countryCode || "").trim().toUpperCase() || "--",
    targetBpm: Math.max(60, Math.min(220, Math.round(Number(targetBpm) || 120))),
    toothCount: Math.max(0, Math.min(32, Math.floor(Number(toothCount) || 0))),
    genreHint: String(genreHint || "").trim() || undefined
  };
}
