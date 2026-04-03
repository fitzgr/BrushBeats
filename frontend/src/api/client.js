const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const REQUEST_TIMEOUT_MS = 35000;

async function request(path) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The backend is still waking up. Please wait a few seconds and try again.");
    }

    throw new Error("Could not reach the backend. If the service is cold-starting, please wait a few seconds and retry.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }

  return response.json();
}

export function getBpm({ top, bottom }) {
  const params = new URLSearchParams({
    top: String(top),
    bottom: String(bottom)
  });

  return request(`/api/bpm?${params.toString()}`);
}

export function getSongs({ bpm, tolerance, danceability, acousticness, listenerProfile, keyword, seed = 0 }) {
  const params = new URLSearchParams({
    bpm: String(Math.round(bpm)),
    tolerance: String(tolerance),
    danceability: String(danceability),
    acousticness: String(acousticness),
    listenerProfile: listenerProfile || "adult",
    q: keyword || "",
    seed: String(seed)
  });

  return request(`/api/songs?${params.toString()}`);
}

export function getYoutubeVideo({ title, artist }) {
  const params = new URLSearchParams({ title, artist });
  return request(`/api/youtube?${params.toString()}`);
}
