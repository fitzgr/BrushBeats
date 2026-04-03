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
  { title: "Treasure", artist: "Bruno Mars", bpm: 116 },
  { title: "Dog Days Are Over", artist: "Florence + The Machine", bpm: 150 },
  { title: "Banquet", artist: "Bloc Party", bpm: 150 },
  { title: "Come On Eileen", artist: "Dexys Midnight Runners", bpm: 108 },
  { title: "Take On Me", artist: "a-ha", bpm: 169 },
  { title: "Mr. Brightside", artist: "The Killers", bpm: 148 },
  { title: "Dancing With Myself", artist: "Billy Idol", bpm: 176 },
  { title: "Naive", artist: "The Kooks", bpm: 104 },
  { title: "Midnight City", artist: "M83", bpm: 105 },
  { title: "1901", artist: "Phoenix", bpm: 150 },
  { title: "Juice", artist: "Lizzo", bpm: 120 },
  { title: "Electric Feel", artist: "MGMT", bpm: 98 },
  { title: "Shut Up and Dance", artist: "WALK THE MOON", bpm: 128 },
  { title: "Adventure of a Lifetime", artist: "Coldplay", bpm: 112 },
  { title: "Feel It Still", artist: "Portugal. The Man", bpm: 79 },
  { title: "Young Folks", artist: "Peter Bjorn and John", bpm: 138 },
  { title: "Dreams", artist: "Fleetwood Mac", bpm: 120 },
  { title: "September", artist: "Earth, Wind & Fire", bpm: 126 },
  { title: "Blue Monday", artist: "New Order", bpm: 130 },
  { title: "Go Your Own Way", artist: "Fleetwood Mac", bpm: 136 }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMaturityScore(totalTeeth) {
  return clamp((Number(totalTeeth) - 1) / 31, 0, 1);
}

function normalizePreference(value, fallback = 50) {
  return clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, 0, 100);
}

function hashString(input) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function clampUnit(value) {
  return clamp(value, 0, 1);
}

function normalizeFeatureValue(value) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  const numericValue = Number(value);
  return numericValue > 1 ? clampUnit(numericValue / 100) : clampUnit(numericValue);
}

function estimateSongProfile(song) {
  const fingerprint = `${song.title || ""}::${song.artist || ""}`.toLowerCase();
  const primaryHash = hashString(`${fingerprint}:dance`);
  const secondaryHash = hashString(`${fingerprint}:acoustic`);
  const bpm = Number(song.bpm) || 120;
  const bpmBias = clampUnit((bpm - 80) / 120);

  const detectedDanceability = normalizeFeatureValue(song.danceability);
  const detectedAcousticness = normalizeFeatureValue(song.acousticness);

  return {
    danceability:
      detectedDanceability ?? clampUnit(0.2 + ((primaryHash % 1000) / 1000) * 0.55 + bpmBias * 0.2),
    acousticness:
      detectedAcousticness ?? clampUnit(0.15 + ((secondaryHash % 1000) / 1000) * 0.65 + (1 - bpmBias) * 0.1)
  };
}

function enrichSong(song) {
  const profile = estimateSongProfile(song);

  return {
    ...song,
    danceability: Math.round(profile.danceability * 100),
    acousticness: Math.round(profile.acousticness * 100)
  };
}

function rankSongsByProfile(songs, profilePreference) {
  const danceabilityTarget = normalizePreference(profilePreference?.danceability);
  const acousticnessTarget = normalizePreference(profilePreference?.acousticness);
  const maturityScore = getMaturityScore(profilePreference?.totalTeeth ?? 32);
  const youthfulBias = 1 - maturityScore;

  return [...songs].sort((left, right) => {
    const leftDistance =
      Math.abs((left.danceability ?? 50) - danceabilityTarget) +
      Math.abs((left.acousticness ?? 50) - acousticnessTarget);
    const rightDistance =
      Math.abs((right.danceability ?? 50) - danceabilityTarget) +
      Math.abs((right.acousticness ?? 50) - acousticnessTarget);

    if (leftDistance !== rightDistance) {
      const leftProfileBoost = youthfulBias * ((left.danceability ?? 50) * 0.4 + (100 - (left.acousticness ?? 50)) * 0.25);
      const rightProfileBoost = youthfulBias * ((right.danceability ?? 50) * 0.4 + (100 - (right.acousticness ?? 50)) * 0.25);

      return leftDistance - rightDistance - (leftProfileBoost - rightProfileBoost);
    }

    return (left.title || "").localeCompare(right.title || "");
  });
}

function uniqueSongsByTitleArtist(songs) {
  const map = new Map();

  for (const song of songs || []) {
    const key = `${(song.title || "").toLowerCase()}::${(song.artist || "").toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, song);
    }
  }

  return [...map.values()];
}

function diversifyArtists(songs, limit = 25) {
  const byArtist = new Map();

  for (const song of songs) {
    const artist = (song.artist || "").toLowerCase();

    if (!byArtist.has(artist)) {
      byArtist.set(artist, []);
    }

    byArtist.get(artist).push(song);
  }

  const artistQueues = [...byArtist.values()];
  const output = [];

  while (output.length < limit) {
    let added = false;

    for (const queue of artistQueues) {
      if (queue.length > 0) {
        output.push(queue.shift());
        added = true;
      }

      if (output.length >= limit) {
        break;
      }
    }

    if (!added) {
      break;
    }
  }

  return output;
}

function normalizeSongs(payload) {
  const entries = payload?.songs || payload?.data || payload?.results || [];

  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((item) => ({
      title: item.song_title || item.title || item.name,
      artist: item.artist || item.song_artist || item.artist_name,
      bpm: Number(item.tempo || item.bpm),
      danceability: item.danceability,
      acousticness: item.acousticness
    }))
    .filter((item) => item.title && item.artist && Number.isFinite(item.bpm));
}

function fallbackSongs(targetBpm, tolerance, keyword, profilePreference) {
  const lower = targetBpm - tolerance;
  const upper = targetBpm + tolerance;
  const q = (keyword || "").trim().toLowerCase();

  const songs = seedSongs
    .filter((song) => song.bpm >= lower && song.bpm <= upper)
    .filter((song) => {
      if (!q) {
        return true;
      }
      const haystack = `${song.title} ${song.artist}`.toLowerCase();
      return haystack.includes(q);
    })
    .map(enrichSong);

  return rankSongsByProfile(songs, profilePreference).slice(0, 25);
}

async function fetchSongsByBpm({ bpm, tolerance = 5, danceability = 50, acousticness = 50, totalTeeth = 32, keyword = "", limit = 25 }) {
  const targetBpm = Number(bpm);
  const safeTolerance = Math.max(1, Math.min(20, Number(tolerance) || 5));
  const profilePreference = {
    danceability: normalizePreference(danceability),
    acousticness: normalizePreference(acousticness),
    totalTeeth
  };
  const apiKey = process.env.GETSONGBPM_API_KEY;
  const baseUrl = process.env.GETSONGBPM_BASE_URL || "https://api.getsongbpm.com";

  if (!apiKey) {
    return {
      source: "fallback",
      songs: fallbackSongs(targetBpm, safeTolerance, keyword, profilePreference)
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

    // Broaden and diversify when external API returns repetitive artist clusters.
    const fallbackPool = fallbackSongs(targetBpm, Math.min(25, safeTolerance + 8), keyword, profilePreference);
    songs = uniqueSongsByTitleArtist([...songs, ...fallbackPool]).map(enrichSong);

    if (songs.length === 0) {
      songs = fallbackSongs(targetBpm, safeTolerance, keyword, profilePreference);
      return { source: "fallback", songs };
    }

    songs = songs
      .filter((song) => Math.abs(song.bpm - targetBpm) <= safeTolerance)
      .slice(0, 100);

    songs = rankSongsByProfile(songs, profilePreference)
      .slice(0, 100);

    songs = diversifyArtists(songs, limit);

    return {
      source: "getsongbpm",
      songs
    };
  } catch (error) {
    return {
      source: "fallback",
      songs: fallbackSongs(targetBpm, safeTolerance, keyword, profilePreference),
      warning: "GetSongBPM lookup failed; serving local fallback songs."
    };
  }
}

module.exports = {
  fetchSongsByBpm
};
