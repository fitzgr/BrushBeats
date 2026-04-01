const axios = require("axios");

const seedSongs = [
  { title: "Shake It Off", artist: "Taylor Swift", bpm: 160 },
  { title: "Levitating", artist: "Dua Lipa", bpm: 103 },
  { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", bpm: 115 },
  { title: "Blinding Lights", artist: "The Weeknd", bpm: 171 },
  { title: "Bad Romance", artist: "Lady Gaga", bpm: 119 },
  { title: "Don't Start Now", artist: "Dua Lipa", bpm: 124 },
  { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", bpm: 113 },
  { title: "Watermelon Sugar", artist: "Harry Styles", bpm: 95 },
  { title: "Roar", artist: "Katy Perry", bpm: 90 },
  { title: "Happy", artist: "Pharrell Williams", bpm: 160 },
  { title: "As It Was", artist: "Harry Styles", bpm: 174 },
  { title: "Treasure", artist: "Bruno Mars", bpm: 116 }
];

function normalizeSongs(payload) {
  const entries = payload?.songs || payload?.data || payload?.results || [];

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((item) => ({
      title: item.song_title || item.title || item.name,
      artist: item.artist || item.song_artist || item.artist_name,
      bpm: Number(item.tempo || item.bpm)
    }))
    .filter((item) => item.title && item.artist && Number.isFinite(item.bpm));
}

function fallbackSongs(targetBpm, tolerance, keyword) {
  const lower = targetBpm - tolerance;
  const upper = targetBpm + tolerance;
  const q = (keyword || "").trim().toLowerCase();

  return seedSongs
    .filter((song) => song.bpm >= lower && song.bpm <= upper)
    .filter((song) => {
      if (!q) {
        return true;
      }
      const haystack = `${song.title} ${song.artist}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 25);
}

async function fetchSongsByBpm({ bpm, tolerance = 5, keyword = "", limit = 25 }) {
  const targetBpm = Number(bpm);
  const safeTolerance = Math.max(1, Math.min(20, Number(tolerance) || 5));
  const apiKey = process.env.GETSONGBPM_API_KEY;
  const baseUrl = process.env.GETSONGBPM_BASE_URL || "https://api.getsongbpm.com";

  if (!apiKey) {
    return {
      source: "fallback",
      songs: fallbackSongs(targetBpm, safeTolerance, keyword)
    };
  }

  try {
    const response = await axios.get(`${baseUrl}/search`, {
      params: {
        api_key: apiKey,
        bpm: targetBpm,
        type: "both",
        limit,
        q: keyword || undefined
      },
      timeout: 8000
    });

    let songs = normalizeSongs(response.data);

    if (songs.length === 0) {
      songs = fallbackSongs(targetBpm, safeTolerance, keyword);
      return { source: "fallback", songs };
    }

    songs = songs
      .filter((song) => Math.abs(song.bpm - targetBpm) <= safeTolerance)
      .slice(0, limit);

    return {
      source: "getsongbpm",
      songs
    };
  } catch (error) {
    return {
      source: "fallback",
      songs: fallbackSongs(targetBpm, safeTolerance, keyword),
      warning: "GetSongBPM lookup failed; serving local fallback songs."
    };
  }
}

module.exports = {
  fetchSongsByBpm
};
