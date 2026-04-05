const STORAGE_CONSENT_KEY = "brushbeats_storage_consent";
const STORAGE_BANNER_DISMISSED_KEY = "brushbeats_storage_banner_dismissed";
const LAST_SESSION_KEY = "brushbeats_last_session_v1";
const PREFERENCES_KEY = "brushbeats_preferences_v1";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const CONSENT_STATUS = {
  granted: "granted",
  denied: "denied",
  unknown: "unknown"
};

function canUseStorage() {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function canUseCookies() {
  return typeof document !== "undefined";
}

function readCookie(name) {
  if (!canUseCookies()) {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}

function writeCookie(name, value) {
  if (!canUseCookies()) {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function removeCookie(name) {
  if (!canUseCookies()) {
    return;
  }

  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function readStoredValue(key) {
  if (canUseStorage()) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  return readCookie(key);
}

function writeStoredValue(key, value) {
  if (canUseStorage()) {
    window.localStorage.setItem(key, value);
  }

  writeCookie(key, value);
}

function removeStoredValue(key) {
  if (canUseStorage()) {
    window.localStorage.removeItem(key);
  }

  removeCookie(key);
}

function clampInteger(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function normalizeAgeEstimate(ageEstimate) {
  if (!ageEstimate || typeof ageEstimate !== "object") {
    return null;
  }

  const phase = typeof ageEstimate.phase === "string" ? ageEstimate.phase : undefined;
  const unit = ageEstimate.unit === "months" ? "months" : ageEstimate.unit === "years" ? "years" : undefined;

  return {
    phase,
    unit,
    minAge: Number.isFinite(Number(ageEstimate.minAge)) ? Number(ageEstimate.minAge) : undefined,
    maxAge: Number.isFinite(Number(ageEstimate.maxAge)) ? Number(ageEstimate.maxAge) : undefined
  };
}

function normalizeBpmSnapshot(snapshot, values, brushDurationSeconds) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return {
    searchBpm: Number.isFinite(Number(snapshot.searchBpm)) ? Number(snapshot.searchBpm) : undefined,
    musicBpm: Number.isFinite(Number(snapshot.musicBpm)) ? Number(snapshot.musicBpm) : undefined,
    secondsPerTooth: Number.isFinite(Number(snapshot.secondsPerTooth)) ? Number(snapshot.secondsPerTooth) : undefined,
    transitionBufferSeconds: Number.isFinite(Number(snapshot.transitionBufferSeconds)) ? Number(snapshot.transitionBufferSeconds) : undefined,
    totalTransitions: Number.isFinite(Number(snapshot.totalTransitions)) ? Number(snapshot.totalTransitions) : undefined,
    totalToothTimeSeconds: Number.isFinite(Number(snapshot.totalToothTimeSeconds)) ? Number(snapshot.totalToothTimeSeconds) : undefined,
    totalTransitionSeconds: Number.isFinite(Number(snapshot.totalTransitionSeconds)) ? Number(snapshot.totalTransitionSeconds) : undefined,
    totalBrushingSeconds: Number.isFinite(Number(snapshot.totalBrushingSeconds)) ? Number(snapshot.totalBrushingSeconds) : brushDurationSeconds,
    totalTeeth: Number.isFinite(Number(snapshot.totalTeeth)) ? Number(snapshot.totalTeeth) : Number(values.top) + Number(values.bottom),
    ageEstimate: normalizeAgeEstimate(snapshot.ageEstimate)
  };
}

function normalizeLastSession(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const song = parsed.song;
  if (!song || typeof song.title !== "string" || typeof song.artist !== "string") {
    return null;
  }

  const values = parsed.values || {};
  const filters = parsed.filters || {};
  const youtube = parsed.youtube || {};
  const normalizedValues = {
    top: clampInteger(values.top, 0, 16, 16),
    bottom: clampInteger(values.bottom, 0, 16, 16)
  };
  const normalizedBrushDurationSeconds = clampInteger(parsed.brushDurationSeconds, 90, 180, 120);

  return {
    song: {
      title: song.title,
      artist: song.artist,
      bpm: Number.isFinite(Number(song.bpm)) ? Number(song.bpm) : undefined
    },
    youtube: {
      videoId: typeof youtube.videoId === "string" ? youtube.videoId : undefined,
      embedUrl: typeof youtube.embedUrl === "string" ? youtube.embedUrl : undefined
    },
    bpmSnapshot: normalizeBpmSnapshot(parsed.bpmSnapshot, normalizedValues, normalizedBrushDurationSeconds),
    values: normalizedValues,
    filters: {
      tolerance: clampInteger(filters.tolerance, 1, 20, 4),
      danceability: clampInteger(filters.danceability, 0, 100, 50),
      acousticness: clampInteger(filters.acousticness, 0, 100, 50)
    },
    keyword: typeof parsed.keyword === "string" ? parsed.keyword : "",
    brushingHand: parsed.brushingHand === "left" ? "left" : "right",
    brushDurationSeconds: normalizedBrushDurationSeconds,
    savedAt: Number.isFinite(Number(parsed.savedAt)) ? Number(parsed.savedAt) : undefined
  };
}

function normalizePreferences(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const values = parsed.values || {};
  const filters = parsed.filters || {};

  return {
    values: {
      top: clampInteger(values.top, 0, 16, 16),
      bottom: clampInteger(values.bottom, 0, 16, 16)
    },
    filters: {
      tolerance: clampInteger(filters.tolerance, 1, 20, 4),
      danceability: clampInteger(filters.danceability, 0, 100, 50),
      acousticness: clampInteger(filters.acousticness, 0, 100, 50)
    },
    keyword: typeof parsed.keyword === "string" ? parsed.keyword : "",
    brushingHand: parsed.brushingHand === "left" ? "left" : "right",
    brushDurationSeconds: clampInteger(parsed.brushDurationSeconds, 90, 180, 120),
    savedAt: Number.isFinite(Number(parsed.savedAt)) ? Number(parsed.savedAt) : undefined
  };
}

export function getStorageConsentStatus() {
  if (!canUseStorage()) {
    return CONSENT_STATUS.denied;
  }

  const stored = window.localStorage.getItem(STORAGE_CONSENT_KEY);
  if (stored === CONSENT_STATUS.granted || stored === CONSENT_STATUS.denied) {
    return stored;
  }

  return CONSENT_STATUS.unknown;
}

export function setStorageConsent(granted) {
  if (!canUseStorage()) {
    return CONSENT_STATUS.denied;
  }

  const nextStatus = granted ? CONSENT_STATUS.granted : CONSENT_STATUS.denied;
  window.localStorage.setItem(STORAGE_CONSENT_KEY, nextStatus);
  return nextStatus;
}

export function isStorageBannerDismissed() {
  if (!canUseStorage()) {
    return true;
  }

  return window.localStorage.getItem(STORAGE_BANNER_DISMISSED_KEY) === "true";
}

export function setStorageBannerDismissed(dismissed) {
  if (!canUseStorage()) {
    return;
  }

  if (dismissed) {
    window.localStorage.setItem(STORAGE_BANNER_DISMISSED_KEY, "true");
    return;
  }

  window.localStorage.removeItem(STORAGE_BANNER_DISMISSED_KEY);
}

export function loadLastSession() {
  try {
    const raw = readStoredValue(LAST_SESSION_KEY);
    if (!raw) {
      return null;
    }

    return normalizeLastSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLastSession(session) {
  const normalized = normalizeLastSession(session);
  if (!normalized) {
    return false;
  }

  try {
    writeStoredValue(LAST_SESSION_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function clearLastSession() {
  removeStoredValue(LAST_SESSION_KEY);
}

export function loadStoredPreferences() {
  try {
    const raw = readStoredValue(PREFERENCES_KEY);
    if (!raw) {
      return null;
    }

    return normalizePreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveStoredPreferences(preferences) {
  const normalized = normalizePreferences(preferences);
  if (!normalized) {
    return false;
  }

  try {
    writeStoredValue(PREFERENCES_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPreferences() {
  removeStoredValue(PREFERENCES_KEY);
}

export function loadLastBrushedSong() {
  return loadLastSession()?.song || null;
}

export function saveLastBrushedSong(song) {
  if (!song?.title || !song?.artist) {
    return false;
  }

  return saveLastSession({
    song,
    values: { top: 16, bottom: 16 },
    filters: { tolerance: 4, danceability: 50, acousticness: 50 },
    keyword: "",
    brushingHand: "right",
    brushDurationSeconds: 120,
    savedAt: Date.now()
  });
}

export function clearLastBrushedSong() {
  clearLastSession();
}
