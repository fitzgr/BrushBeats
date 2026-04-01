function SongList({ songs, exhausted, loading, tolerance, keyword, onToleranceChange, onKeywordChange, onSelectSong, onRegenerate }) {
  return (
    <section className="card songs">
      <h2>Song Discovery</h2>
      <p>Find tracks near your target BPM using GetSongBPM + optional keyword filters.</p>
      <p className="song-note">Use regenerate to pull a fresh set at the same BPM range and discover different artists.</p>

      <div className="song-filters">
        <label>
          BPM Tolerance: +/- {tolerance}
          <input
            type="range"
            min="1"
            max="20"
            value={tolerance}
            onChange={(event) => onToleranceChange(Number(event.target.value))}
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
          {loading ? "Refreshing..." : "Regenerate Artists & Songs"}
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
