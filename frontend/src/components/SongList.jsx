function SongList({
  brusherProfile,
  songs,
  exhausted,
  loading,
  tolerance,
  danceability,
  acousticness,
  keyword,
  isMobile,
  onToleranceChange,
  onDanceabilityChange,
  onAcousticnessChange,
  onCommitTolerance,
  onCommitDanceability,
  onCommitAcousticness,
  onKeywordChange,
  onSelectSong,
  onRegenerate
}) {
  function handleRangeCommit(commitHandler) {
    return (event) => {
      commitHandler(Number(event.currentTarget.value));
    };
  }

  return (
    <section className="card songs">
      <h2>{isMobile ? "Song Picks" : "Song Discovery"}</h2>
      <p>{isMobile ? "Find tracks near your target BPM." : "Find tracks near your target BPM using GetSongBPM + optional keyword filters."}</p>
      <p className="song-note">{isMobile ? "Tap regenerate for fresh songs." : "Use regenerate to pull a fresh set at the same BPM range and discover different artists."}</p>
      <p className="song-note">Danceability and acousticness start at random values each time the page loads.</p>
      {brusherProfile && <p className="song-note">Detected brusher: {brusherProfile.label}. Music picks also drift with the typical tooth count for that stage.</p>}

      <div className="song-filters">
        <label>
          BPM Tolerance: +/- {tolerance}
          <input
            type="range"
            min="1"
            max="20"
            value={tolerance}
            onChange={(event) => onToleranceChange(Number(event.target.value))}
            onPointerUp={handleRangeCommit(onCommitTolerance)}
            onBlur={handleRangeCommit(onCommitTolerance)}
          />
        </label>

        <label>
          Danceability: {danceability}%
          <input
            type="range"
            min="0"
            max="100"
            value={danceability}
            onChange={(event) => onDanceabilityChange(Number(event.target.value))}
            onPointerUp={handleRangeCommit(onCommitDanceability)}
            onBlur={handleRangeCommit(onCommitDanceability)}
          />
        </label>

        <label>
          Acousticness: {acousticness}%
          <input
            type="range"
            min="0"
            max="100"
            value={acousticness}
            onChange={(event) => onAcousticnessChange(Number(event.target.value))}
            onPointerUp={handleRangeCommit(onCommitAcousticness)}
            onBlur={handleRangeCommit(onCommitAcousticness)}
          />
        </label>

        <label>
          Search by Title or Artist
          <input
            type="text"
            value={keyword}
            placeholder="e.g. dua lipa"
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </label>

        <button type="button" className="action-btn regen" onClick={onRegenerate} disabled={loading}>
          {loading ? "Refreshing..." : isMobile ? "Regenerate Songs" : "Regenerate Artists & Songs"}
        </button>
      </div>

      {loading && <p>Loading songs...</p>}
      {!loading && songs.length === 0 && <p>No songs found at this BPM range yet.</p>}
      {!loading && exhausted && (
        <p>You've already seen all songs in this current pool. Change keyword/tolerance or regenerate again for a fresh pool.</p>
      )}

      <ul className="song-list">
        {songs.map((song, index) => (
          <li key={`${song.title}-${song.artist}-${index}`}>
            <div>
              <strong>{song.title}</strong>
              <span>{song.artist}</span>
            </div>
            <div>
              <span className="song-bpm">{song.bpm} BPM</span>
              <button type="button" onClick={() => onSelectSong(song)}>
                Play
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SongList;
