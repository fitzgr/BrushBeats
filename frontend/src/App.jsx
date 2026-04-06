import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BPMCalculator from "./components/BPMCalculator";
import SongList from "./components/SongList";
import Player from "./components/Player";
import BrushingGuide from "./components/BrushingGuide";
import TranslationWorkshop from "./components/TranslationWorkshop";
import { getLanguageFallbackInfo, setPreferredSupportedLanguage } from "./i18n.ts";
import { getBpm, getSongs, getYoutubeVideo } from "./api/client";
import {
  analyticsEnabled,
  getAnalyticsConsentStatus,
  initializeAnalytics,
  setAnalyticsConsent,
  trackEvent
} from "./lib/analytics";
import {
  clearStoredPreferences,
  clearLastSession,
  getStorageConsentStatus,
  isStorageBannerDismissed,
  loadLastSession,
  loadStoredPreferences,
  saveLastSession,
  saveStoredPreferences,
  setStorageBannerDismissed,
  setStorageConsent
} from "./lib/storagePreference";
import { estimateAgeFromTeethFull } from "./lib/teethAge";
import { useDeviceContext } from "./lib/deviceContext";
import "./App.css";

const DEFAULT_VALUES = { top: 16, bottom: 16 };
const DEFAULT_BRUSH_DURATION_SECONDS = 120;
const BRUSH_DURATION_OPTIONS = [90, 120, 150, 180];

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMaturityScore(totalTeeth) {
  return clampValue((Number(totalTeeth) - 1) / 31, 0, 1);
}

function createInitialSongPreferences(totalTeeth = DEFAULT_VALUES.top + DEFAULT_VALUES.bottom) {
  const maturityScore = getMaturityScore(totalTeeth);
  const ageEstimate = estimateAgeFromTeethFull(totalTeeth);
  const phaseDefaults = {
    infant: { tolerance: 7, danceabilityBase: 82, acousticnessBase: 18 },
    toddler: { tolerance: 6, danceabilityBase: 78, acousticnessBase: 22 },
    primary: { tolerance: 6, danceabilityBase: 74, acousticnessBase: 26 },
    mixed: { tolerance: 5, danceabilityBase: 62, acousticnessBase: 38 },
    adult: { tolerance: 4, danceabilityBase: 50, acousticnessBase: 54 }
  };
  const phaseConfig = phaseDefaults[ageEstimate?.phase || "adult"];

  return {
    tolerance: phaseConfig.tolerance,
    danceability: clampValue(Math.round(phaseConfig.danceabilityBase + (1 - maturityScore) * 8 + (Math.random() * 20 - 10)), 0, 100),
    acousticness: clampValue(Math.round(phaseConfig.acousticnessBase + maturityScore * 8 + (Math.random() * 20 - 10)), 0, 100)
  };
}

function formatAgeDescription(t, ageEstimate) {
  if (!ageEstimate) {
    return t("age.descriptions.unknownRange");
  }

  if (ageEstimate.unit === "months") {
    return t("age.descriptions.monthRange", {
      min: ageEstimate.minAge,
      max: ageEstimate.maxAge
    });
  }

  if (ageEstimate.maxAge >= 99) {
    return t("age.descriptions.yearsPlus", {
      min: ageEstimate.minAge
    });
  }

  return t("age.descriptions.yearRange", {
    min: ageEstimate.minAge,
    max: ageEstimate.maxAge
  });
}

function buildLocalizedBrusherProfile(t, totalTeeth, ageEstimate) {
  if (!ageEstimate) {
    return {
      safeTeeth: totalTeeth,
      estimate: null,
      label: t("age.stages.unknown.label"),
      description: t("age.stages.unknown.description")
    };
  }

  let labelKey = `age.stages.${ageEstimate.phase}`;
  if (ageEstimate.phase === "adult") {
    labelKey = totalTeeth >= 29 ? "age.stages.fullAdultSmile" : "age.stages.adultSmile";
  }

  return {
    safeTeeth: totalTeeth,
    estimate: ageEstimate,
    label: t(labelKey),
    description: formatAgeDescription(t, ageEstimate)
  };
}

function App() {
  const { t, i18n } = useTranslation();
  const [appView, setAppView] = useState(() => {
    if (typeof window === "undefined") {
      return "brush";
    }

    return new URLSearchParams(window.location.search).get("mode") === "workshop" ? "workshop" : "brush";
  });
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [bpmData, setBpmData] = useState(null);
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [songFilters, setSongFilters] = useState(() => createInitialSongPreferences(DEFAULT_VALUES.top + DEFAULT_VALUES.bottom));
  const [draftSongFilters, setDraftSongFilters] = useState(songFilters);
  const [keyword, setKeyword] = useState("");
  const [songRefreshSeed, setSongRefreshSeed] = useState(0);
  const [timer, setTimer] = useState({ running: false, remaining: DEFAULT_BRUSH_DURATION_SECONDS });
  const [brushingPhase, setBrushingPhase] = useState("idle");
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [brushingMusicElapsedSeconds, setBrushingMusicElapsedSeconds] = useState(0);
  const [autoplayToken, setAutoplayToken] = useState(0);
  const [isSongPoolExhausted, setIsSongPoolExhausted] = useState(false);
  const [loading, setLoading] = useState({ bpm: false, songs: false, player: false });
  const [backendStatus, setBackendStatus] = useState("");
  const [error, setError] = useState("");
  const [analyticsConsent, setAnalyticsConsentState] = useState(() => getAnalyticsConsentStatus());
  const [storageConsent, setStorageConsentState] = useState(() => getStorageConsentStatus());
  const [storageBannerDismissed, setStorageBannerDismissedState] = useState(() => isStorageBannerDismissed());
  const [lastSession, setLastSession] = useState(null);
  const [languageFallbackState, setLanguageFallbackState] = useState(() => getLanguageFallbackInfo());
  const [activeModal, setActiveModal] = useState(null);
  const [workflowStep, setWorkflowStep] = useState("teeth");
  const [brushingHand, setBrushingHand] = useState("right");
  const [brushDurationSeconds, setBrushDurationSeconds] = useState(DEFAULT_BRUSH_DURATION_SECONDS);
  const [brushControlCue, setBrushControlCue] = useState(null);
  const [queuedSongPreview, setQueuedSongPreview] = useState(null);
  const [playerCommand, setPlayerCommand] = useState({ type: "idle", nonce: 0 });
  const seenSongsByQueryRef = useRef(new Map());
  const playedSongsRef = useRef(new Set());
  const queuedSongRef = useRef(null);
  const lastPlaybackTickRef = useRef(null);
  const preferencesHydratedRef = useRef(false);
  const repeatSessionBootstrapRef = useRef(false);
  const restoredSessionRef = useRef(null);
  const analyticsAvailable = useMemo(() => analyticsEnabled(), []);
  const device = useDeviceContext();
  const totalTeeth = values.top + values.bottom;
  const ageEstimate = bpmData?.ageEstimate || estimateAgeFromTeethFull(totalTeeth);
  const detectedBrusherProfile = useMemo(
    () => buildLocalizedBrusherProfile(t, totalTeeth, ageEstimate),
    [ageEstimate, t, totalTeeth]
  );
  const selectedBrushBpm = Number(selectedSong?.bpm || bpmData?.searchBpm || 120);
  const supportedLanguageOptions = useMemo(
    () => [
      { value: "en", label: t("settings.supportedLanguage.options.english") },
      { value: "es", label: t("settings.supportedLanguage.options.spanish") },
      { value: "tr", label: t("settings.supportedLanguage.options.turkish") }
    ],
    [t]
  );
  const workshopInitialLanguage = useMemo(() => {
    if (i18n.resolvedLanguage && i18n.resolvedLanguage !== "en") {
      return i18n.resolvedLanguage;
    }

    return supportedLanguageOptions.find((option) => option.value !== "en")?.value || "es";
  }, [i18n.resolvedLanguage, supportedLanguageOptions]);

  useEffect(() => {
    if (device.isMobile && appView === "workshop") {
      setAppView("brush");
    }
  }, [appView, device.isMobile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (!device.isMobile && appView === "workshop") {
      url.searchParams.set("mode", "workshop");
    } else {
      url.searchParams.delete("mode");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [appView, device.isMobile]);

  useEffect(() => {
    setLanguageFallbackState(getLanguageFallbackInfo());
  }, [i18n.language, i18n.resolvedLanguage]);

  function applySavedSession(session) {
    if (!session) {
      return;
    }

    setValues(session.values);
    setSongFilters(session.filters);
    setDraftSongFilters(session.filters);
    setKeyword(session.keyword || "");
    setBrushingHand(session.brushingHand || "right");
    setBrushDurationSeconds(session.brushDurationSeconds || DEFAULT_BRUSH_DURATION_SECONDS);
  }

  useEffect(() => {
    if (analyticsConsent === "granted") {
      initializeAnalytics();
    }
  }, [analyticsConsent]);

  function handleAcceptAnalytics() {
    const nextStatus = setAnalyticsConsent(true);
    setAnalyticsConsentState(nextStatus);
    initializeAnalytics();
  }

  function handleDeclineAnalytics() {
    const nextStatus = setAnalyticsConsent(false);
    setAnalyticsConsentState(nextStatus);
  }

  useEffect(() => {
    if (storageConsent === "granted") {
      const savedPreferences = loadStoredPreferences();
      const savedSession = loadLastSession();

      if (savedPreferences) {
        applySavedSession(savedPreferences);
      } else if (savedSession) {
        applySavedSession(savedSession);
      }

      restoredSessionRef.current = savedSession;
      setBpmData(savedSession?.bpmSnapshot || null);
      setLastSession(savedSession);
      preferencesHydratedRef.current = true;
      return;
    }

    if (storageConsent === "denied") {
      clearStoredPreferences();
      clearLastSession();
    }

    preferencesHydratedRef.current = false;
    repeatSessionBootstrapRef.current = false;
    restoredSessionRef.current = null;
    setLastSession(null);
    setBpmData(null);
  }, [storageConsent]);

  useEffect(() => {
    if (storageConsent !== "granted" || !preferencesHydratedRef.current) {
      return;
    }

    saveStoredPreferences({
      values,
      filters: songFilters,
      keyword,
      brushingHand,
      brushDurationSeconds,
      savedAt: Date.now()
    });
  }, [brushDurationSeconds, brushingHand, keyword, songFilters, storageConsent, values]);

  useEffect(() => {
    if (storageConsent !== "granted" || repeatSessionBootstrapRef.current || !lastSession?.song) {
      return;
    }

    repeatSessionBootstrapRef.current = true;
    applySavedSession(lastSession);
    setWorkflowStep("brush");
    setSelectedSong(lastSession.song);
    setError("");
    setBpmData(lastSession.bpmSnapshot || null);

    if (lastSession.youtube?.embedUrl) {
      setPlayerData(lastSession.youtube);
      return;
    }

    void handleSelectSongWithOptions(lastSession.song, { autoplay: false });
  }, [lastSession, storageConsent]);

  function handleAllowStorage() {
    const nextStatus = setStorageConsent(true);
    setStorageConsentState(nextStatus);
    setStorageBannerDismissed(false);
    setStorageBannerDismissedState(false);
  }

  function handleDeclineStorage() {
    const nextStatus = setStorageConsent(false);
    setStorageConsentState(nextStatus);
    clearStoredPreferences();
    clearLastSession();
    setLastSession(null);
  }

  function handleDismissStorageBanner() {
    setStorageBannerDismissed(true);
    setStorageBannerDismissedState(true);
  }

  function handleShowStorageBanner() {
    setStorageBannerDismissed(false);
    setStorageBannerDismissedState(false);
  }

  async function handlePreferredLanguageChange(nextLanguage) {
    const nextFallbackInfo = await setPreferredSupportedLanguage(nextLanguage);
    setLanguageFallbackState(nextFallbackInfo);
  }

  async function handleRepeatLastSession() {
    if (!lastSession?.song) {
      return;
    }

    applySavedSession(lastSession);
    setWorkflowStep("brush");
    setSelectedSong(lastSession.song);
    setBpmData(lastSession.bpmSnapshot || null);

    if (lastSession.youtube?.embedUrl) {
      setPlayerData(lastSession.youtube);
    } else {
      await handleSelectSongWithOptions(lastSession.song, { autoplay: false });
    }

    trackEvent("last_session_repeated", {
      title: lastSession.song.title,
      artist: lastSession.song.artist,
      duration_seconds: lastSession.brushDurationSeconds
    });
  }

  function openPrivacyModal() {
    setActiveModal("privacy");
  }

  function openStorageInfoModal() {
    setActiveModal("storage");
  }

  function closePrivacyModal() {
    setActiveModal(null);
  }

  function toSongKey(song) {
    return `${(song?.title || "").trim().toLowerCase()}::${(song?.artist || "").trim().toLowerCase()}`;
  }

  function markSongAsPlayed(song) {
    const songKey = toSongKey(song);
    if (!songKey || songKey === "::") {
      return;
    }

    playedSongsRef.current.add(songKey);
  }

  function pickRandomQueuedSong(currentSong, songPool = songs) {
    const currentSongKey = toSongKey(currentSong);
    const unplayedCandidates = songPool.filter((song) => {
      const songKey = toSongKey(song);
      return songKey !== currentSongKey && !playedSongsRef.current.has(songKey);
    });

    const fallbackCandidates = songPool.filter((song) => toSongKey(song) !== currentSongKey);
    const candidates = unplayedCandidates.length > 0 ? unplayedCandidates : fallbackCandidates;

    if (!candidates.length) {
      return null;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function queueNextGeneratedSong(currentSong, songPool = songs) {
    const nextSong = pickRandomQueuedSong(currentSong, songPool);
    queuedSongRef.current = nextSong;
    setQueuedSongPreview(nextSong);
    return nextSong;
  }

  useEffect(() => {
    playedSongsRef.current = new Set();
    queuedSongRef.current = null;
    setQueuedSongPreview(null);
  }, [bpmData?.searchBpm, keyword, songFilters.acousticness, songFilters.danceability, songFilters.tolerance, songRefreshSeed, totalTeeth]);

  useEffect(() => {
    if (!loading.bpm && !loading.songs && !loading.player) {
      setBackendStatus("");
      return;
    }

    const infoTimer = window.setTimeout(() => {
      setBackendStatus(t("app.backendStatus.waking"));
    }, 1800);

    const detailTimer = window.setTimeout(() => {
      setBackendStatus(t("app.backendStatus.connecting"));
    }, 7000);

    return () => {
      window.clearTimeout(infoTimer);
      window.clearTimeout(detailTimer);
    };
  }, [loading.bpm, loading.player, loading.songs, t]);

  useEffect(() => {
    let cancelled = false;

    const restoredSession = restoredSessionRef.current;
    if (restoredSession) {
      const restoredMatches =
        restoredSession.values?.top === values.top &&
        restoredSession.values?.bottom === values.bottom &&
        restoredSession.brushDurationSeconds === brushDurationSeconds;

      if (!restoredMatches) {
        return () => {
          cancelled = true;
        };
      }

      if (restoredSession.bpmSnapshot) {
        setBpmData(restoredSession.bpmSnapshot);
        restoredSessionRef.current = null;
        return () => {
          cancelled = true;
        };
      }

      restoredSessionRef.current = null;
    }

    async function loadBpm() {
      try {
        setLoading((prev) => ({ ...prev, bpm: true }));
        const data = await getBpm({ ...values, duration: brushDurationSeconds });

        if (!cancelled) {
          setBpmData(data);
          trackEvent("bpm_calculated", { top_teeth: values.top, bottom_teeth: values.bottom, search_bpm: data.searchBpm });
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading((prev) => ({ ...prev, bpm: false }));
        }
      }
    }

    loadBpm();
    return () => {
      cancelled = true;
    };
  }, [values, brushDurationSeconds]);

  useEffect(() => {
    if (timer.running) {
      return;
    }

    const nextSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    setTimer((prev) => {
      if (prev.remaining === nextSeconds && prev.running === false) {
        return prev;
      }

      return { running: false, remaining: nextSeconds };
    });
  }, [bpmData?.totalBrushingSeconds, brushDurationSeconds, timer.running]);

  useEffect(() => {
    if (!bpmData?.searchBpm || (workflowStep !== "music" && brushingPhase !== "running")) {
      return;
    }

    let cancelled = false;

    async function loadSongs() {
      try {
        setLoading((prev) => ({ ...prev, songs: true }));
        const result = await getSongs({
          bpm: bpmData.searchBpm,
          tolerance: songFilters.tolerance,
          danceability: songFilters.danceability,
          acousticness: songFilters.acousticness,
          totalTeeth,
          keyword,
          seed: songRefreshSeed
        });
        const queryKey = `${totalTeeth}:${Math.round(bpmData.searchBpm)}:${songFilters.tolerance}:${songFilters.danceability}:${songFilters.acousticness}:${keyword.trim().toLowerCase()}`;
        const seenForQuery = seenSongsByQueryRef.current.get(queryKey) || new Set();
        const fetchedSongs = result.songs || [];
        const unseenSongs = fetchedSongs.filter((song) => !seenForQuery.has(toSongKey(song)));

        for (const song of unseenSongs) {
          seenForQuery.add(toSongKey(song));
        }

        seenSongsByQueryRef.current.set(queryKey, seenForQuery);

        if (!cancelled) {
          setSongs(unseenSongs);
          setIsSongPoolExhausted(fetchedSongs.length > 0 && unseenSongs.length === 0);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setSongs([]);
          setIsSongPoolExhausted(false);
        }
      } finally {
        if (!cancelled) {
          setLoading((prev) => ({ ...prev, songs: false }));
        }
      }
    }

    const timeout = window.setTimeout(loadSongs, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [bpmData?.searchBpm, brushingPhase, keyword, songFilters, songRefreshSeed, totalTeeth, workflowStep]);

  function updateDraftSongFilter(key, value) {
    setDraftSongFilters((prev) => ({ ...prev, [key]: value }));
  }

  function commitSongFilter(key, value) {
    const nextFilters = { ...draftSongFilters, [key]: value };
    setDraftSongFilters(nextFilters);
    setSongFilters((prev) => {
      if (
        prev.tolerance === nextFilters.tolerance &&
        prev.danceability === nextFilters.danceability &&
        prev.acousticness === nextFilters.acousticness
      ) {
        return prev;
      }

      return nextFilters;
    });
  }

  useEffect(() => {
    if (!timer.running || brushingPhase !== "running") {
      return;
    }

    const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    const remaining = Math.max(0, totalSeconds - Math.floor(brushingMusicElapsedSeconds));

    setTimer((prev) => {
      const nextRunning = remaining > 0;
      if (prev.remaining === remaining && prev.running === nextRunning) {
        return prev;
      }

      return { running: nextRunning, remaining };
    });

    if (remaining <= 0) {
      trackEvent("brushing_completed");
      setBrushingPhase("complete");
      setPlayerCommand((previous) => ({ type: "pause", nonce: previous.nonce + 1 }));
    }
  }, [timer.running, brushingPhase, brushingMusicElapsedSeconds, bpmData?.totalBrushingSeconds, brushDurationSeconds]);

  function issuePlayerCommand(type) {
    setPlayerCommand((previous) => ({ type, nonce: previous.nonce + 1 }));
  }

  function handlePlaybackTick(seconds) {
    setPlaybackSeconds(seconds);

    if (brushingPhase !== "running") {
      lastPlaybackTickRef.current = seconds;
      return;
    }

    const previousTick = lastPlaybackTickRef.current;
    lastPlaybackTickRef.current = seconds;

    if (typeof previousTick !== "number") {
      return;
    }

    const delta = seconds - previousTick;

    // New song starts near 0s; ignore negative jump and continue accumulating from subsequent ticks.
    if (delta <= 0 || delta > 5) {
      return;
    }

    setBrushingMusicElapsedSeconds((prev) => prev + delta);
  }

  async function handleSelectSong(song) {
    trackEvent("song_selected", { title: song.title, artist: song.artist });
    setWorkflowStep("brush");
    queuedSongRef.current = null;
    setQueuedSongPreview(null);
    return handleSelectSongWithOptions(song, { autoplay: false });
  }

  async function handleSelectSongWithOptions(song, options = { autoplay: false }) {
    setSelectedSong(song);
    // Keep old playerData visible while loading new video
    if (!loading.player) {
      setLoading((prev) => ({ ...prev, player: true }));
    }

    try {
      const video = await getYoutubeVideo({ title: song.title, artist: song.artist });
      setPlayerData(video);

      if (options.autoplay && video?.embedUrl) {
        setAutoplayToken((prev) => prev + 1);
      }

      setError("");
      return video;
    } catch (err) {
      setError(err.message);
      setPlayerData(null);
      return null;
    } finally {
      setLoading((prev) => ({ ...prev, player: false }));
    }
  }

  function startBrushing(options = { restartVideo: false }) {
    if ((bpmData?.totalTeeth || 0) <= 0) {
      setError(t("brushing.errors.needsTeeth"));
      return;
    }

    if (!playerData?.embedUrl) {
      setError(t("brushing.errors.needsPlayback"));
      return;
    }

    const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    setBrushingMusicElapsedSeconds(0);
  setPlaybackSeconds(options.restartVideo ? 0 : playbackSeconds);
  lastPlaybackTickRef.current = options.restartVideo ? 0 : playbackSeconds;
    setTimer({ running: true, remaining: totalSeconds });
    setBrushingPhase("running");
  issuePlayerCommand(options.restartVideo ? "restart" : "play");
    markSongAsPlayed(selectedSong);

    const queuedSong = queueNextGeneratedSong(selectedSong);
    if (queuedSong) {
      trackEvent("song_auto_queued", { title: queuedSong.title, artist: queuedSong.artist, trigger: "start_brushing" });
    }

    if (storageConsent === "granted" && selectedSong?.title && selectedSong?.artist) {
      const sessionToSave = {
        song: {
          title: selectedSong.title,
          artist: selectedSong.artist,
          bpm: selectedSong.bpm
        },
        youtube: playerData?.embedUrl
          ? {
              embedUrl: playerData.embedUrl,
              videoId: playerData.videoId
            }
          : undefined,
        bpmSnapshot: bpmData,
        values,
        filters: songFilters,
        keyword,
        brushingHand,
        brushDurationSeconds,
        savedAt: Date.now()
      };

      saveStoredPreferences({
        values,
        filters: songFilters,
        keyword,
        brushingHand,
        brushDurationSeconds,
        savedAt: sessionToSave.savedAt
      });
      saveLastSession(sessionToSave);
      setLastSession(sessionToSave);
    }

    trackEvent("brushing_started", { song_title: selectedSong?.title, song_artist: selectedSong?.artist, duration_seconds: totalSeconds });
    setError("");
  }

  function pauseBrushing() {
    if (brushingPhase !== "running") {
      return;
    }

    setTimer((previous) => ({ ...previous, running: false }));
    setBrushingPhase("paused");
    lastPlaybackTickRef.current = playbackSeconds;
    issuePlayerCommand("pause");
  }

  function restartBrushing() {
    const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    issuePlayerCommand("reset");
    setPlaybackSeconds(0);
    setBrushingMusicElapsedSeconds(0);
    lastPlaybackTickRef.current = 0;
    setTimer({ running: false, remaining: totalSeconds });
    setBrushingPhase("idle");
    queuedSongRef.current = null;
    setQueuedSongPreview(null);
    trackEvent("brushing_reset", { song_title: selectedSong?.title, song_artist: selectedSong?.artist, duration_seconds: totalSeconds });
    setError("");
  }

  function goToMusicStep() {
    setWorkflowStep("music");
  }

  function handleBrushDurationChange(nextDuration) {
    const safeDuration = Number(nextDuration || DEFAULT_BRUSH_DURATION_SECONDS);
    setBrushDurationSeconds(safeDuration);
  }

  function updateValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function regenerateSongs() {
    setSongRefreshSeed((prev) => prev + 1);
  }

  function handleSongEnded() {
    if (brushingPhase !== "running") {
      return;
    }

    trackEvent("song_playback_finished_during_brushing", {
      song_title: selectedSong?.title,
      song_artist: selectedSong?.artist,
      queued_title: queuedSongRef.current?.title,
      queued_artist: queuedSongRef.current?.artist
    });
  }

  const subtitle = useMemo(() => {
    if (!bpmData) {
      return t("app.subtitle.withoutBpm", {
        description: detectedBrusherProfile.description
      });
    }

    return t("app.subtitle.withBpm", {
      label: detectedBrusherProfile.label,
      bpm: Math.round(bpmData.searchBpm),
      secondsPerTooth: bpmData.secondsPerTooth,
      transitionSeconds: bpmData.transitionBufferSeconds,
      ageText: formatAgeDescription(t, ageEstimate)
    });
  }, [ageEstimate, bpmData, detectedBrusherProfile.description, detectedBrusherProfile.label, t]);

  const phaseLabel = useMemo(() => {
    if (brushingPhase === "running") {
      return t("app.status.running");
    }

    if (brushingPhase === "paused") {
      return t("app.status.paused");
    }

    if (brushingPhase === "complete") {
      return t("app.status.complete");
    }

    return t("app.status.idle");
  }, [brushingPhase, t]);

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  const primaryBrushActionLabel =
    brushingPhase === "running"
      ? t("brushing.pause")
      : brushingPhase === "paused"
        ? t("brushing.restart")
        : brushingPhase === "complete"
          ? t("brushing.again", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) })
          : t("brushing.start", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) });

  const showTopConsentNotices = workflowStep === "teeth";
  const showLastSessionBanner = workflowStep === "music";

  return (
    <main className={`app-shell ${device.isMobile ? "mobile-shell" : "desktop-shell"}${appView === "workshop" && !device.isMobile ? " workshop-shell" : ""}`}>
      {!(appView === "workshop" && !device.isMobile) && (
      <header className="app-header">
        <p className="eyebrow">{t("app.eyebrow")}</p>
        <h1>{device.isMobile ? t("app.title.mobile") : t("app.title.desktop")}</h1>
        <p>{subtitle}</p>
        <p className={`state-chip ${brushingPhase}`}>{t("app.status.label", { state: phaseLabel })}</p>
        <p className={`mode-chip ${device.mode}`}>{device.isMobile ? t("common.layouts.mobile") : t("common.layouts.desktop")}</p>
        {!device.isMobile && (
          <div className="header-utility-row">
            <button
              type="button"
              className="header-utility-btn"
              onClick={() => setAppView((current) => (current === "workshop" ? "brush" : "workshop"))}
            >
              {appView === "workshop" ? "Return to brushing flow" : "Open translation workshop"}
            </button>
          </div>
        )}
      </header>
      )}

      {appView === "workshop" && !device.isMobile ? (
        <TranslationWorkshop
          initialTargetLanguage={workshopInitialLanguage}
          languageOptions={supportedLanguageOptions}
          onExit={() => setAppView("brush")}
        />
      ) : (
        <>
      <nav className={`workflow-tabs ${device.isMobile ? "mobile-workflow-tabs" : "desktop-workflow-tabs"}`} aria-label={t("app.workflow.ariaLabel")}>
          <button
            type="button"
            className={`workflow-tab${workflowStep === "teeth" ? " active" : ""}`}
            onClick={() => setWorkflowStep("teeth")}
          >
            {t("app.workflow.teeth")}
          </button>
          <button
            type="button"
            className={`workflow-tab${workflowStep === "music" ? " active" : ""}`}
            onClick={() => setWorkflowStep("music")}
          >
            {t("app.workflow.music")}
          </button>
          <button
            type="button"
            className={`workflow-tab${workflowStep === "brush" ? " active" : ""}`}
            onClick={() => setWorkflowStep("brush")}
          >
            {t("app.workflow.brush")}
          </button>
      </nav>

      <section className="care-routine-strip" aria-label={t("app.routine.ariaLabel")}>
        <div className="care-routine-header">
          <strong>{t("app.routine.title")}</strong>
        </div>
        <div className="care-routine-grid">
          <article className="care-routine-card active">
            <span className="care-routine-badge">{t("app.routine.available")}</span>
            <strong>{t("app.routine.brushing.title")}</strong>
            <p>{t("app.routine.brushing.description")}</p>
          </article>
          <article className="care-routine-card coming-soon" aria-disabled="true">
            <span className="care-routine-badge">{t("app.routine.comingSoon")}</span>
            <strong>{t("app.routine.flossing.title")}</strong>
            <p>{t("app.routine.flossing.description")}</p>
          </article>
          <article className="care-routine-card coming-soon" aria-disabled="true">
            <span className="care-routine-badge">{t("app.routine.comingSoon")}</span>
            <strong>{t("app.routine.waterPicking.title")}</strong>
            <p>{t("app.routine.waterPicking.description")}</p>
          </article>
        </div>
      </section>

      {languageFallbackState.needsSupportedLanguageChoice && (
        <section className="language-simulator-card" aria-label={t("settings.supportedLanguage.ariaLabel")}>
          <div className="language-simulator-copy">
            <strong>{t("settings.supportedLanguage.label")}</strong>
            <span>{t("settings.supportedLanguage.hint", { requestedLanguage: languageFallbackState.requestedLanguage || t("settings.supportedLanguage.unknownLanguage") })}</span>
          </div>
          <label className="language-simulator-control">
            <span>{t("settings.language")}</span>
            <select
              value={i18n.resolvedLanguage || i18n.language || "en"}
              onChange={(event) => handlePreferredLanguageChange(event.target.value)}
            >
              {supportedLanguageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}

      {showTopConsentNotices && analyticsAvailable && analyticsConsent === "unknown" && (
        <section className="consent-banner" role="region" aria-label="Privacy controls">
          <p>
            {t("privacy.analyticsMessage")}
            <button type="button" className="privacy-link" onClick={openPrivacyModal}>
              {t("common.buttons.privacyPolicy")}
            </button>
          </p>
          <div className="consent-actions">
            <button type="button" className="action-btn" onClick={handleAcceptAnalytics}>
              {t("common.buttons.allowAnalytics")}
            </button>
            <button type="button" className="action-btn secondary" onClick={handleDeclineAnalytics}>
              {t("common.buttons.decline")}
            </button>
          </div>
        </section>
      )}

      {showTopConsentNotices && !storageBannerDismissed && (
        <section className="storage-banner" role="region" aria-label="Storage consent controls">
          <p>
            {t("privacy.storageMessage")}
            <button type="button" className="privacy-link" onClick={openPrivacyModal}>
              {t("common.buttons.privacyPolicy")}
            </button>
          </p>
          <div className="consent-actions">
            <button type="button" className="action-btn" onClick={handleAllowStorage}>
              {t("common.buttons.allowStorage")}
            </button>
            <button type="button" className="action-btn secondary" onClick={handleDeclineStorage}>
              {t("common.buttons.optOut")}
            </button>
            <button type="button" className="action-btn secondary" onClick={handleDismissStorageBanner}>
              {t("common.buttons.dismiss")}
            </button>
          </div>
        </section>
      )}

      {showLastSessionBanner && lastSession?.song && storageConsent === "granted" && (
        <section className="last-song-banner" aria-live="polite">
          <p>{t("app.lastSession.summary", {
            title: lastSession.song.title,
            artist: lastSession.song.artist,
            top: lastSession.values.top,
            bottom: lastSession.values.bottom,
            duration: formatTime(lastSession.brushDurationSeconds)
          })}</p>
          <button type="button" className="action-btn secondary" onClick={handleRepeatLastSession}>
            {t("common.buttons.repeatLastSession")}
          </button>
        </section>
      )}

      {backendStatus && !error && <p className="info-banner">{backendStatus}</p>}
      {error && <p className="error-banner">{error}</p>}

      {workflowStep === "teeth" && (
        <section className={`layout-grid ${device.isMobile ? "mobile-mode" : "desktop-mode desktop-step-layout"}`}>
          <BPMCalculator
            brusherProfile={detectedBrusherProfile}
            values={values}
            onChange={updateValue}
            onContinueToMusic={() => setWorkflowStep("music")}
            bpmData={bpmData}
            brushDurationSeconds={brushDurationSeconds}
            loading={loading.bpm}
            isMobile={device.isMobile}
          />
        </section>
      )}

      {workflowStep === "music" && (
        <section className={`layout-grid ${device.isMobile ? "mobile-mode" : "desktop-mode desktop-step-layout"}`}>
          <SongList
            brusherProfile={detectedBrusherProfile}
            songs={songs}
            exhausted={isSongPoolExhausted}
            loading={loading.songs}
            tolerance={draftSongFilters.tolerance}
            danceability={draftSongFilters.danceability}
            acousticness={draftSongFilters.acousticness}
            keyword={keyword}
            isMobile={device.isMobile}
            onToleranceChange={(value) => updateDraftSongFilter("tolerance", value)}
            onDanceabilityChange={(value) => updateDraftSongFilter("danceability", value)}
            onAcousticnessChange={(value) => updateDraftSongFilter("acousticness", value)}
            onCommitTolerance={(value) => commitSongFilter("tolerance", value)}
            onCommitDanceability={(value) => commitSongFilter("danceability", value)}
            onCommitAcousticness={(value) => commitSongFilter("acousticness", value)}
            onKeywordChange={setKeyword}
            onSelectSong={handleSelectSong}
            onRegenerate={regenerateSongs}
          />
        </section>
      )}

      {workflowStep === "brush" && (
        <section className={`layout-grid ${device.isMobile ? "mobile-mode" : "desktop-mode desktop-brush-layout"}`}>
          <section className={`card brush-actions-card ${device.isMobile ? "" : "desktop-step-card"}`.trim()}>
            <h2>{t("brushing.controlsTitle")}</h2>
            <p>{t("brushing.controlsIntro")}</p>
            {selectedSong && (
              <>
                <p className="brush-selected-song">{t("brushing.selectedSong", { title: selectedSong.title, artist: selectedSong.artist })}</p>
                {queuedSongPreview && brushingPhase === "running" && (
                  <p className="brush-next-song">{t("brushing.upNext", { title: queuedSongPreview.title, artist: queuedSongPreview.artist })}</p>
                )}
                <button type="button" className="action-btn secondary" onClick={goToMusicStep}>
                  {t("common.buttons.changeMusic")}
                </button>
              </>
            )}
            <div className="brush-hand-picker" role="group" aria-label={t("brushing.handPreference")}>
              <span className="profile-summary-label">{t("brushing.handPreference")}</span>
              <div className="brush-hand-actions">
                <button
                  type="button"
                  className={`brush-hand-btn${brushingHand === "left" ? " active" : ""}`}
                  onClick={() => setBrushingHand("left")}
                >
                  {t("common.buttons.leftHand")}
                </button>
                <button
                  type="button"
                  className={`brush-hand-btn${brushingHand === "right" ? " active" : ""}`}
                  onClick={() => setBrushingHand("right")}
                >
                  {t("common.buttons.rightHand")}
                </button>
              </div>
            </div>
            <label className="brush-duration-picker">
              <span className="profile-summary-label">{t("brushing.duration")}</span>
              <select
                value={brushDurationSeconds}
                onChange={(event) => handleBrushDurationChange(Number(event.target.value))}
                disabled={brushingPhase === "running"}
              >
                {BRUSH_DURATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatTime(option)}
                  </option>
                ))}
              </select>
              <span className="brush-duration-hint">{t("brushing.durationHint")}</span>
            </label>
            {!device.isMobile && (
              <>
                <div className={`brush-cue-card${brushControlCue?.kind ? ` ${brushControlCue.kind}` : ""}`} aria-live="polite">
                  <strong>{brushControlCue?.title || t("brushing.readyTitle")}</strong>
                  {(brushControlCue?.detail || !brushControlCue)
                    ? <span>{brushControlCue?.detail || t("brushing.readyDetail", { hand: t(`common.hands.${brushingHand}`) })}</span>
                    : null}
                </div>
                <div className="session-actions">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => {
                      if (brushingPhase === "running") {
                        pauseBrushing();
                        return;
                      }

                      if (brushingPhase === "paused") {
                        startBrushing({ restartVideo: true });
                        return;
                      }

                      startBrushing({ restartVideo: brushingPhase === "complete" });
                    }}
                  >
                    {primaryBrushActionLabel}
                  </button>
                  <button type="button" className="action-btn secondary" onClick={restartBrushing}>
                    {t("brushing.stop")}
                  </button>
                </div>
                {brushingPhase === "complete" && (
                  <section className="success-banner brush-success-banner" aria-live="polite">
                    {t("app.success", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) })}
                  </section>
                )}
                <p className="timer-note">{t("brushing.timerNote")}</p>
              </>
            )}
          </section>

          <Player
            selectedSong={selectedSong}
            playerData={playerData}
            loading={loading.player}
            brushingPhase={brushingPhase}
            isMobile={device.isMobile}
            autoplayToken={autoplayToken}
            playbackCommand={playerCommand}
            onPlaybackTick={handlePlaybackTick}
            onSongEnded={handleSongEnded}
          />

          {device.isMobile && (
            <section className="card mobile-brush-runtime-card">
              <div className={`brush-cue-card${brushControlCue?.kind ? ` ${brushControlCue.kind}` : ""}`} aria-live="polite">
                <strong>{brushControlCue?.title || t("brushing.readyTitle")}</strong>
                {(brushControlCue?.detail || !brushControlCue)
                  ? <span>{brushControlCue?.detail || t("brushing.readyDetail", { hand: t(`common.hands.${brushingHand}`) })}</span>
                  : null}
              </div>
              <div className="session-actions compact-mobile-actions">
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => {
                    if (brushingPhase === "running") {
                      pauseBrushing();
                      return;
                    }

                    if (brushingPhase === "paused") {
                      startBrushing({ restartVideo: true });
                      return;
                    }

                    startBrushing({ restartVideo: brushingPhase === "complete" });
                  }}
                >
                  {primaryBrushActionLabel}
                </button>
                <button type="button" className="action-btn secondary" onClick={restartBrushing}>
                  {t("brushing.stop")}
                </button>
              </div>
              {brushingPhase === "complete" && (
                <section className="success-banner brush-success-banner" aria-live="polite">
                  {t("app.success", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) })}
                </section>
              )}
            </section>
          )}

          <BrushingGuide
            bpmData={bpmData}
            timer={timer}
            brushingPhase={brushingPhase}
            values={values}
            selectedBpm={selectedBrushBpm}
            isMobile={device.isMobile}
            playbackSeconds={playbackSeconds}
            brushingMusicElapsedSeconds={brushingMusicElapsedSeconds}
            brushingHand={brushingHand}
            onCueChange={setBrushControlCue}
          />
        </section>
      )}
        </>
      )}

      <footer className="credit-strip" id="credit">
        <p>
          {t("footer.poweredBy")}
          <a href="https://getsongbpm.com" target="_blank" rel="noreferrer">
            GetSongBPM
          </a>
        </p>
        {analyticsAvailable && (
          <div className="privacy-controls">
            <span>{t("footer.analytics", { state: analyticsConsent === "granted" ? t("common.states.on") : t("common.states.off") })}</span>
            <button type="button" className="privacy-toggle" onClick={openPrivacyModal}>
              {t("common.buttons.privacyPolicy")}
            </button>
            {analyticsConsent === "granted" ? (
              <button type="button" className="privacy-toggle" onClick={handleDeclineAnalytics}>
                {t("common.buttons.turnOff")}
              </button>
            ) : (
              <button type="button" className="privacy-toggle" onClick={handleAcceptAnalytics}>
                {t("common.buttons.turnOn")}
              </button>
            )}
          </div>
        )}
        <div className="privacy-controls">
          <span>{t("footer.sessionStorage", { state: storageConsent === "granted" ? t("common.states.on") : t("common.states.off") })}</span>
          {storageConsent === "granted" ? (
            <button type="button" className="privacy-toggle" onClick={handleDeclineStorage}>
              {t("common.buttons.turnOff")}
            </button>
          ) : (
            <button type="button" className="privacy-toggle" onClick={handleAllowStorage}>
              {t("common.buttons.turnOn")}
            </button>
          )}
          <button type="button" className="privacy-toggle" onClick={openStorageInfoModal}>
            {t("common.buttons.storageNotice")}
          </button>
        </div>
        {import.meta.env.VITE_GIT_SHA && (
          <p className="version-info">
            <code>v{import.meta.env.VITE_GIT_SHA.substring(0, 7)}</code>
          </p>
        )}
      </footer>

      {activeModal && (
        <div className="privacy-modal-overlay" role="presentation" onClick={closePrivacyModal}>
          <section
            className="privacy-modal"
            role="dialog"
            aria-modal="true"
            aria-label={activeModal === "privacy" ? t("privacy.modalTitle") : t("privacy.storageModalTitle")}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{activeModal === "privacy" ? t("privacy.modalTitle") : t("privacy.storageModalTitle")}</h2>
            {activeModal === "privacy" ? (
              <>
                <p>{t("privacy.modalBody1")}</p>
                <p>{t("privacy.modalBody2")}</p>
                <p>{t("privacy.modalBody3")}</p>
                <p>{t("privacy.modalBody4")}</p>
              </>
            ) : (
              <>
                <p>{t("privacy.storageModalBody1")}</p>
                <p>{t("privacy.storageModalBody2")}</p>
                <p>{t("privacy.storageModalBody3")}</p>
                <p>{t("privacy.storageModalBody4")}</p>
              </>
            )}
            <div className="privacy-modal-actions">
              <button type="button" className="action-btn secondary" onClick={closePrivacyModal}>
                {t("common.buttons.close")}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
