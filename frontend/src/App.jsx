import { useEffect, useMemo, useRef, useState } from "react";
import BPMCalculator from "./components/BPMCalculator";
import SongList from "./components/SongList";
import Player from "./components/Player";
import BrushingGuide from "./components/BrushingGuide";
import { getBpm, getSongs, getYoutubeVideo } from "./api/client";
import {
  analyticsEnabled,
  getAnalyticsConsentStatus,
  initializeAnalytics,
  setAnalyticsConsent,
  trackEvent
} from "./lib/analytics";
import {
  clearLastBrushedSong,
  getStorageConsentStatus,
  isStorageBannerDismissed,
  loadLastBrushedSong,
  saveLastBrushedSong,
  setStorageBannerDismissed,
  setStorageConsent
} from "./lib/storagePreference";
import { useDeviceContext } from "./lib/deviceContext";
import "./App.css";

function App() {
  const [values, setValues] = useState({ top: 16, bottom: 16 });
  const [bpmData, setBpmData] = useState(null);
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [tolerance, setTolerance] = useState(5);
  const [keyword, setKeyword] = useState("");
  const [songRefreshSeed, setSongRefreshSeed] = useState(0);
  const [timer, setTimer] = useState({ running: false, remaining: 120 });
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
  const [lastBrushedSong, setLastBrushedSong] = useState(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const seenSongsByQueryRef = useRef(new Map());
  const lastPlaybackTickRef = useRef(null);
  const analyticsAvailable = useMemo(() => analyticsEnabled(), []);
  const device = useDeviceContext();

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
      setLastBrushedSong(loadLastBrushedSong());
      return;
    }

    if (storageConsent === "denied") {
      clearLastBrushedSong();
    }

    setLastBrushedSong(null);
  }, [storageConsent]);

  function handleAllowStorage() {
    const nextStatus = setStorageConsent(true);
    setStorageConsentState(nextStatus);
    setStorageBannerDismissed(false);
    setStorageBannerDismissedState(false);
  }

  function handleDeclineStorage() {
    const nextStatus = setStorageConsent(false);
    setStorageConsentState(nextStatus);
    clearLastBrushedSong();
    setLastBrushedSong(null);
  }

  function handleDismissStorageBanner() {
    setStorageBannerDismissed(true);
    setStorageBannerDismissedState(true);
  }

  function handleShowStorageBanner() {
    setStorageBannerDismissed(false);
    setStorageBannerDismissedState(false);
  }

  async function handlePlayLastBrushedSong() {
    if (!lastBrushedSong) {
      return;
    }

    await handleSelectSong(lastBrushedSong);
    trackEvent("last_brushed_song_replayed", {
      title: lastBrushedSong.title,
      artist: lastBrushedSong.artist
    });
  }

  function openPrivacyModal() {
    setShowPrivacyModal(true);
  }

  function closePrivacyModal() {
    setShowPrivacyModal(false);
  }

  function toSongKey(song) {
    return `${(song?.title || "").trim().toLowerCase()}::${(song?.artist || "").trim().toLowerCase()}`;
  }

  useEffect(() => {
    if (!loading.bpm && !loading.songs && !loading.player) {
      setBackendStatus("");
      return;
    }

    const infoTimer = window.setTimeout(() => {
      setBackendStatus("Waking up the free backend. The first request can take 10-30 seconds, so please hang on.");
    }, 1800);

    const detailTimer = window.setTimeout(() => {
      setBackendStatus("Still connecting to the free backend. Your request is still in progress and should finish once the service wakes up.");
    }, 7000);

    return () => {
      window.clearTimeout(infoTimer);
      window.clearTimeout(detailTimer);
    };
  }, [loading.bpm, loading.songs, loading.player]);

  useEffect(() => {
    let cancelled = false;

    async function loadBpm() {
      try {
        setLoading((prev) => ({ ...prev, bpm: true }));
        const data = await getBpm(values);

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
  }, [values]);

  useEffect(() => {
    if (!bpmData?.searchBpm) {
      return;
    }

    let cancelled = false;

    async function loadSongs() {
      try {
        setLoading((prev) => ({ ...prev, songs: true }));
        const result = await getSongs({ bpm: bpmData.searchBpm, tolerance, keyword, seed: songRefreshSeed });
        const queryKey = `${Math.round(bpmData.searchBpm)}:${tolerance}:${keyword.trim().toLowerCase()}`;
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
  }, [bpmData?.searchBpm, tolerance, keyword, songRefreshSeed]);

  useEffect(() => {
    if (!timer.running || brushingPhase !== "running") {
      return;
    }

    const remaining = Math.max(0, 120 - Math.floor(brushingMusicElapsedSeconds));

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
  }, [timer.running, brushingPhase, brushingMusicElapsedSeconds]);

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

  function startBrushing() {
    if (!playerData?.embedUrl) {
      setError("Start playback first, then press Start Brushing to begin only the brush timer and guide.");
      return;
    }

    const totalSeconds = 120; // 4 sections × 30 seconds (ADA recommended brushing time)
    setBrushingMusicElapsedSeconds(0);
    lastPlaybackTickRef.current = playbackSeconds;
    setTimer({ running: true, remaining: totalSeconds });
    setBrushingPhase("running");

    if (storageConsent === "granted" && selectedSong?.title && selectedSong?.artist) {
      saveLastBrushedSong(selectedSong);
      setLastBrushedSong({
        title: selectedSong.title,
        artist: selectedSong.artist,
        bpm: selectedSong.bpm,
        savedAt: Date.now()
      });
    }

    trackEvent("brushing_started", { song_title: selectedSong?.title, song_artist: selectedSong?.artist });
    setError("");
  }

  function restartBrushing() {
    const totalSeconds = 120;
    setBrushingMusicElapsedSeconds(0);
    lastPlaybackTickRef.current = playbackSeconds;
    setTimer({ running: false, remaining: totalSeconds });
    setBrushingPhase("idle");
    trackEvent("brushing_reset", { song_title: selectedSong?.title, song_artist: selectedSong?.artist });
    setError("");
  }

  function updateValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function regenerateSongs() {
    setSongRefreshSeed((prev) => prev + 1);
  }

  async function handleSongEnded() {
    if (!songs.length || brushingPhase !== "running") {
      return;
    }

    const pool = songs.filter((song) => song.title !== selectedSong?.title || song.artist !== selectedSong?.artist);
    const candidates = pool.length > 0 ? pool : songs;
    const nextSong = candidates[Math.floor(Math.random() * candidates.length)];

    if (nextSong) {
      trackEvent("song_auto_queued", { title: nextSong.title, artist: nextSong.artist });
      await handleSelectSongWithOptions(nextSong, { autoplay: true });
    }
  }

  const subtitle = useMemo(() => {
    if (!bpmData) {
      return "Matching your brushing rhythm to music you can actually enjoy.";
    }

    return `Target songs around ${Math.round(bpmData.searchBpm)} BPM (+/- ${tolerance}).`;
  }, [bpmData, tolerance]);

  const phaseLabel = useMemo(() => {
    if (brushingPhase === "running") {
      return "Brushing in progress";
    }

    if (brushingPhase === "complete") {
      return "Session complete";
    }

    return "Idle";
  }, [brushingPhase]);

  return (
    <main className={`app-shell ${device.isMobile ? "mobile-shell" : "desktop-shell"}`}>
      <header className="app-header">
        <p className="eyebrow">BrushBeats</p>
        <h1>{device.isMobile ? "Brush Anywhere. Stay On Tempo." : "Two-minute brushing. Perfect tempo. Better vibes."}</h1>
        <p>{subtitle}</p>
        <p className={`state-chip ${brushingPhase}`}>Status: {phaseLabel}</p>
        <p className={`mode-chip ${device.mode}`}>{device.isMobile ? "Mobile Layout" : "Desktop Layout"}</p>
      </header>

      {analyticsAvailable && analyticsConsent === "unknown" && (
        <section className="consent-banner" role="region" aria-label="Privacy controls">
          <p>
            Help improve BrushBeats by sharing anonymous usage analytics. We never send typed text or personal data.
            <button type="button" className="privacy-link" onClick={openPrivacyModal}>
              Privacy Policy
            </button>
          </p>
          <div className="consent-actions">
            <button type="button" className="action-btn" onClick={handleAcceptAnalytics}>
              Allow Analytics
            </button>
            <button type="button" className="action-btn secondary" onClick={handleDeclineAnalytics}>
              Decline
            </button>
          </div>
        </section>
      )}

      {!storageBannerDismissed && (
        <section className="storage-banner" role="region" aria-label="Storage consent controls">
          <p>
            BrushBeats can store your last brushed song in browser storage (cookies/localStorage) so you can replay it next
            session.
            <button type="button" className="privacy-link" onClick={openPrivacyModal}>
              Privacy Policy
            </button>
          </p>
          <div className="consent-actions">
            <button type="button" className="action-btn" onClick={handleAllowStorage}>
              Allow Storage
            </button>
            <button type="button" className="action-btn secondary" onClick={handleDeclineStorage}>
              Opt Out
            </button>
            <button type="button" className="action-btn secondary" onClick={handleDismissStorageBanner}>
              Dismiss
            </button>
          </div>
        </section>
      )}

      {lastBrushedSong && storageConsent === "granted" && (
        <section className="last-song-banner" aria-live="polite">
          <p>
            Last brushed song: <strong>{lastBrushedSong.title}</strong> by <strong>{lastBrushedSong.artist}</strong>
          </p>
          <button type="button" className="action-btn secondary" onClick={handlePlayLastBrushedSong}>
            Play Last Brushed Song
          </button>
        </section>
      )}

      {backendStatus && !error && <p className="info-banner">{backendStatus}</p>}
      {error && <p className="error-banner">{error}</p>}

      <section className={`layout-grid ${device.isMobile ? "mobile-mode" : "desktop-mode"}`}>
        <BPMCalculator
          values={values}
          onChange={updateValue}
          bpmData={bpmData}
          loading={loading.bpm}
          timer={timer}
          brushingPhase={brushingPhase}
          isMobile={device.isMobile}
          onStartTimer={startBrushing}
          onRestartTimer={restartBrushing}
        />

        <SongList
          songs={songs}
          exhausted={isSongPoolExhausted}
          loading={loading.songs}
          tolerance={tolerance}
          keyword={keyword}
          isMobile={device.isMobile}
          onToleranceChange={setTolerance}
          onKeywordChange={setKeyword}
          onSelectSong={handleSelectSong}
          onRegenerate={regenerateSongs}
        />

        <Player
          selectedSong={selectedSong}
          playerData={playerData}
          loading={loading.player}
          brushingPhase={brushingPhase}
          isMobile={device.isMobile}
          autoplayToken={autoplayToken}
          onPlaybackTick={handlePlaybackTick}
          onSongEnded={handleSongEnded}
        />

        <BrushingGuide
          timer={timer}
          brushingPhase={brushingPhase}
          values={values}
          selectedBpm={Number(selectedSong?.bpm || bpmData?.searchBpm || 120)}
          isMobile={device.isMobile}
          brushingMusicElapsedSeconds={brushingMusicElapsedSeconds}
        />
      </section>

      {brushingPhase === "complete" && (
        <section className="success-banner" aria-live="polite">
          Great work, your 2-minute clean is complete. Keep this habit daily for stronger teeth and healthier gums.
        </section>
      )}

      <footer className="credit-strip" id="credit">
        <p>
          Song tempo data powered by
          <a href="https://getsongbpm.com" target="_blank" rel="noreferrer">
            GetSongBPM
          </a>
        </p>
        {analyticsAvailable && (
          <div className="privacy-controls">
            <span>Analytics: {analyticsConsent === "granted" ? "On" : "Off"}</span>
            <button type="button" className="privacy-toggle" onClick={openPrivacyModal}>
              Privacy Policy
            </button>
            {analyticsConsent === "granted" ? (
              <button type="button" className="privacy-toggle" onClick={handleDeclineAnalytics}>
                Turn Off
              </button>
            ) : (
              <button type="button" className="privacy-toggle" onClick={handleAcceptAnalytics}>
                Turn On
              </button>
            )}
          </div>
        )}
        <div className="privacy-controls">
          <span>Song Storage: {storageConsent === "granted" ? "On" : "Off"}</span>
          {storageConsent === "granted" ? (
            <button type="button" className="privacy-toggle" onClick={handleDeclineStorage}>
              Turn Off
            </button>
          ) : (
            <button type="button" className="privacy-toggle" onClick={handleAllowStorage}>
              Turn On
            </button>
          )}
          <button type="button" className="privacy-toggle" onClick={handleShowStorageBanner}>
            Storage Notice
          </button>
        </div>
        {import.meta.env.VITE_GIT_SHA && (
          <p className="version-info">
            <code>v{import.meta.env.VITE_GIT_SHA.substring(0, 7)}</code>
          </p>
        )}
      </footer>

      {showPrivacyModal && (
        <div className="privacy-modal-overlay" role="presentation" onClick={closePrivacyModal}>
          <section
            className="privacy-modal"
            role="dialog"
            aria-modal="true"
            aria-label="BrushBeats privacy policy"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Privacy Policy</h2>
            <p>
              BrushBeats uses Google Analytics 4 only when you opt in. We collect anonymous usage events to improve the app,
              such as BPM calculations, song selections, brushing starts, resets, completions, and auto-queue transitions.
            </p>
            <p>
              We may also store your last brushed song in browser storage (cookies/localStorage) only when you allow storage.
              This lets you quickly replay that song on your next visit.
            </p>
            <p>
              We do not send typed form text, email addresses, names, passwords, or payment information. Ad-related storage is
              disabled unless required for core analytics consented by you.
            </p>
            <p>
              Your analytics choice is stored on this device and you can change it at any time using the Analytics controls in
              the footer.
            </p>
            <div className="privacy-modal-actions">
              <button type="button" className="action-btn secondary" onClick={closePrivacyModal}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
