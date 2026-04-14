function toSecondsFromIsoDuration(isoDuration) {
  if (!isoDuration) {
    return null;
  }

  const match = String(isoDuration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) {
    return null;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

function buildDurationMap(videoItems) {
  const map = new Map();
  for (const item of videoItems || []) {
    const id = item?.id;
    if (!id) {
      continue;
    }

    map.set(id, toSecondsFromIsoDuration(item?.contentDetails?.duration));
  }
  return map;
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function scoreYoutubeCandidate(item, _context, options = {}) {
  const snippet = item?.snippet || {};
  const title = normalizeText(snippet.title);
  const description = normalizeText(snippet.description);
  const channel = normalizeText(snippet.channelTitle);
  const query = normalizeText(options.query);
  const durationSeconds = Number(options.durationSeconds) || 0;
  const targetDurationSeconds = Math.max(60, Number(options.targetDurationSeconds) || 120);

  let score = 0;

  if (query && (title.includes(query) || description.includes(query))) {
    score += 10;
  }

  if (title.includes("official") || description.includes("official") || title.includes("audio")) {
    score += 6;
  }

  if (channel.includes("official") || channel.includes("vevo") || channel.includes("topic")) {
    score += 6;
  }

  if (durationSeconds > 0) {
    const mismatch = Math.abs(durationSeconds - targetDurationSeconds);
    score += Math.max(0, 9 - mismatch / 12);
  }

  if (title.includes("live") || description.includes("live")) {
    score -= 8;
  }

  if (title.includes("karaoke") || title.includes("cover") || title.includes("remix")) {
    score -= 6;
  }

  if (title.length < 4) {
    score -= 4;
  }

  return score;
}

function dedupeCandidates(items) {
  const byId = new Map();

  for (const item of items || []) {
    const videoId = item?.id?.videoId || item?.id;
    if (!videoId) {
      continue;
    }

    if (!byId.has(videoId)) {
      byId.set(videoId, item);
    }
  }

  return [...byId.values()];
}

function rankYoutubeCandidates(items, context, options = {}) {
  const deduped = dedupeCandidates(items);
  const durationById = options.durationById || new Map();
  const songSeen = new Set();

  return deduped
    .map((item) => {
      const videoId = item?.id?.videoId || item?.id;
      const durationSeconds = durationById.get(videoId) || 0;
      const baseScore = scoreYoutubeCandidate(item, context, {
        ...options,
        durationSeconds
      });
      const titleKey = normalizeText(item?.snippet?.title);
      const channelKey = normalizeText(item?.snippet?.channelTitle);
      const songKey = `${titleKey}::${channelKey}`;
      const duplicatePenalty = songSeen.has(songKey) ? -5 : 0;
      songSeen.add(songKey);

      return {
        item,
        score: baseScore + duplicatePenalty
      };
    })
    .sort((left, right) => right.score - left.score);
}

module.exports = {
  buildDurationMap,
  rankYoutubeCandidates,
  toSecondsFromIsoDuration
};
