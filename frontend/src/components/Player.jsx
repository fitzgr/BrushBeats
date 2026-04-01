import { useEffect, useMemo, useRef, useState } from "react";

function parseVideoId(playerData) {
  if (playerData?.videoId) {
    return playerData.videoId;
  }

  if (!playerData?.embedUrl) {
    return null;
  }

  try {
    const url = new URL(playerData.embedUrl);
    return url.pathname.split("/").pop() || null;
  } catch {
    return null;
  }
}

function Player({ selectedSong, playerData, loading, brushingPhase, autoplayToken, onPlaybackTick, onSongEnded }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const onPlaybackTickRef = useRef(onPlaybackTick);
  const onSongEndedRef = useRef(onSongEnded);
  const [apiReady, setApiReady] = useState(Boolean(window.YT?.Player));
  const videoId = useMemo(() => parseVideoId(playerData), [playerData]);

  useEffect(() => {
    onPlaybackTickRef.current = onPlaybackTick;
  }, [onPlaybackTick]);

  useEffect(() => {
    onSongEndedRef.current = onSongEnded;
  }, [onSongEnded]);

  function stopTickTimer() {
    if (tickTimerRef.current) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }

  function startTickTimer() {
    stopTickTimer();
    tickTimerRef.current = window.setInterval(() => {
      const seconds = playerRef.current?.getCurrentTime?.() ?? 0;
      onPlaybackTickRef.current?.(seconds);
    }, 250);
  }

  useEffect(() => {
    if (window.YT?.Player) {
      setApiReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") {
        previous();
      }
      setApiReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = previous;
    };
  }, []);

  useEffect(() => {
    if (!apiReady || !videoId || !hostRef.current) {
      return;
    }

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    playerRef.current = new window.YT.Player(hostRef.current, {
      videoId,
      playerVars: {
        rel: 0,
        autoplay: 0,
        playsinline: 1,
        modestbranding: 1
      },
      events: {
        onReady: () => {
          onPlaybackTickRef.current?.(playerRef.current?.getCurrentTime?.() ?? 0);
        },
        onStateChange: (event) => {
          if (event.data === window.YT?.PlayerState?.PLAYING) {
            startTickTimer();
          }

          if (event.data === window.YT?.PlayerState?.PAUSED || event.data === window.YT?.PlayerState?.BUFFERING) {
            stopTickTimer();
          }

          if (event.data === window.YT?.PlayerState?.ENDED) {
            stopTickTimer();
            onSongEndedRef.current?.();
          }
        }
      }
    });

    return () => {
      stopTickTimer();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiReady, videoId]);

  useEffect(() => {
    if (!autoplayToken || !playerRef.current) {
      return;
    }

    playerRef.current.playVideo?.();
  }, [autoplayToken]);

  return (
    <section className="card player">
      <h2>Embedded Player</h2>
      <p>Pick a song and play it inside the app with YouTube iframe embed.</p>

      {loading && <p>Matching song on YouTube...</p>}

      {!loading && !selectedSong && <p>Select a song to start playback.</p>}

      {!loading && selectedSong && !playerData?.embedUrl && (
        <p>Could not find an embeddable video for {selectedSong.title}.</p>
      )}

      {brushingPhase === "running" && (
        <p className="player-status">Brushing timer is running independently. Video playback remains under YouTube controls.</p>
      )}

      {playerData?.embedUrl && (
        <>
          <h3>
            {selectedSong.title} - {selectedSong.artist}
          </h3>
          <div ref={hostRef} className="player-frame" aria-label={`${selectedSong.title} by ${selectedSong.artist}`} />
        </>
      )}
    </section>
  );
}

export default Player;
