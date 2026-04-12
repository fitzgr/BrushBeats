import { useTranslation } from "react-i18next";
import versionHistory from "../generated/versionHistory.json";

function formatHistoryDate(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value).split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function getSourceTag(entry) {
  if (entry?.kind === "push") {
    return "GitHub Push";
  }

  return "Git Commit";
}

function VersionHistory({ onExit }) {
  const { t } = useTranslation();

  return (
    <section className="version-history-view card">
      <div className="version-history-header">
        <div>
          <p className="eyebrow">{t("history.eyebrow")}</p>
          <h2>{t("history.title")}</h2>
          <p>{t("history.intro")}</p>
        </div>
        <button type="button" className="action-btn secondary" onClick={onExit}>
          {t("history.backToApp")}
        </button>
      </div>

      <div className="version-history-list">
        {versionHistory.map((entry) => (
          <article key={entry.id || entry.sha} className="version-history-card">
            <div className="version-history-meta">
              <strong>{formatHistoryDate(entry.date)}</strong>
              <span>#{entry.shortSha}</span>
              <span className="version-history-source">{getSourceTag(entry)}</span>
            </div>
            <p>{entry.subject}</p>
            {Array.isArray(entry.commits) && entry.commits.length > 0 ? (
              <div className="version-history-commits">
                {entry.commits.map((commit) => (
                  <p key={`${entry.id}-${commit.sha || commit.shortSha}`}>
                    #{commit.shortSha}: {commit.message}
                  </p>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default VersionHistory;