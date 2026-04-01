const axios = require("axios");

const negativeTerms = [" cover", " remix", " live", " karaoke", " instrumental"];

function scoreResult(item, artist) {
  const title = (item.snippet?.title || "").toLowerCase();
  const channelTitle = (item.snippet?.channelTitle || "").toLowerCase();
  const artistLower = (artist || "").toLowerCase();

  let score = 0;

  if (title.includes("official")) {
    score += 3;
  }

  if (channelTitle.includes("official") || channelTitle.includes("vevo")) {
    score += 4;
  }

  if (artistLower && channelTitle.includes(artistLower)) {
    score += 2;
  }

  for (const term of negativeTerms) {
    if (title.includes(term)) {
      score -= 5;
    }
  }

  return score;
}

async function searchYoutubeVideo({ title, artist }) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      videoId: null,
      title: null,
      channelTitle: null,
      warning: "YOUTUBE_API_KEY is not configured."
    };
  }

  const query = `${title} ${artist} official`;

  const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
    params: {
      key: apiKey,
      q: query,
      part: "snippet",
      type: "video",
      maxResults: 10,
      videoEmbeddable: "true",
      safeSearch: "moderate"
    },
    timeout: 8000
  });

  const items = response.data?.items || [];

  if (!items.length) {
    return {
      videoId: null,
      title: null,
      channelTitle: null
    };
  }

  const ranked = [...items]
    .sort((a, b) => scoreResult(b, artist) - scoreResult(a, artist))
    .filter((item) => {
      const titleLower = (item.snippet?.title || "").toLowerCase();
      return !negativeTerms.some((term) => titleLower.includes(term));
    });

  const best = ranked[0] || items[0];
  return {
    videoId: best.id?.videoId || null,
    title: best.snippet?.title || null,
    channelTitle: best.snippet?.channelTitle || null
  };
}

module.exports = {
  searchYoutubeVideo
};
