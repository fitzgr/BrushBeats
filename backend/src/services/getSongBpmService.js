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

    // Broaden and diversify when external API returns repetitive artist clusters.
    const fallbackPool = fallbackSongs(targetBpm, Math.min(25, safeTolerance + 8), keyword);
    songs = uniqueSongsByTitleArtist([...songs, ...fallbackPool]);

    if (songs.length === 0) {
      songs = fallbackSongs(targetBpm, safeTolerance, keyword);
      return { source: "fallback", songs };
    }

    songs = songs
      .filter((song) => Math.abs(song.bpm - targetBpm) <= safeTolerance)
      .slice(0, 100);

    songs = diversifyArtists(songs, limit);

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
