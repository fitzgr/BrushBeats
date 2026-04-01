import { useEffect, useMemo, useRef, useState } from "react";
import BPMCalculator from "./components/BPMCalculator";
import SongList from "./components/SongList";
import Player from "./components/Player";
import BrushingGuide from "./components/BrushingGuide";
import { getBpm, getSongs, getYoutubeVideo } from "./api/client";
import "./App.css";

function App() {
  const [values, setValues] = useState({ top: 16, bottom: 16, sectionSeconds: 30 });
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
  const [brushingStartPlaybackSeconds, setBrushingStartPlaybackSeconds] = useState(0);
  const [autoplayToken, setAutoplayToken] = useState(0);
  const [isSongPoolExhausted, setIsSongPoolExhausted] = useState(false);
  const [loading, setLoading] = useState({ bpm: false, songs: false, player: false });
  const [backendStatus, setBackendStatus] = useState("");
  const [error, setError] = useState("");
  const seenSongsByQueryRef = useRef(new Map());

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

    const interval = window.setInterval(() => {
      setTimer((prev) => {
        if (prev.remaining <= 1) {
          window.clearInterval(interval);
          setBrushingPhase("complete");
          return { running: false, remaining: 0 };
        }

        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer.running, brushingPhase]);

  async function handleSelectSong(song) {
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
    setBrushingStartPlaybackSeconds(playbackSeconds);
    setTimer({ running: true, remaining: totalSeconds });
    setBrushingPhase("running");
    setError("");
  }

  function restartBrushing() {
    startBrushing();
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
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">BrushBeats</p>
        <h1>Two-minute brushing. Perfect tempo. Better vibes.</h1>
        <p>{subtitle}</p>
        <p className={`state-chip ${brushingPhase}`}>Status: {phaseLabel}</p>
      </header>

      {backendStatus && !error && <p className="info-banner">{backendStatus}</p>}
      {error && <p className="error-banner">{error}</p>}

      <section className="layout-grid">
        <BPMCalculator
          values={values}
          onChange={updateValue}
          bpmData={bpmData}
          loading={loading.bpm}
          timer={timer}
          brushingPhase={brushingPhase}
          onStartTimer={startBrushing}
          onRestartTimer={restartBrushing}
        />

        <SongList
          songs={songs}
          exhausted={isSongPoolExhausted}
          loading={loading.songs}
          tolerance={tolerance}
          keyword={keyword}
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
          autoplayToken={autoplayToken}
          onPlaybackTick={setPlaybackSeconds}
          onSongEnded={handleSongEnded}
        />

        <BrushingGuide
          timer={timer}
          brushingPhase={brushingPhase}
          values={values}
          selectedBpm={Number(selectedSong?.bpm || bpmData?.searchBpm || 120)}
          playbackSeconds={playbackSeconds}
          brushingStartPlaybackSeconds={brushingStartPlaybackSeconds}
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
        {import.meta.env.VITE_GIT_SHA && (
          <p className="version-info">
            <code>v{import.meta.env.VITE_GIT_SHA.substring(0, 7)}</code>
          </p>
        )}
      </footer>
    </main>
  );
}

export default App;
