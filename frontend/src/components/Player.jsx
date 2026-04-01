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

function Player({ selectedSong, playerData, loading, brushingPhase }) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [apiReady, setApiReady] = useState(Boolean(window.YT?.Player));
  const videoId = useMemo(() => parseVideoId(playerData), [playerData]);

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
        onReady: () => {}
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [apiReady, videoId]);

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
