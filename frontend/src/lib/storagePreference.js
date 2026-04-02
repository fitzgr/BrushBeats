const STORAGE_CONSENT_KEY = "brushbeats_storage_consent";
const STORAGE_BANNER_DISMISSED_KEY = "brushbeats_storage_banner_dismissed";
const LAST_BRUSHED_SONG_KEY = "brushbeats_last_brushed_song_v1";

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

export function loadLastBrushedSong() {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LAST_BRUSHED_SONG_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.title !== "string" || typeof parsed.artist !== "string") {
      return null;
    }

    return {
      title: parsed.title,
      artist: parsed.artist,
      bpm: typeof parsed.bpm === "number" ? parsed.bpm : undefined,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : undefined
    };
  } catch {
    return null;
  }
}

export function saveLastBrushedSong(song) {
  if (!canUseStorage() || !song?.title || !song?.artist) {
    return false;
  }

  try {
    const payload = {
      title: song.title,
      artist: song.artist,
      bpm: Number(song.bpm) || undefined,
      savedAt: Date.now()
    };

    window.localStorage.setItem(LAST_BRUSHED_SONG_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearLastBrushedSong() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(LAST_BRUSHED_SONG_KEY);
}
