function MyStoryPage({ onExit }) {
  return (
    <section className="story-page card" aria-label="My Story About the App">
      <div className="story-header">
        <p className="story-eyebrow">About the Developer</p>
        <h2>My Story About the App</h2>
        <p>
          Hi, I am Grant, a Canadian developer with a lifelong passion for music and dance.
          Rhythm has always shaped how I learn, build, and think about experiences.
        </p>
      </div>

      <div className="story-section">
        <h3>How BrushBeats Started</h3>
        <p>
          BrushBeats started with a very practical problem: I found myself falling out of sync
          with how long I was supposed to brush. Even with traditional timers, or the
          quarter-by-quarter notifications on electric toothbrushes, it was easy to lose rhythm,
          rush through sections, or mentally drift.
        </p>
        <p>
          I started wondering: what if brushing felt more natural when guided by rhythm instead of
          countdowns?
        </p>
        <p>
          That idea led to a beat-guided brushing experience where pacing feels musical,
          engaging, and adapts to the selected tooth count and brushing duration.
        </p>
      </div>

      <div className="story-section">
        <h3>What I Build Around</h3>
        <p>
          My background combines data-driven systems, interactive web apps, and music timing
          workflows. I enjoy exploring how pacing, accessibility, and real-time feedback can make
          everyday routines easier to stick with.
        </p>
      </div>

      <div className="story-section">
        <h3>Future Vision</h3>
        <p>
          I believe great software is never built in isolation. It is a collaborative journey with
          real users who share what works and what needs improvement.
        </p>
        <p>
          If you are an early adopter, I would love your feedback. In return for your insights,
          early adopters will keep lifetime free access while we shape the platform together.
        </p>
        <p>
          Want to reach me directly? Email <a href="mailto:canadianwindrider@gmail.com">canadianwindrider@gmail.com</a>.
        </p>
        <p>
          If you'd like to support the rhythm—fuel my dev sessions with a coffee or two—I'd be genuinely grateful. Head to <a href="https://paypal.me/brushbeats" target="_blank" rel="noreferrer">paypal.me/brushbeats</a>.
        </p>
        <p className="story-closing">Still building. Still experimenting. Built on rhythm.</p>
      </div>

      <div className="story-actions">
        <button type="button" className="action-btn" onClick={onExit}>
          Return to brushing flow
        </button>
      </div>
    </section>
  );
}

export default MyStoryPage;
