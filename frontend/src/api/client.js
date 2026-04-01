const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }

  return response.json();
}

export function getBpm({ top, bottom, sectionSeconds }) {
  const params = new URLSearchParams({
    top: String(top),
    bottom: String(bottom),
    sectionSeconds: String(sectionSeconds)
  });

  return request(`/api/bpm?${params.toString()}`);
}

export function getSongs({ bpm, tolerance, keyword }) {
  const params = new URLSearchParams({
    bpm: String(Math.round(bpm)),
    tolerance: String(tolerance),
    q: keyword || ""
  });

  return request(`/api/songs?${params.toString()}`);
}

export function getYoutubeVideo({ title, artist }) {
  const params = new URLSearchParams({ title, artist });
  return request(`/api/youtube?${params.toString()}`);
}
