import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { EXAM_AGGREGATE_QUERY } from "../graphql/queries";
import type { Query, QueryExamAggregateArgs } from "@generated/generated";
import CardQuestionModal from "./CardQuestionModal";
import { type Period, PERIODS } from "../lib/historyPeriods";

type AggResponse = Pick<Query, "examAggregate">;

type Filter = "all" | "correct" | "wrong";

type Props = {
  deckId?: string | null;
  setId?: string | null;
  initialPeriod: Period;
  onClose: () => void;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function HistoryFullscreen({ deckId, setId, initialPeriod, onClose }: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedCard, setSelectedCard] = useState<{ cardId: string; wasCorrect: boolean; selectedOptionId?: string | null } | null>(null);

  const { data, loading } = useQuery<AggResponse, QueryExamAggregateArgs>(
    EXAM_AGGREGATE_QUERY,
    {
      variables: {
        deckId: deckId ?? undefined,
        setId: setId ?? undefined,
        period,
      },
      fetchPolicy: "cache-and-network",
    }
  );

  const agg = data?.examAggregate;
  const answers = agg?.answers ?? [];
  const filtered =
    filter === "all"     ? answers :
    filter === "correct" ? answers.filter((a) => a.wasCorrect) :
                           answers.filter((a) => !a.wasCorrect);

  return (
    <>
    <div className="history-fullscreen-backdrop" onClick={onClose}>
      <div
        className="history-fullscreen"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Session history"
      >
        {/* Header */}
        <div className="history-fs-header">
          <h2 className="history-fs-title">History</h2>
          <button className="flashcard-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Period tabs */}
        <div className="history-fs-period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`history-period-tab ${period === p.value ? "history-period-tab--active" : ""}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Aggregate stats */}
        {agg && (
          <div className="history-stat-row">
            <div className="history-stat-box">
              <span className={`history-stat-value ${agg.pctCorrect >= 60 ? "history-pct--good" : "history-pct--poor"}`}>
                {agg.pctCorrect}%
              </span>
              <span className="history-stat-label">Correct</span>
            </div>
            <div className="history-stat-box">
              <span className="history-stat-value">{agg.correctCount}/{agg.totalAnswered}</span>
              <span className="history-stat-label">Score</span>
            </div>
            <div className="history-stat-box">
              <span className="history-stat-value">{agg.avgTimeSecs}s</span>
              <span className="history-stat-label">Avg time</span>
            </div>
            <div className="history-stat-box">
              <span className="history-stat-value">{agg.sessionCount}</span>
              <span className="history-stat-label">Sessions</span>
            </div>
          </div>
        )}

        {/* Answer filter */}
        <div className="history-fs-filter-row">
          {(["all", "correct", "wrong"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`history-filter-btn ${filter === f ? "history-filter-btn--active" : ""} ${f === "correct" ? "history-filter-btn--correct" : f === "wrong" ? "history-filter-btn--wrong" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All (${answers.length})` :
               f === "correct" ? `Correct (${answers.filter((a) => a.wasCorrect).length})` :
               `Incorrect (${answers.filter((a) => !a.wasCorrect).length})`}
            </button>
          ))}
        </div>

        {/* Answer list */}
        <div className="history-fs-answers">
          {loading && filtered.length === 0 && (
            <p className="history-empty">Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="history-empty">No answers for this period.</p>
          )}
          {filtered.map((a, i) => (
            <div
              key={i}
              className={`history-answer-row ${a.wasCorrect ? "history-answer-row--correct" : "history-answer-row--wrong"} ${a.cardId ? "history-answer-row--clickable" : ""}`}
              onClick={() => a.cardId ? setSelectedCard({ cardId: a.cardId, wasCorrect: a.wasCorrect, selectedOptionId: a.selectedOptionId }) : undefined}
              role={a.cardId ? "button" : undefined}
              tabIndex={a.cardId ? 0 : undefined}
              onKeyDown={a.cardId ? (e) => e.key === "Enter" && setSelectedCard({ cardId: a.cardId!, wasCorrect: a.wasCorrect, selectedOptionId: a.selectedOptionId }) : undefined}
            >
              <span className="history-answer-icon">{a.wasCorrect ? "✓" : "✗"}</span>
              <span
                className="history-answer-front"
                dangerouslySetInnerHTML={{ __html: a.front }}
              />
              <div className="history-answer-meta">
                <span className="history-answer-time">{a.timeSecs}s</span>
                <span className="history-answer-date">{fmtDate(a.sessionDate)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {selectedCard && (
      <CardQuestionModal
        cardId={selectedCard.cardId}
        wasCorrect={selectedCard.wasCorrect}
        selectedOptionId={selectedCard.selectedOptionId ?? undefined}
        onClose={() => setSelectedCard(null)}
      />
    )}
    </>
  );
}
