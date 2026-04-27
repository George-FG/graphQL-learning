import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { EXAM_AGGREGATE_QUERY } from "../graphql/queries";
import type { Query, QueryExamAggregateArgs } from "@generated/generated";
import HistoryFullscreen from "./HistoryFullscreen";
import { type Period, PERIODS } from "../lib/historyPeriods";

type AggResponse = Pick<Query, "examAggregate">;

type Props = {
  deckId?: string | null;
  setId?: string | null;
};

export default function HistorySidebar({ deckId, setId }: Props) {
  const [period, setPeriod] = useState<Period>("today");
  const [fullscreen, setFullscreen] = useState(false);

  const { data, loading } = useQuery<AggResponse, QueryExamAggregateArgs>(
    EXAM_AGGREGATE_QUERY,
    {
      variables: {
        deckId: deckId ?? undefined,
        setId: setId ?? undefined,
        period,
      },
      fetchPolicy: "cache-and-network",
      pollInterval: 30_000,
    }
  );

  const agg = data?.examAggregate;

  return (
    <>
      <aside className="history-sidebar">
        {/* Clickable header — opens fullscreen */}
        <button
          className="history-sidebar-expand-btn"
          onClick={() => setFullscreen(true)}
          title="Expand history"
        >
          <span className="history-sidebar-title">History</span>
          <span className="history-sidebar-expand-icon">⤢</span>
        </button>

        {/* Period tabs */}
        <div className="history-period-tabs">
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

        {/* Compact stats */}
        <div className="history-sidebar-stats">
          {loading && !agg && (
            <p className="history-empty">Loading…</p>
          )}
          {!loading && agg && agg.totalAnswered === 0 && (
            <p className="history-empty">No sessions yet.</p>
          )}
          {agg && agg.totalAnswered > 0 && (
            <>
              <div className="history-sidebar-stat">
                <span
                  className={`history-sidebar-stat-value ${agg.pctCorrect >= 60 ? "history-pct--good" : "history-pct--poor"}`}
                >
                  {agg.pctCorrect}%
                </span>
                <span className="history-sidebar-stat-label">correct</span>
              </div>
              <div className="history-sidebar-stat">
                <span className="history-sidebar-stat-value">{agg.avgTimeSecs}s</span>
                <span className="history-sidebar-stat-label">avg time</span>
              </div>
              <div className="history-sidebar-stat">
                <span className="history-sidebar-stat-value">{agg.totalAnswered}</span>
                <span className="history-sidebar-stat-label">answered</span>
              </div>
              <div className="history-sidebar-stat">
                <span className="history-sidebar-stat-value">{agg.sessionCount}</span>
                <span className="history-sidebar-stat-label">sessions</span>
              </div>
            </>
          )}
        </div>

        {agg && agg.totalAnswered > 0 && (
          <button
            className="history-sidebar-see-all"
            onClick={() => setFullscreen(true)}
          >
            See all questions →
          </button>
        )}
      </aside>

      {fullscreen && (
        <HistoryFullscreen
          deckId={deckId}
          setId={setId}
          initialPeriod={period}
          onClose={() => setFullscreen(false)}
        />
      )}
    </>
  );
}
