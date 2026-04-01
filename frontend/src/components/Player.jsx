function Player({ selectedSong, playerData, loading, isBrushing, playToken }) {
  let iframeSrc = null;

  if (playerData?.embedUrl) {
    const url = new URL(playerData.embedUrl);
    url.searchParams.set("rel", "0");

    if (isBrushing) {
      url.searchParams.set("autoplay", "1");
    }

    iframeSrc = url.toString();
  }

  return (
    <section className="card player">
      <h2>Embedded Player</h2>
      <p>Pick a song and play it inside the app with YouTube iframe embed.</p>

      {loading && <p>Matching song on YouTube...</p>}

      {!loading && !selectedSong && <p>Select a song to start playback.</p>}

      {!loading && selectedSong && !playerData?.embedUrl && (
        <p>Could not find an embeddable video for {selectedSong.title}.</p>
      )}

      {playerData?.embedUrl && (
        <>
          <h3>
            {selectedSong.title} - {selectedSong.artist}
          </h3>
          <iframe
            key={`${playerData.videoId || "video"}-${playToken}-${isBrushing ? "run" : "idle"}`}
            title={`${selectedSong.title} by ${selectedSong.artist}`}
            src={iframeSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </>
      )}
    </section>
  );
}

export default Player;
