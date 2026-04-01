import { useEffect, useMemo, useState } from "react";
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
  const [timer, setTimer] = useState({ running: false, remaining: 120 });
  const [playToken, setPlayToken] = useState(0);
  const [loading, setLoading] = useState({ bpm: false, songs: false, player: false });
  const [error, setError] = useState("");

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
        const result = await getSongs({ bpm: bpmData.searchBpm, tolerance, keyword });

        if (!cancelled) {
          setSongs(result.songs || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setSongs([]);
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
  }, [bpmData?.searchBpm, tolerance, keyword]);

  useEffect(() => {
    if (!timer.running) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimer((prev) => {
        if (prev.remaining <= 1) {
          window.clearInterval(interval);
          return { running: false, remaining: 0 };
        }

        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timer.running]);

  async function handleSelectSong(song) {
    setSelectedSong(song);
    setPlayerData(null);
    setLoading((prev) => ({ ...prev, player: true }));

    try {
      const video = await getYoutubeVideo({ title: song.title, artist: song.artist });
      setPlayerData(video);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading((prev) => ({ ...prev, player: false }));
    }
  }

  async function startBrushing() {
    try {
      const song = selectedSong || songs[0];

      if (!song) {
        setError("Pick a song first so we can start your brushing session with music.");
        return;
      }

      if (!selectedSong || selectedSong.title !== song.title || selectedSong.artist !== song.artist) {
        await handleSelectSong(song);
      }

      setPlayToken((prev) => prev + 1);
      setTimer({ running: true, remaining: 120 });
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  function updateValue(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const subtitle = useMemo(() => {
    if (!bpmData) {
      return "Matching your brushing rhythm to music you can actually enjoy.";
    }

    return `Target songs around ${Math.round(bpmData.searchBpm)} BPM (+/- ${tolerance}).`;
  }, [bpmData, tolerance]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <p className="eyebrow">BrushBeats</p>
        <h1>Two-minute brushing. Perfect tempo. Better vibes.</h1>
        <p>{subtitle}</p>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="layout-grid">
        <BPMCalculator
          values={values}
          onChange={updateValue}
          bpmData={bpmData}
          loading={loading.bpm}
          timer={timer}
          onStartTimer={startBrushing}
        />

        <SongList
          songs={songs}
          loading={loading.songs}
          tolerance={tolerance}
          keyword={keyword}
          onToleranceChange={setTolerance}
          onKeywordChange={setKeyword}
          onSelectSong={handleSelectSong}
        />

        <Player
          selectedSong={selectedSong}
          playerData={playerData}
          loading={loading.player}
          isBrushing={timer.running}
          playToken={playToken}
        />

        <BrushingGuide timer={timer} />
      </section>

      <footer className="credit-strip" id="credit">
        <p>
          Song tempo data powered by
          <a href="https://getsongbpm.com" target="_blank" rel="noreferrer">
            GetSongBPM
          </a>
        </p>
      </footer>
    </main>
  );
}

export default App;
