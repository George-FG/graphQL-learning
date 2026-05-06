import { useExamSessionDetail } from "../shared/hooks";

type Props = {
  sessionId: string;
  onClose: () => void;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HistoryDetail({ sessionId, onClose }: Props) {
  const { session, loading } = useExamSessionDetail(sessionId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="history-detail-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Session detail"
      >
        <div className="history-detail-header">
          <div>
            <h2 className="history-detail-title">
              {session ? session.sourceName : "Loading…"}
              {session?.isRandom && <span className="history-badge history-badge--random">Random</span>}
            </h2>
            {session && <p className="history-detail-date">{fmt(session.createdAt)}</p>}
          </div>
          <button className="flashcard-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && !session && <p className="history-detail-loading">Loading…</p>}

        {session && (
          <>
            {/* Summary stats */}
            <div className="history-stat-row">
              <div className="history-stat-box">
                <span className="history-stat-value">{session.pctCorrect}%</span>
                <span className="history-stat-label">Correct</span>
              </div>
              <div className="history-stat-box">
                <span className="history-stat-value">{session.correctCount}/{session.answeredCount}</span>
                <span className="history-stat-label">Score</span>
              </div>
              <div className="history-stat-box">
                <span className="history-stat-value">{session.avgTimeSecs}s</span>
                <span className="history-stat-label">Avg time</span>
              </div>
              <div className="history-stat-box">
                <span className="history-stat-value">{session.answeredCount}/{session.totalCards}</span>
                <span className="history-stat-label">Answered</span>
              </div>
            </div>

            {/* Answer list */}
            <div className="history-answers-list">
              {session.answers.length === 0 && (
                <p className="history-empty">No answers recorded yet.</p>
              )}
              {session.answers.map((a, i) => (
                <div
                  key={i}
                  className={`history-answer-row ${a.wasCorrect ? "history-answer-row--correct" : "history-answer-row--wrong"}`}
                >
                  <span className={`history-answer-icon`}>
                    {a.wasCorrect ? "✓" : "✗"}
                  </span>
                  <span
                    className="history-answer-front"
                    dangerouslySetInnerHTML={{ __html: a.front }}
                  />
                  <span className="history-answer-time">{a.timeSecs}s</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
