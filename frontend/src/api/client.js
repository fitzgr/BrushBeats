import i18n from "../i18n.ts";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const REQUEST_TIMEOUT_MS = 35000;

async function request(path) {
  return requestWithOptions(path);
}

async function requestWithOptions(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(i18n.t("errors.backendTimeout"));
    }

    throw new Error(i18n.t("errors.backendUnavailable"));
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }

  return response.json();
}

export function getBpm({ top, bottom, duration }) {
  const params = new URLSearchParams({
    top: String(top),
    bottom: String(bottom),
    duration: String(duration ?? 120)
  });

  return request(`/api/bpm?${params.toString()}`);
}

export function getSongs({ bpm, tolerance, danceability, acousticness, totalTeeth, keyword, seed = 0 }) {
  const params = new URLSearchParams({
    bpm: String(Math.round(bpm)),
    tolerance: String(tolerance),
    danceability: String(danceability),
    acousticness: String(acousticness),
    totalTeeth: String(totalTeeth ?? 32),
    q: keyword || "",
    seed: String(seed)
  });

  return request(`/api/songs?${params.toString()}`);
}

export function getYoutubeVideo({ title, artist }) {
  const params = new URLSearchParams({ title, artist });
  return request(`/api/youtube?${params.toString()}`);
}

export function getGeoCountry() {
  return request("/api/geo/country");
}

export function getAdminLocale(language, password) {
  return requestWithOptions(`/api/admin/locales/${encodeURIComponent(language)}`, {
    headers: {
      "x-admin-password": password
    }
  });
}

export function saveAdminLocale(language, translation, password) {
  return requestWithOptions(`/api/admin/locales/${encodeURIComponent(language)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password
    },
    body: JSON.stringify({ translation })
  });
}
