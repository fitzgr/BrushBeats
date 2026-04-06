import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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

function Player({ selectedSong, selectedBpm, playerData, loading, brushingPhase, isMobile, autoplayToken, beatOffsetMs = 0, beatAdjustStepMs = 40, onAdjustBeatOffset, onResetBeatOffset, onPlaybackTick, onSongEnded }) {
  const { t } = useTranslation();
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const onPlaybackTickRef = useRef(onPlaybackTick);
  const onSongEndedRef = useRef(onSongEnded);
  const [apiReady, setApiReady] = useState(Boolean(window.YT?.Player));
  const videoId = useMemo(() => parseVideoId(playerData), [playerData]);
  const beatOffsetLabel = beatOffsetMs > 0 ? `+${beatOffsetMs}` : `${beatOffsetMs}`;
  const beatSyncVisible = Boolean(selectedSong && playerData?.embedUrl);

  useEffect(() => {
    onPlaybackTickRef.current = onPlaybackTick;
  }, [onPlaybackTick]);

  useEffect(() => {
    onSongEndedRef.current = onSongEnded;
  }, [onSongEnded]);

  const stopTickTimer = useEffectEvent(() => {
    if (tickTimerRef.current) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  });

  const startTickTimer = useEffectEvent(() => {
    stopTickTimer();
    tickTimerRef.current = window.setInterval(() => {
      const seconds = playerRef.current?.getCurrentTime?.() ?? 0;
      onPlaybackTickRef.current?.(seconds);
    }, 250);
  });

  useEffect(() => {
    if (window.YT?.Player) {
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
      <h2>{isMobile ? t("player.titleMobile") : t("player.titleDesktop")}</h2>
      <p>{isMobile ? t("player.introMobile") : t("player.introDesktop")}</p>

      {loading && <p>{t("player.matchingYoutube")}</p>}

      {!loading && !selectedSong && <p>{t("player.selectSong")}</p>}

      {!loading && selectedSong && !playerData?.embedUrl && (
        <p>{t("player.noEmbed", { title: selectedSong.title })}</p>
      )}

      {brushingPhase === "running" && (
        <p className="player-status">{t("player.runningStatus")}</p>
      )}

      {beatSyncVisible && (
        <div className="player-sync-panel">
          <div className="player-sync-copy">
            <strong>{t("player.syncLabel")}</strong>
            <span>{t("player.syncHint", { stepMs: beatAdjustStepMs, bpm: Math.round(Number(selectedBpm) || 120) })}</span>
          </div>
          <div className="player-sync-actions">
            <button type="button" className="action-btn secondary" onClick={() => onAdjustBeatOffset?.(-beatAdjustStepMs)}>
              {t("player.syncEarlier")}
            </button>
            <button type="button" className="action-btn secondary" onClick={() => onAdjustBeatOffset?.(beatAdjustStepMs)}>
              {t("player.syncLater")}
            </button>
            <button type="button" className="action-btn secondary" onClick={() => onResetBeatOffset?.()}>
              {t("player.syncReset")}
            </button>
          </div>
          <p className="player-sync-offset">{t("player.syncOffset", { offsetMs: beatOffsetLabel })}</p>
        </div>
      )}

      {selectedSong && (
        <>
          <h3>
            {selectedSong.title} - {selectedSong.artist}
          </h3>
          <div style={{ position: "relative" }}>
            <div
              ref={hostRef}
              className="player-frame"
              aria-label={t("player.frameAria", { title: selectedSong.title, artist: selectedSong.artist })}
              style={{ opacity: playerData?.embedUrl ? 1 : 0.4, minHeight: isMobile ? "180px" : "200px" }}
            />
            {loading && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255, 249, 239, 0.8)",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  color: "#666"
                }}
              >
                {t("player.loadingVideo")}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Player;
