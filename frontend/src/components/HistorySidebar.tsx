import { useMemo, useState } from "react";
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

  const deckGroups = useMemo(() => {
    const answers = agg?.answers ?? [];
    const map = new Map<string, { deckId: string; deckName: string; total: number; correct: number }>();
    for (const a of answers) {
      if (!a.deckId || !a.deckName) continue;
      if (!map.has(a.deckId)) map.set(a.deckId, { deckId: a.deckId, deckName: a.deckName, total: 0, correct: 0 });
      const g = map.get(a.deckId)!;
      g.total++;
      if (a.wasCorrect) g.correct++;
    }
    return [...map.values()].sort((a, b) => a.deckName.localeCompare(b.deckName));
  }, [agg]);

  return (
    <>
      <aside className="history-sidebar">
        {/* Expand-to-fullscreen arrow — left edge strip */}
        <button
          className="history-sidebar-handle"
          onClick={() => setFullscreen(true)}
          aria-label="Open full history"
          title="See all questions"
        >
          <span className="history-sidebar-handle-arrow">‹</span>
        </button>

        {/* Always-visible content */}
        <div className="history-sidebar-content">
          <div className="history-sidebar-header">
            <span className="history-sidebar-title">History</span>
          </div>

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

          {/* Stats */}
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
                  <span className={`history-sidebar-stat-value ${agg.pctCorrect >= 60 ? "history-pct--good" : "history-pct--poor"}`}>
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

          {/* Per-deck breakdown */}
          {deckGroups.length > 1 && (
            <div className="history-deck-list">
              {deckGroups.map((g) => {
                const pct = Math.round((g.correct / g.total) * 100);
                return (
                  <div key={g.deckId} className="history-deck-row">
                    <span className="history-deck-name" title={g.deckName}>{g.deckName}</span>
                    <span className={`history-deck-pct ${pct >= 60 ? "history-pct--good" : "history-pct--poor"}`}>
                      {pct}%
                    </span>
                    <span className="history-deck-count">{g.total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {fullscreen && (
        <HistoryFullscreen
          deckId={deckId}
          setId={setId}
          initialPeriod={period}
          onClose={() => setFullscreen(false)}
          onPeriodChange={(p) => setPeriod(p)}
        />
      )}
    </>
  );
}
