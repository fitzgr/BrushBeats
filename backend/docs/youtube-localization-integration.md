# YouTube Localization and Age-Aware Recommendation Integration

## Overview

This implementation adds personalized YouTube search and ranking using:

- Browser language
- Country (from explicit input or IP lookup fallback)
- Age bucket inferred from tooth count
- Target BPM
- Optional genre hint

## Backend Modules

- src/config/musicContextConfig.js
  - Centralized thresholds, locale mappings, age terms, and query behavior constants.
- src/services/ageInferenceService.js
  - inferAgeBucketFromToothCount(toothCount)
- src/services/geoLocationService.js
  - Pluggable provider pattern with default ipwho.is implementation.
  - Daily cache for country lookup.
- src/services/youtubeQueryBuilder.js
  - Multi-variant query generation and YouTube parameter construction.
- src/services/youtubeRankingService.js
  - Candidate scoring and ranking.
- src/services/youtubeService.js
  - Orchestrates multi-query search, duration lookup, and final ranking.

## Route Changes

- src/routes/youtube.js
  - Supports new query params:
    - browserLanguage
    - countryCode
    - targetBpm
    - toothCount
    - genreHint
  - Falls back to IP-derived country when countryCode is missing.

## Frontend Integration

- src/lib/userMusicContext.js
  - Browser language detection using navigator.languages or navigator.language.
  - Context payload builder for YouTube requests.
- src/api/client.js
  - getYoutubeVideo now sends context fields.
- src/App.jsx
  - Builds and sends context when selecting a song.

## Recommended Unit Tests

1. ageInferenceService
- maps 0-12 to child
- maps 13-24 to teen
- maps 25-32 to adult
- clamps invalid values

2. geoLocationService
- extracts client IP from x-forwarded-for
- normalizes country code
- caches response for same IP
- returns fallback payload when provider fails

3. youtubeQueryBuilder
- includes required YouTube params (regionCode, relevanceLanguage, safeSearch, etc.)
- builds BPM OR window
- emits 3-5 query variants
- includes locale and age terms

4. youtubeRankingService
- boosts official/topic matches
- penalizes live/remix/karaoke
- applies duration proximity bonus
- deduplicates repeated candidates

5. youtubeService orchestration
- aggregates candidates from all query variants
- merges video duration details
- returns highest ranked embeddable result
- handles missing API key gracefully

## Future Hook Points Already Exposed

- explicit language override in context payload
- genreHint in context payload
- ranking extensions for disliked songs/artists
- provider swap in geoLocationService
- additional music providers via service abstraction pattern
