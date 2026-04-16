import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import BPMCalculator from "./components/BPMCalculator";
import SongList from "./components/SongList";
import Player from "./components/Player";
import BrushingGuide from "./components/BrushingGuide";
import HouseholdSetupPanel from "./components/HouseholdSetupPanel";
import TranslationWorkshop from "./components/TranslationWorkshop";
import VersionHistory from "./components/VersionHistory";
import { clearPersistedPhase2Data, loadPersistedAppState } from "./db/appStateService";
import { initializePhase2Migration } from "./db/migrationService";
import { completeHouseholdOnboarding, saveHouseholdOnboardingDraft, setHouseholdOnboardingUiDismissed } from "./db/householdSetupService";
import { getLanguageFallbackInfo, setPreferredSupportedLanguage } from "./i18n.ts";
import { getBpm, getGeoCountry, getSongs, getYoutubeVideo } from "./api/client";
import { buildReinforcementPool, getAgeMessageGroupCount, pickReinforcementMessage } from "./lib/reinforcementMessages";
import {
  analyticsEnabled,
  getAnalyticsConsentStatus,
  initializeAnalytics,
  setAnalyticsConsent,
  trackEvent
} from "./lib/analytics";
import {
  addFavoriteSong,
  clearFavoriteSongs,
  clearStoredPreferences,
  clearLastSession,
  getStorageConsentStatus,
  isStorageBannerDismissed,
  loadFavoriteSongs,
  loadLastSession,
  loadStoredPreferences,
  removeFavoriteSong,
  saveLastSession,
  saveStoredPreferences,
  setStorageBannerDismissed,
  setStorageConsent
} from "./lib/storagePreference";
import { estimateAgeFromTeethFull } from "./lib/teethAge";
import { useDeviceContext } from "./lib/deviceContext";
import { buildUserMusicContext } from "./lib/userMusicContext";
import "./App.css";

const DEFAULT_VALUES = { top: 16, bottom: 16 };
const DEFAULT_BRUSH_DURATION_SECONDS = 120;
const BRUSH_DURATION_OPTIONS = [90, 120, 150, 180];
const START_DELAY_SECONDS = 5;

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

function normalizeTeethDraftValue(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(16, Math.max(0, Math.round(numericValue)));
}

function buildHouseholdSetupDraft({ household, activeUser, onboardingDraft, userDefaults, migrationState }) {
  const topTeethCount = normalizeTeethDraftValue(
    onboardingDraft?.topTeethCount ?? activeUser?.topTeethCount ?? userDefaults?.values?.top,
    16
  );
  const bottomTeethCount = normalizeTeethDraftValue(
    onboardingDraft?.bottomTeethCount ?? activeUser?.bottomTeethCount ?? userDefaults?.values?.bottom,
    16
  );
  const totalTeethCount = topTeethCount + bottomTeethCount;

  return {
    householdName: onboardingDraft?.householdName || household?.householdName || "BrushBeats Household",
    memberName: onboardingDraft?.memberName || activeUser?.name || "Primary Brusher",
    topTeethCount,
    bottomTeethCount,
    brushingHand: onboardingDraft?.brushingHand || userDefaults?.brushingHand || "right",
    brushType: onboardingDraft?.brushType || userDefaults?.brushType || "manual",
    brushDurationSeconds: Number(onboardingDraft?.brushDurationSeconds || userDefaults?.brushDurationSeconds || DEFAULT_BRUSH_DURATION_SECONDS),
    keyword: onboardingDraft?.keyword || userDefaults?.keyword || "",
    filters: onboardingDraft?.filters || userDefaults?.filters || createInitialSongPreferences(totalTeethCount),
    additionalMembers: Array.isArray(onboardingDraft?.additionalMembers) ? onboardingDraft.additionalMembers : [],
    reviewSource: onboardingDraft?.reviewSource || (migrationState?.completedAt ? "migration-review" : "bootstrap")
  };
}

function App() {
  const { t, i18n } = useTranslation();
  const [dbStatus, setDbStatus] = useState(() => {
    if (typeof window === "undefined") {
      return { ready: false, mode: "legacy-storage-fallback" };
    }

    return window.__brushbeatsDbStatus || { ready: false, mode: "legacy-storage-fallback" };
  });
  const [migrationNotice, setMigrationNotice] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.__brushbeatsMigrationStatus || null;
  });
  const [appView, setAppView] = useState(() => {
    if (typeof window === "undefined") {
      return "brush";
    }

    const mode = new URLSearchParams(window.location.search).get("mode");
    return mode === "workshop" || mode === "history" ? mode : "brush";
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
  const [songDurationSeconds, setSongDurationSeconds] = useState(0);
  const [brushingMusicElapsedSeconds, setBrushingMusicElapsedSeconds] = useState(0);
  const [countdownRemainingMs, setCountdownRemainingMs] = useState(0);
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
  const [brushType, setBrushType] = useState("manual");
  const [expandedRoutineCard, setExpandedRoutineCard] = useState(null);
  const [brushDurationSeconds, setBrushDurationSeconds] = useState(DEFAULT_BRUSH_DURATION_SECONDS);
  const [brushControlCue, setBrushControlCue] = useState(null);
  const [queuedSongPreview, setQueuedSongPreview] = useState(null);
  const [playerCommand, setPlayerCommand] = useState({ type: "idle", nonce: 0 });
  const [autoRestoredBrushView, setAutoRestoredBrushView] = useState(false);
  const [geoCountry, setGeoCountry] = useState(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [songsDebugInfo, setSongsDebugInfo] = useState(null);
  const [favoriteSongs, setFavoriteSongs] = useState([]);
  const [householdProfile, setHouseholdProfile] = useState(null);
  const [activeHouseholdUser, setActiveHouseholdUser] = useState(null);
  const [persistedMigrationState, setPersistedMigrationState] = useState(null);
  const [householdOnboardingState, setHouseholdOnboardingState] = useState(null);
  const [householdOnboardingUiState, setHouseholdOnboardingUiState] = useState(null);
  const [householdSetupDraft, setHouseholdSetupDraft] = useState(null);
  const [householdSetupSaving, setHouseholdSetupSaving] = useState(false);
  const [persistedStateRevision, setPersistedStateRevision] = useState(0);
  const [queuedStoredSongKey, setQueuedStoredSongKey] = useState("");
  const seenSongsByQueryRef = useRef(new Map());
  const playedSongsRef = useRef(new Set());
  const queuedSongRef = useRef(null);
  const lastPlaybackTickRef = useRef(null);
  const playbackSecondsRef = useRef(0);
  const countdownDeadlineRef = useRef(null);
  const playOnCountdownEndRef = useRef(false);
  const compactRoutineRef = useRef(storageBannerDismissed || storageConsent !== "unknown");
  const preferencesHydratedRef = useRef(false);
  const repeatSessionBootstrapRef = useRef(false);
  const restoredSessionRef = useRef(null);
  const latestVideoLookupRef = useRef(0);
  const lastCompletionMessageRef = useRef("");
  const trackedMigrationNoticeRef = useRef(null);
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
  const isReturningVisitor = compactRoutineRef.current;
  const [isRoutineExpanded, setIsRoutineExpanded] = useState(!isReturningVisitor);
  const hideRestoredReadyCue = device.isMobile && autoRestoredBrushView && (!brushControlCue || brushControlCue.kind === "ready");
  const showCompactRoutine = isReturningVisitor && !isRoutineExpanded;
  const reinforcementPool = useMemo(
    () => buildReinforcementPool(ageEstimate?.phase, totalTeeth, brushType),
    [ageEstimate?.phase, brushType, totalTeeth]
  );
  const ageGroupCount = getAgeMessageGroupCount();

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    function handleDbStatus(event) {
      setDbStatus(event.detail || { ready: false, mode: "legacy-storage-fallback" });
    }

    function handleMigrationStatus(event) {
      setMigrationNotice(event.detail || null);
    }

    window.addEventListener("brushbeats:db-status", handleDbStatus);
    window.addEventListener("brushbeats:migration-status", handleMigrationStatus);
    return () => {
      window.removeEventListener("brushbeats:db-status", handleDbStatus);
      window.removeEventListener("brushbeats:migration-status", handleMigrationStatus);
    };
  }, []);

  useEffect(() => {
    if (!migrationNotice?.kind || trackedMigrationNoticeRef.current === migrationNotice.kind) {
      return;
    }

    trackedMigrationNoticeRef.current = migrationNotice.kind;
    trackEvent("phase2_migration_status", {
      result: migrationNotice.kind,
      has_error: migrationNotice.kind === "migration-failed"
    });
  }, [migrationNotice]);

  useEffect(() => {
    let isMounted = true;

    async function fetchGeoCountry() {
      try {
        const response = await getGeoCountry();
        if (isMounted) {
          setGeoCountry(response);
        }
      } catch (err) {
        if (isMounted) {
          setGeoCountry({
            ok: false,
            ip: "unknown",
            country: "Unknown",
            countryCode: "--",
            source: "error",
            detail: err?.message || "lookup failed"
          });
        }
      }
    }

    void fetchGeoCountry();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (brushingPhase !== "complete") {
      return;
    }

    const nextMessage = pickReinforcementMessage(reinforcementPool, lastCompletionMessageRef.current);
    lastCompletionMessageRef.current = nextMessage;
    setCompletionMessage(nextMessage);
  }, [brushingPhase, reinforcementPool]);

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
    } else if (appView === "history") {
      url.searchParams.set("mode", "history");
    } else {
      url.searchParams.delete("mode");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [appView, device.isMobile]);

  useEffect(() => {
    setLanguageFallbackState(getLanguageFallbackInfo());
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    playbackSecondsRef.current = playbackSeconds;
  }, [playbackSeconds]);

  useEffect(() => {
    if (isReturningVisitor && workflowStep === "brush") {
      setIsRoutineExpanded(false);
    }
  }, [isReturningVisitor, workflowStep]);

  function applySavedSession(session) {
    if (!session) {
      return;
    }

    setValues(session.values);
    setSongFilters(session.filters);
    setDraftSongFilters(session.filters);
    setKeyword(session.keyword || "");
    setBrushingHand(session.brushingHand || "right");
    setBrushType(session.brushType || "manual");
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
    let cancelled = false;

    async function hydratePersistedState() {
      if (storageConsent === "granted") {
        const fallbackState = {
          storageConsent,
          storageBannerDismissed,
          preferences: loadStoredPreferences(),
          lastSession: loadLastSession(),
          favoriteSongs: loadFavoriteSongs()
        };
        const persistedState = dbStatus.ready
          ? await loadPersistedAppState(fallbackState)
          : {
              ...fallbackState,
              household: null,
              activeUser: null,
              migrationState: null,
              onboardingState: null,
              onboardingDraft: null,
              userDefaults: null
            };

        if (cancelled) {
          return;
        }

        if (persistedState.storageConsent && persistedState.storageConsent !== storageConsent) {
          setStorageConsentState(persistedState.storageConsent);
        }

        if (typeof persistedState.storageBannerDismissed === "boolean" && persistedState.storageBannerDismissed !== storageBannerDismissed) {
          setStorageBannerDismissedState(persistedState.storageBannerDismissed);
        }

        const savedPreferences = persistedState.userDefaults || persistedState.preferences;
        const savedSession = persistedState.lastSession;
        const savedFavorites = persistedState.favoriteSongs || [];

        if (savedPreferences) {
          applySavedSession(savedPreferences);
        } else if (savedSession) {
          applySavedSession(savedSession);
        }

        restoredSessionRef.current = savedSession;
        setBpmData(savedSession?.bpmSnapshot || null);
        setLastSession(savedSession);
        setFavoriteSongs(savedFavorites);
        setHouseholdProfile(persistedState.household || null);
        setActiveHouseholdUser(persistedState.activeUser || null);
        setPersistedMigrationState(persistedState.migrationState || null);
        setHouseholdOnboardingState(persistedState.onboardingState || null);
        setHouseholdOnboardingUiState(persistedState.onboardingUiState || null);
        setHouseholdSetupDraft(
          persistedState.household?.householdId && !persistedState.onboardingState?.completedAt
            ? buildHouseholdSetupDraft({
                household: persistedState.household,
                activeUser: persistedState.activeUser,
                onboardingDraft: persistedState.onboardingDraft,
                userDefaults: persistedState.userDefaults || persistedState.preferences,
                migrationState: persistedState.migrationState
              })
            : null
        );
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
      setFavoriteSongs([]);
      setBpmData(null);
      setAutoRestoredBrushView(false);
      setHouseholdProfile(null);
      setActiveHouseholdUser(null);
      setPersistedMigrationState(null);
      setHouseholdOnboardingState(null);
      setHouseholdOnboardingUiState(null);
      setHouseholdSetupDraft(null);
    }

    void hydratePersistedState();
    return () => {
      cancelled = true;
    };
  }, [dbStatus.ready, persistedStateRevision, storageBannerDismissed, storageConsent]);

  useEffect(() => {
    if (
      storageConsent !== "granted" ||
      !dbStatus.ready ||
      !householdProfile?.householdId ||
      !householdSetupDraft ||
      householdOnboardingState?.completedAt
    ) {
      return;
    }

    void saveHouseholdOnboardingDraft(householdSetupDraft);
  }, [dbStatus.ready, householdOnboardingState?.completedAt, householdProfile?.householdId, householdSetupDraft, storageConsent]);

  useEffect(() => {
    if (storageConsent !== "granted" || !preferencesHydratedRef.current) {
      return;
    }

    saveStoredPreferences({
      values,
      filters: songFilters,
      keyword,
      brushingHand,
      brushType,
      brushDurationSeconds,
      savedAt: Date.now()
    });
  }, [brushDurationSeconds, brushingHand, brushType, keyword, songFilters, storageConsent, values]);

  useEffect(() => {
    if (storageConsent !== "granted" || repeatSessionBootstrapRef.current || !lastSession?.song) {
      return;
    }

    repeatSessionBootstrapRef.current = true;
    applySavedSession(lastSession);
    setWorkflowStep("brush");
    setAutoRestoredBrushView(true);
    setSelectedSong(lastSession.song);
    setError("");
    setBpmData(lastSession.bpmSnapshot || null);

    if (lastSession.youtube?.embedUrl) {
      setPlayerData(lastSession.youtube);
      return;
    }

    void handleSelectSongWithOptions(lastSession.song, { autoplay: false });
  }, [lastSession, storageConsent]);

  async function handleAllowStorage() {
    const nextStatus = setStorageConsent(true);
    setStorageConsentState(nextStatus);
    setStorageBannerDismissed(false);
    setStorageBannerDismissedState(false);

    if (!dbStatus.ready) {
      return;
    }

    try {
      const migrationStatus = await initializePhase2Migration();
      if (typeof window !== "undefined") {
        window.__brushbeatsMigrationStatus = migrationStatus;
        window.dispatchEvent(new CustomEvent("brushbeats:migration-status", { detail: migrationStatus }));
      }
      setPersistedStateRevision((current) => current + 1);
      setError("");
    } catch (setupError) {
      setError(setupError?.message || t("app.migration.failedLegacyStorage"));
    }
  }

  async function handleDeclineStorage() {
    const nextStatus = setStorageConsent(false);
    setStorageConsentState(nextStatus);
    clearStoredPreferences();
    clearLastSession();
    clearFavoriteSongs();
    setLastSession(null);
    setFavoriteSongs([]);

    if (!dbStatus.ready) {
      return;
    }

    try {
      await clearPersistedPhase2Data();
      setPersistedStateRevision((current) => current + 1);
      setMigrationNotice(null);
      setError("");
    } catch (clearError) {
      setError(clearError?.message || t("app.householdSetup.saveFailed"));
    }
  }

  function handleDismissStorageBanner() {
    setStorageBannerDismissed(true);
    setStorageBannerDismissedState(true);
  }

  function handleShowStorageBanner() {
    setStorageBannerDismissed(false);
    setStorageBannerDismissedState(false);
  }

  function handleHouseholdSetupDraftChange(field, value) {
    setHouseholdSetupDraft((current) => {
      if (!current) {
        return current;
      }

      if (field === "topTeethCount" || field === "bottomTeethCount") {
        return {
          ...current,
          [field]: normalizeTeethDraftValue(value, current[field])
        };
      }

      return {
        ...current,
        [field]: value
      };
    });
  }

  function handleAddHouseholdMember() {
    setHouseholdSetupDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        additionalMembers: [
          ...(current.additionalMembers || []),
          {
            clientId: `member-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            memberName: "",
            topTeethCount: 16,
            bottomTeethCount: 16
          }
        ].slice(0, 4)
      };
    });
  }

  function handleRemoveHouseholdMember(clientId) {
    setHouseholdSetupDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        additionalMembers: (current.additionalMembers || []).filter((member) => member.clientId !== clientId)
      };
    });
  }

  function handleAdditionalMemberChange(clientId, field, value) {
    setHouseholdSetupDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        additionalMembers: (current.additionalMembers || []).map((member) => {
          if (member.clientId !== clientId) {
            return member;
          }

          if (field === "topTeethCount" || field === "bottomTeethCount") {
            return {
              ...member,
              [field]: normalizeTeethDraftValue(value, member[field])
            };
          }

          return {
            ...member,
            [field]: value
          };
        })
      };
    });
  }

  async function handleDismissHouseholdSetup() {
    setHouseholdOnboardingUiState({ dismissedAt: new Date().toISOString() });
    await setHouseholdOnboardingUiDismissed(true);
  }

  async function handleReopenHouseholdSetup() {
    if (!householdSetupDraft && householdProfile?.householdId) {
      setHouseholdSetupDraft(
        buildHouseholdSetupDraft({
          household: householdProfile,
          activeUser: activeHouseholdUser,
          onboardingDraft: null,
          userDefaults: {
            values,
            filters: songFilters,
            keyword,
            brushingHand,
            brushType,
            brushDurationSeconds
          },
          migrationState: persistedMigrationState
        })
      );
    }

    setHouseholdOnboardingUiState({ dismissedAt: null });
    await setHouseholdOnboardingUiDismissed(false);
    setWorkflowStep("teeth");
  }

  async function handleCompleteHouseholdSetup(event) {
    event.preventDefault();

    if (!householdProfile?.householdId || !householdSetupDraft) {
      return;
    }

    setHouseholdSetupSaving(true);

    try {
      const result = await completeHouseholdOnboarding({
        household: householdProfile,
        activeUser: activeHouseholdUser,
        draft: householdSetupDraft,
        migrationState: persistedMigrationState
      });

      setHouseholdProfile(result.household);
      setActiveHouseholdUser(result.user);
      setHouseholdOnboardingState({
        completedAt: new Date().toISOString(),
        householdId: result.household.householdId,
        userId: result.user.userId,
        reviewSource: householdSetupDraft.reviewSource
      });
      setHouseholdOnboardingUiState({ dismissedAt: null });
      setHouseholdSetupDraft(null);
      applySavedSession(result.defaults);
      saveStoredPreferences(result.defaults);
      trackEvent("phase2_household_setup_completed", {
        review_source: householdSetupDraft.reviewSource,
        migration_review: householdSetupDraft.reviewSource === "migration-review"
      });
    } catch (setupError) {
      setError(setupError?.message || t("app.householdSetup.saveFailed"));
    } finally {
      setHouseholdSetupSaving(false);
    }
  }

  async function handlePreferredLanguageChange(nextLanguage) {
    const nextFallbackInfo = await setPreferredSupportedLanguage(nextLanguage);
    setLanguageFallbackState(nextFallbackInfo);
  }

  async function handleRepeatLastSession() {
    if (!lastSession?.song) {
      return;
    }

    setAutoRestoredBrushView(false);
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

  async function handleQueueStoredSong(song, source = "favorites") {
    if (!song?.title || !song?.artist) {
      return;
    }

    setAppView("brush");
    setWorkflowStep("music");
    await handleSelectSong(song, source);
    trackEvent("stored_song_queued", {
      source,
      title: song.title,
      artist: song.artist
    });
  }

  function handleToggleFavoriteSong(song) {
    if (storageConsent !== "granted") {
      return;
    }

    const key = `${(song?.title || "").trim().toLowerCase()}::${(song?.artist || "").trim().toLowerCase()}`;
    const exists = favoriteSongs.some((item) => `${(item?.title || "").trim().toLowerCase()}::${(item?.artist || "").trim().toLowerCase()}` === key);

    if (exists) {
      removeFavoriteSong(song);
      setFavoriteSongs((current) => current.filter((item) => `${(item?.title || "").trim().toLowerCase()}::${(item?.artist || "").trim().toLowerCase()}` !== key));
      return;
    }

    addFavoriteSong(song);
    setFavoriteSongs((current) => [{ ...song, savedAt: Date.now() }, ...current.filter((item) => `${(item?.title || "").trim().toLowerCase()}::${(item?.artist || "").trim().toLowerCase()}` !== key)].slice(0, 25));
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

  function beginBrushingCountdown() {
    const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    const startDelayMs = START_DELAY_SECONDS * 1000;
    countdownDeadlineRef.current = Date.now() + startDelayMs;
    setCountdownRemainingMs(startDelayMs);
    setTimer({ running: false, remaining: totalSeconds });
    setBrushingPhase("countdown");
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

    if (autoRestoredBrushView && workflowStep === "brush") {
      return () => {
        cancelled = true;
      };
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
  }, [autoRestoredBrushView, brushDurationSeconds, values, workflowStep]);

  useEffect(() => {
    if (timer.running || brushingPhase === "paused" || brushingPhase === "complete") {
      return;
    }

    const nextSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    setTimer((prev) => {
      if (prev.remaining === nextSeconds && prev.running === false) {
        return prev;
      }

      return { running: false, remaining: nextSeconds };
    });
  }, [bpmData?.totalBrushingSeconds, brushDurationSeconds, brushingPhase, timer.running]);

  useEffect(() => {
    if (brushingPhase !== "countdown") {
      return;
    }

    if (countdownRemainingMs <= 0) {
      const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
      countdownDeadlineRef.current = null;
      setCountdownRemainingMs(0);
      setTimer({ running: true, remaining: totalSeconds });
      setBrushingPhase("running");
      lastPlaybackTickRef.current = playbackSecondsRef.current;
      if (playOnCountdownEndRef.current) {
        playOnCountdownEndRef.current = false;
        issuePlayerCommand("play");
      }
      return;
    }

    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, (countdownDeadlineRef.current || 0) - Date.now());
      setCountdownRemainingMs((previous) => (Math.abs(previous - remaining) < 20 ? previous : remaining));
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [bpmData?.totalBrushingSeconds, brushDurationSeconds, brushingPhase, countdownRemainingMs]);

  useEffect(() => {
    if (!bpmData?.searchBpm || (workflowStep !== "music" && brushingPhase !== "running")) {
      return;
    }

    let cancelled = false;

    async function loadSongs() {
      try {
        setLoading((prev) => ({ ...prev, songs: true }));
        const userMusicContext = buildUserMusicContext({
          countryCode: geoCountry?.countryCode,
          targetBpm: Number(bpmData.searchBpm || 120),
          toothCount: totalTeeth,
          genreHint: keyword
        });
        const result = await getSongs({
          bpm: bpmData.searchBpm,
          tolerance: songFilters.tolerance,
          danceability: songFilters.danceability,
          acousticness: songFilters.acousticness,
          totalTeeth,
          keyword,
          seed: songRefreshSeed,
          browserLanguage: userMusicContext.browserLanguage,
          countryCode: userMusicContext.countryCode,
          genreHint: userMusicContext.genreHint
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
          setSongsDebugInfo((previous) => ({
            ...(previous || {}),
            source: result.source,
            queryUsed: result.queryUsed,
            contextUsed: result.contextUsed,
            geoSource: result.geoSource,
            fetchedCount: fetchedSongs.length,
            shownCount: unseenSongs.length
          }));
          setIsSongPoolExhausted(fetchedSongs.length > 0 && unseenSongs.length === 0);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setSongs([]);
          setSongsDebugInfo(null);
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
  }, [bpmData?.searchBpm, brushingPhase, geoCountry?.countryCode, keyword, songFilters, songRefreshSeed, totalTeeth, workflowStep]);

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
    }
  }, [timer.running, brushingPhase, brushingMusicElapsedSeconds, bpmData?.totalBrushingSeconds, brushDurationSeconds]);

  function issuePlayerCommand(type) {
    setPlayerCommand((previous) => ({ type, nonce: previous.nonce + 1 }));
  }

  function handlePlaybackTick(seconds) {
    setPlaybackSeconds(seconds);

    if (brushingPhase === "awaitingPlayback" && seconds > 0) {
      beginBrushingCountdown();
      lastPlaybackTickRef.current = seconds;
      return;
    }

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

  function handlePlaybackDurationChange(duration) {
    setSongDurationSeconds(Number(duration) || 0);
  }

  async function handleSelectSong(song, source = "generated") {
    trackEvent("song_selected", { title: song.title, artist: song.artist, source });
    setAutoRestoredBrushView(false);
    setWorkflowStep("music");
    setQueuedStoredSongKey(source === "favorites" || source === "lastSession" ? toSongKey(song) : "");
    setSongsDebugInfo((previous) => ({
      ...(previous || {}),
      selectionSource: source,
      selectedTitle: song.title,
      selectedArtist: song.artist,
      youtubeQueryMode: "direct-title-artist"
    }));
    queuedSongRef.current = null;
    setQueuedSongPreview(null);
    if (storageConsent === "granted") {
      addFavoriteSong(song);
      setFavoriteSongs((current) => [{ ...song, savedAt: Date.now() }, ...current.filter((item) => toSongKey(item) !== toSongKey(song))].slice(0, 25));
    }
    return handleSelectSongWithOptions(song, { autoplay: false, source });
  }

  async function handleSelectSongWithOptions(song, options = { autoplay: false, source: "generated" }) {
    const lookupId = latestVideoLookupRef.current + 1;
    latestVideoLookupRef.current = lookupId;
    setSelectedSong(song);
    setSongDurationSeconds(0);
    // Keep old playerData visible while loading new video
    if (!loading.player) {
      setLoading((prev) => ({ ...prev, player: true }));
    }

    try {
      const video = await getYoutubeVideo({
        title: song.title,
        artist: song.artist
      });

      if (lookupId !== latestVideoLookupRef.current) {
        return null;
      }

      setPlayerData(video);
      setSongsDebugInfo((previous) => ({
        ...(previous || {}),
        selectionSource: options.source || previous?.selectionSource || "generated",
        selectedTitle: song.title,
        selectedArtist: song.artist,
        youtubeMatchedTitle: video?.title || null,
        youtubeMatchedChannel: video?.channelTitle || null,
        youtubeQueryMode: "direct-title-artist"
      }));

      if (options.autoplay && video?.embedUrl) {
        setAutoplayToken((prev) => prev + 1);
      }

      setError("");
      return video;
    } catch (err) {
      if (lookupId !== latestVideoLookupRef.current) {
        return null;
      }
      setError(err.message);
      setPlayerData(null);
      return null;
    } finally {
      if (lookupId === latestVideoLookupRef.current) {
        setLoading((prev) => ({ ...prev, player: false }));
      }
    }
  }

  function startBrushing(options = {}) {
    if ((bpmData?.totalTeeth || 0) <= 0) {
      setError(t("brushing.errors.needsTeeth"));
      return;
    }

    if (!playerData?.embedUrl) {
      setError(t("brushing.errors.needsPlayback"));
      return;
    }

    const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    const shouldResume = Boolean(options.resumeFromPause);
    const shouldRestartVideo = Boolean(options.restartVideo);
    const hasPendingCountdown = countdownRemainingMs > 0;

    if (shouldResume) {
      if (hasPendingCountdown) {
        countdownDeadlineRef.current = Date.now() + countdownRemainingMs;
        setBrushingPhase("countdown");
      } else {
        lastPlaybackTickRef.current = playbackSeconds;
        setTimer((previous) => ({ ...previous, running: true }));
        setBrushingPhase("running");
      }
    } else {
      setBrushingMusicElapsedSeconds(0);
      setPlaybackSeconds(shouldRestartVideo ? 0 : playbackSeconds);
      lastPlaybackTickRef.current = shouldRestartVideo ? 0 : playbackSeconds;
      setTimer({ running: false, remaining: totalSeconds });

      if ((shouldRestartVideo ? 0 : playbackSeconds) > 0) {
        beginBrushingCountdown();
      } else {
        setBrushingPhase("awaitingPlayback");
      }
    }

    if (shouldResume) {
      if (!hasPendingCountdown || !playOnCountdownEndRef.current) {
        issuePlayerCommand("play");
      }
    } else if (shouldRestartVideo) {
      playOnCountdownEndRef.current = false;
      issuePlayerCommand("restart");
    } else {
      playOnCountdownEndRef.current = false;
      issuePlayerCommand("play");
    }

    if (shouldResume) {
      trackEvent("brushing_resumed", { song_title: selectedSong?.title, song_artist: selectedSong?.artist, remaining_seconds: timer.remaining });
      setError("");
      return;
    }

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
        brushType,
        brushDurationSeconds,
        savedAt: Date.now()
      };

      saveStoredPreferences({
        values,
        filters: songFilters,
        keyword,
        brushingHand,
        brushType,
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
    if (brushingPhase !== "running" && brushingPhase !== "countdown" && brushingPhase !== "awaitingPlayback") {
      return;
    }

    setTimer((previous) => ({ ...previous, running: false }));
    setBrushingPhase("paused");
    lastPlaybackTickRef.current = playbackSeconds;
    if (brushingPhase === "countdown" && countdownDeadlineRef.current) {
      setCountdownRemainingMs(Math.max(0, countdownDeadlineRef.current - Date.now()));
      countdownDeadlineRef.current = null;
    }
    issuePlayerCommand("pause");
  }

  function restartBrushing() {
    const totalSeconds = Number(bpmData?.totalBrushingSeconds || brushDurationSeconds);
    const remainingSongSeconds = songDurationSeconds > 0 ? Math.max(0, songDurationSeconds - playbackSeconds) : null;
    const needsSongRestart = typeof remainingSongSeconds === "number" && remainingSongSeconds < totalSeconds + START_DELAY_SECONDS;
    const confirmMessage = needsSongRestart
      ? t("brushing.resetConfirmRestartSuggested", {
          remaining: formatTime(Math.floor(remainingSongSeconds))
        })
      : t("brushing.resetConfirm");
    const resetBrushOnly = typeof window === "undefined" ? true : window.confirm(confirmMessage);

    if (!resetBrushOnly) {
      issuePlayerCommand("reset");
      setPlaybackSeconds(0);
      lastPlaybackTickRef.current = 0;
    } else if (needsSongRestart) {
      setError(t("brushing.errors.songMayEndEarly", {
        remaining: formatTime(Math.floor(remainingSongSeconds))
      }));
    }

    setBrushingMusicElapsedSeconds(0);
    setCountdownRemainingMs(0);
    countdownDeadlineRef.current = null;
    playOnCountdownEndRef.current = false;
    setTimer({ running: false, remaining: totalSeconds });
    setBrushingPhase("idle");
    queuedSongRef.current = null;
    setQueuedSongPreview(null);
    trackEvent("brushing_reset", { song_title: selectedSong?.title, song_artist: selectedSong?.artist, duration_seconds: totalSeconds });
    if (!needsSongRestart || !resetBrushOnly) {
      setError("");
    }
  }

  function handlePrimaryBrushAction() {
    if (brushingPhase === "running" || brushingPhase === "awaitingPlayback") {
      pauseBrushing();
      return;
    }

    if (brushingPhase === "paused") {
      startBrushing({ resumeFromPause: true });
      return;
    }

    startBrushing({ restartVideo: brushingPhase === "complete" });
  }

  function goToMusicStep() {
    setAutoRestoredBrushView(false);
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
    if (brushingPhase !== "running" && brushingPhase !== "countdown") {
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

    if (brushingPhase === "awaitingPlayback") {
      return t("app.status.awaitingPlayback");
    }

    if (brushingPhase === "paused") {
      return t("app.status.paused");
    }

    if (brushingPhase === "countdown") {
      return t("app.status.countdown");
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
    brushingPhase === "running" || brushingPhase === "countdown" || brushingPhase === "awaitingPlayback"
      ? t("brushing.pause")
      : brushingPhase === "paused"
        ? t("brushing.resume")
        : brushingPhase === "complete"
          ? t("brushing.again", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) })
          : t("brushing.start", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) });

  const showTopConsentNotices = workflowStep === "teeth";
  const requiresHouseholdSetup =
    appView === "brush" &&
    storageConsent === "granted" &&
    dbStatus.ready &&
    householdProfile?.householdId &&
    householdSetupDraft &&
    !householdOnboardingUiState?.dismissedAt &&
    !householdOnboardingState?.completedAt;

  return (
    <main className={`app-shell ${device.isMobile ? "mobile-shell" : "desktop-shell"}${appView === "workshop" && !device.isMobile ? " workshop-shell" : ""}`}>
      {!(appView === "workshop" && !device.isMobile) && (
      <header className="app-header">
        <p className="eyebrow">
          <span>{t("app.eyebrow")}</span>
          {import.meta.env.VITE_GIT_SHA && (
            <span className="top-commit-id" aria-label="Build commit id">#{import.meta.env.VITE_GIT_SHA.substring(0, 7)}</span>
          )}
        </p>
        <h1>{device.isMobile ? t("app.title.mobile") : t("app.title.desktop")}</h1>
        <p>{subtitle}</p>
        <p className={`state-chip ${brushingPhase}`}>{t("app.status.label", { state: phaseLabel })}</p>
        <p className={`mode-chip ${device.mode}`}>{device.isMobile ? t("common.layouts.mobile") : t("common.layouts.desktop")}</p>
        <p className="geo-debug-chip" aria-live="polite">
          {t("app.geoDebug", {
            country: geoCountry?.country || "Unknown",
            countryCode: geoCountry?.countryCode || "--",
            ip: geoCountry?.ip || "unknown",
            source: geoCountry?.source || "pending"
          })}
        </p>
        {!device.isMobile && (
          <div className="header-utility-row">
            <button
              type="button"
              className="header-utility-btn"
              onClick={() => setAppView((current) => (current === "workshop" || current === "history" ? "brush" : "workshop"))}
            >
              {appView === "workshop" || appView === "history" ? "Return to brushing flow" : "Open translation workshop"}
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
      ) : appView === "history" ? (
        <VersionHistory onExit={() => setAppView("brush")} />
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

      <section className={`care-routine-strip${showCompactRoutine ? " compact" : ""}`} aria-label={t("app.routine.ariaLabel")}>
        <div className="care-routine-header">
          <strong>{t("app.routine.title")}</strong>
          {isReturningVisitor && (
            <button
              type="button"
              className="care-routine-toggle"
              onClick={() => setIsRoutineExpanded((current) => !current)}
            >
              {isRoutineExpanded ? t("app.routine.collapse") : t("app.routine.expand")}
            </button>
          )}
        </div>
        {showCompactRoutine ? (
          <div className="care-routine-compact-layout">
            <article className="care-routine-card active compact-primary">
              <span className="care-routine-badge">{t("app.routine.available")}</span>
              <strong>{t("app.routine.brushing.title")}</strong>
              <p>{t("app.routine.brushing.description")}</p>
            </article>
            <div className="care-routine-mini-list" aria-label={t("app.routine.ariaLabel")}>
              <button
                type="button"
                className={`care-routine-mini-pill${expandedRoutineCard === "flossing" ? " active" : ""}`}
                onClick={() => setExpandedRoutineCard((c) => (c === "flossing" ? null : "flossing"))}
              >
                {t("app.routine.flossing.title")}
              </button>
              <button
                type="button"
                className={`care-routine-mini-pill${expandedRoutineCard === "waterPicking" ? " active" : ""}`}
                onClick={() => setExpandedRoutineCard((c) => (c === "waterPicking" ? null : "waterPicking"))}
              >
                {t("app.routine.waterPicking.title")}
              </button>
            </div>
            {expandedRoutineCard === "flossing" && (
              <article className="care-routine-card best-practice care-routine-expanded">
                <span className="care-routine-badge">{t("app.routine.bestPractice")}</span>
                <strong>{t("app.routine.flossing.title")}</strong>
                <p>{t("app.routine.flossing.description")}</p>
              </article>
            )}
            {expandedRoutineCard === "waterPicking" && (
              <article className="care-routine-card best-practice care-routine-expanded">
                <span className="care-routine-badge">{t("app.routine.bestPractice")}</span>
                <strong>{t("app.routine.waterPicking.title")}</strong>
                <p>{t("app.routine.waterPicking.description")}</p>
              </article>
            )}
          </div>
        ) : (
          <div className="care-routine-grid">
            <article className="care-routine-card active">
              <span className="care-routine-badge">{t("app.routine.available")}</span>
              <strong>{t("app.routine.brushing.title")}</strong>
              <p>{t("app.routine.brushing.description")}</p>
            </article>
            <article className="care-routine-card best-practice">
              <span className="care-routine-badge">{t("app.routine.bestPractice")}</span>
              <strong>{t("app.routine.flossing.title")}</strong>
              <p>{t("app.routine.flossing.description")}</p>
            </article>
            <article className="care-routine-card best-practice">
              <span className="care-routine-badge">{t("app.routine.bestPractice")}</span>
              <strong>{t("app.routine.waterPicking.title")}</strong>
              <p>{t("app.routine.waterPicking.description")}</p>
            </article>
          </div>
        )}
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

      {migrationNotice?.kind === "imported-legacy-storage" && !error && <p className="info-banner">{t("app.migration.importedLegacyStorage")}</p>}
      {migrationNotice?.kind === "bootstrapped-household" && !error && <p className="info-banner">{t("app.migration.bootstrappedHousehold")}</p>}
      {migrationNotice?.kind === "migration-failed" && !error && <p className="error-banner">{t("app.migration.failedLegacyStorage")}</p>}

      {backendStatus && !error && <p className="info-banner">{backendStatus}</p>}
      {error && <p className="error-banner">{error}</p>}

      {requiresHouseholdSetup && (
        <HouseholdSetupPanel
          t={t}
          draft={householdSetupDraft}
          saving={householdSetupSaving}
          requiresMigrationReview={householdSetupDraft.reviewSource === "migration-review"}
          onDraftChange={handleHouseholdSetupDraftChange}
          onAdditionalMemberChange={handleAdditionalMemberChange}
          onAddMember={handleAddHouseholdMember}
          onRemoveMember={handleRemoveHouseholdMember}
          onDismiss={handleDismissHouseholdSetup}
          onSubmit={handleCompleteHouseholdSetup}
        />
      )}

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
          {storageConsent === "granted" && (lastSession?.song || favoriteSongs.length > 0) && (
            <section className="stored-picks-panel" aria-live="polite">
              <strong>{t("music.favorites.title")}</strong>
              {lastSession?.song && (
                <div className="stored-pick-row">
                  <span>{t("music.favorites.lastSession", { title: lastSession.song.title, artist: lastSession.song.artist })}</span>
                  <button
                    type="button"
                    className={`action-btn secondary${queuedStoredSongKey === toSongKey(lastSession.song) ? " is-queued" : ""}`}
                    onClick={() => handleQueueStoredSong(lastSession.song, "lastSession")}
                  >
                    {queuedStoredSongKey === toSongKey(lastSession.song) ? t("common.buttons.queued") : t("common.buttons.queue")}
                  </button>
                </div>
              )}
              {favoriteSongs.slice(0, 8).map((song) => (
                <div key={`${song.title}-${song.artist}`} className="stored-pick-row">
                  <span>{song.title} - {song.artist}</span>
                  <div className="stored-pick-actions">
                    <button
                      type="button"
                      className={`action-btn secondary${queuedStoredSongKey === toSongKey(song) ? " is-queued" : ""}`}
                      onClick={() => handleQueueStoredSong(song, "favorites")}
                    >
                      {queuedStoredSongKey === toSongKey(song) ? t("common.buttons.queued") : t("common.buttons.queue")}
                    </button>
                    <button type="button" className="action-btn secondary" onClick={() => handleToggleFavoriteSong(song)}>{t("music.favorites.remove")}</button>
                  </div>
                </div>
              ))}
            </section>
          )}
          {songsDebugInfo?.queryUsed && (
            <section className="music-debug-chip" aria-live="polite">
              <strong>GetSongBPM + selection debug</strong>
              <p>
                selected={songsDebugInfo.selectedTitle || selectedSong?.title || "--"} | artist={songsDebugInfo.selectedArtist || selectedSong?.artist || "--"} | source={songsDebugInfo.selectionSource || "generated"}
              </p>
              <p>
                youtube match={songsDebugInfo.youtubeMatchedTitle || playerData?.title || "--"} | channel={songsDebugInfo.youtubeMatchedChannel || playerData?.channelTitle || "--"} | mode={songsDebugInfo.youtubeQueryMode || "direct-title-artist"}
              </p>
              <p>
                source={songsDebugInfo.source || "unknown"} | geo={songsDebugInfo.geoSource || "unknown"} | country={songsDebugInfo.contextUsed?.countryCode || "--"} | lang={songsDebugInfo.contextUsed?.browserLanguage || "--"} | age={songsDebugInfo.contextUsed?.ageBucket || "--"}
              </p>
              <p>
                q={songsDebugInfo.queryUsed}
              </p>
              <p>
                songs fetched={songsDebugInfo.fetchedCount ?? 0}, shown={songsDebugInfo.shownCount ?? 0}
              </p>
            </section>
          )}
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
            favorites={favoriteSongs}
            onToggleFavorite={handleToggleFavoriteSong}
          />
        </section>
      )}

      {workflowStep === "brush" && (
        <section className={`layout-grid ${device.isMobile ? "mobile-mode" : "desktop-mode desktop-brush-layout"}`}>
          <section className={`card brush-actions-card ${device.isMobile ? "" : "desktop-step-card"}`.trim()}>
            <h2>{t("brushing.controlsTitle")}</h2>
            <p>{t("brushing.controlsIntro")}</p>
            <div className="brush-type-picker" role="group" aria-label={t("brushing.brushType")}>
              <span className="profile-summary-label">{t("brushing.brushType")}</span>
              <div className="brush-hand-actions">
                <button
                  type="button"
                  className={`brush-hand-btn${brushType === "manual" ? " active" : ""}`}
                  onClick={() => setBrushType("manual")}
                >
                  {t("brushing.brushTypeManual")}
                </button>
                <button
                  type="button"
                  className={`brush-hand-btn${brushType === "electric" ? " active" : ""}`}
                  onClick={() => setBrushType("electric")}
                >
                  {t("brushing.brushTypeElectric")}
                </button>
              </div>
            </div>
            {selectedSong && (
              <>
                <p className="brush-selected-song">{t("brushing.selectedSong", { title: selectedSong.title, artist: selectedSong.artist })}</p>
                {queuedSongPreview && brushingPhase === "running" && (
                  <p className="brush-next-song">{t("brushing.upNext", { title: queuedSongPreview.title, artist: queuedSongPreview.artist })}</p>
                )}
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
                disabled={brushingPhase === "running" || brushingPhase === "countdown" || brushingPhase === "paused"}
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
                {brushingPhase === "complete" && (
                  <section className="success-banner brush-success-banner" aria-live="polite">
                    <span className="sparkle-stars" aria-hidden="true">✦ ✧ ✦</span>
                    <p>{completionMessage || t("app.success", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) })}</p>
                    <small>{t("app.successAgeGroups", { count: ageGroupCount })}</small>
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
            compactMobileFrame={device.isMobile && workflowStep === "brush"}
            showRestoredSessionBadge={device.isMobile && autoRestoredBrushView}
            autoplayToken={autoplayToken}
            playbackCommand={playerCommand}
            onPlaybackTick={handlePlaybackTick}
            onPlaybackDurationChange={handlePlaybackDurationChange}
            onSongEnded={handleSongEnded}
          >
            {device.isMobile && (
              <>
              {!hideRestoredReadyCue && brushControlCue?.kind !== "complete" && (
                <div className={`brush-cue-card${brushControlCue?.kind ? ` ${brushControlCue.kind}` : ""}`} aria-live="polite">
                  <strong>{brushControlCue?.title || t("brushing.readyTitle")}</strong>
                  {(brushControlCue?.detail || !brushControlCue)
                    ? <span>{brushControlCue?.detail || t("brushing.readyDetail", { hand: t(`common.hands.${brushingHand}`) })}</span>
                    : null}
                </div>
              )}
              <div className="session-actions compact-mobile-actions">
                <button
                  type="button"
                  className="action-btn"
                  onClick={handlePrimaryBrushAction}
                >
                  {primaryBrushActionLabel}
                </button>
                <button type="button" className="action-btn secondary" onClick={restartBrushing}>
                  {t("brushing.stop")}
                </button>
              </div>
              {brushingPhase === "complete" && (
                <section className="success-banner brush-success-banner" aria-live="polite">
                  <span className="sparkle-stars" aria-hidden="true">✦ ✧ ✦</span>
                  <p>{completionMessage || t("app.success", { duration: formatTime(Number(bpmData?.totalBrushingSeconds || brushDurationSeconds)) })}</p>
                  <small>{t("app.successAgeGroups", { count: ageGroupCount })}</small>
                </section>
              )}
              </>
            )}
          </Player>

          <BrushingGuide
            bpmData={bpmData}
            timer={timer}
            brushingPhase={brushingPhase}
            values={values}
            selectedBpm={selectedBrushBpm}
            isMobile={device.isMobile}
            playbackSeconds={playbackSeconds}
            brushingMusicElapsedSeconds={brushingMusicElapsedSeconds}
            startCountdownTotalMs={START_DELAY_SECONDS * 1000}
            startCountdownRemainingMs={countdownRemainingMs}
            brushingHand={brushingHand}
            brushType={brushType}
            hideIntro={device.isMobile && autoRestoredBrushView}
            onCueChange={setBrushControlCue}
            completionMessage={completionMessage}
            brushControlCue={brushControlCue}
            primaryBrushActionLabel={primaryBrushActionLabel}
            onPrimaryBrushAction={handlePrimaryBrushAction}
            onRestartBrushing={restartBrushing}
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
          {storageConsent === "granted" && dbStatus.ready && householdProfile?.householdId && !householdOnboardingState?.completedAt && (
            <button type="button" className="privacy-toggle" onClick={handleReopenHouseholdSetup}>
              {t("common.buttons.householdSetup")}
            </button>
          )}
          <button type="button" className="privacy-toggle" onClick={openStorageInfoModal}>
            {t("common.buttons.storageNotice")}
          </button>
          <button type="button" className="privacy-toggle" onClick={() => setAppView("history")}>
            {t("common.buttons.versionHistory")}
          </button>
        </div>
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
