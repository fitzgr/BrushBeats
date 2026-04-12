const axios = require("axios");
const { inferAgeBucketFromToothCount, clampTeethCount } = require("./ageInferenceService");
const { normalizeCountryCode } = require("./geoLocationService");
const { buildYoutubeSearchRequests, normalizeLanguageTag } = require("./youtubeQueryBuilder");
const { buildDurationMap, rankYoutubeCandidates } = require("./youtubeRankingService");
const { COUNTRY_TERMS, LANGUAGE_TERMS } = require("../config/musicContextConfig");

function buildUserMusicContext(input = {}) {
  const browserLanguage = normalizeLanguageTag(input.browserLanguage || "en-US");
  const countryCode = normalizeCountryCode(input.countryCode || "US");
  const targetBpm = Math.max(60, Math.min(220, Math.round(Number(input.targetBpm) || 120)));
  const toothCount = clampTeethCount(input.toothCount);

  return {
    browserLanguage,
    countryCode,
    ageBucket: inferAgeBucketFromToothCount(toothCount),
    targetBpm,
    genreHint: (input.genreHint || "").trim() || undefined
  };
}

async function fetchVideoDetails(apiKey, videoIds) {
  if (!videoIds.length) {
    return [];
  }

  const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
    params: {
      key: apiKey,
      part: "contentDetails",
      id: videoIds.join(","),
      maxResults: Math.min(50, videoIds.length)
    },
    timeout: 8000
  });

  return response.data?.items || [];
}

async function executeSearchVariants(apiKey, requests) {
  const responses = await Promise.all(
    requests.map(async (request) => {
      const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          key: apiKey,
          ...request.params
        },
        timeout: 8000
      });

      return {
        request,
        items: response.data?.items || []
      };
    })
  );

  return responses;
}

async function searchYoutubeVideo({ title, artist, context = {} }) {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      videoId: null,
      title: null,
      channelTitle: null,
      warning: "YOUTUBE_API_KEY is not configured."
    };
  }

  const userContext = buildUserMusicContext(context);
  const searchRequests = buildYoutubeSearchRequests(userContext, title, artist);
  const searchResponses = await executeSearchVariants(apiKey, searchRequests);
  const items = searchResponses.flatMap((entry) => entry.items || []);

  if (!items.length) {
    return {
      videoId: null,
      title: null,
      channelTitle: null
    };
  }

  const uniqueVideoIds = [...new Set(items.map((item) => item?.id?.videoId).filter(Boolean))].slice(0, 50);
  const videoDetails = await fetchVideoDetails(apiKey, uniqueVideoIds);
  const durationById = buildDurationMap(videoDetails);
  const localeHints = [
    ...(COUNTRY_TERMS[userContext.countryCode] || []),
    ...(LANGUAGE_TERMS[(userContext.browserLanguage || "en").split("-")[0]] || [])
  ];
  const ranked = rankYoutubeCandidates(items, userContext, {
    query: `${title} ${artist}`,
    localeHints,
    targetDurationSeconds: 120,
    durationById
  });

  const best = ranked[0]?.item || items[0];
  const bestVideoId = best?.id?.videoId || null;

  return {
    videoId: bestVideoId,
    title: best.snippet?.title || null,
    channelTitle: best.snippet?.channelTitle || null,
    selectedQueryVariant: searchRequests[0]?.query || null,
    context: userContext,
    rankingScore: ranked[0]?.score || 0,
    durationSeconds: durationById.get(bestVideoId) || null
  };
}

module.exports = {
  searchYoutubeVideo,
  buildUserMusicContext
};
