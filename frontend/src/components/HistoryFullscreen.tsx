import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { CARD_QUESTION_QUERY, EXAM_AGGREGATE_QUERY } from "../graphql/queries";
import type { Query, QueryCardQuestionArgs, QueryExamAggregateArgs } from "@generated/generated";
import { type Period, PERIODS } from "../lib/historyPeriods";

type CardPanelProps = {
  cardId: string;
  wasCorrect: boolean;
  selectedOptionId?: string | null;
  onClose: () => void;
};

function CardQuestionPanel({ cardId, wasCorrect, selectedOptionId, onClose }: CardPanelProps) {
  const { data, loading } = useQuery<Pick<Query, "cardQuestion">, QueryCardQuestionArgs>(
    CARD_QUESTION_QUERY,
    { variables: { cardId }, fetchPolicy: "cache-first" }
  );
  const q = data?.cardQuestion;

  function optionClass(optId: string, correctId: string): string {
    if (optId === correctId) return "card-question-option--correct";
    if (selectedOptionId && optId === selectedOptionId) return "card-question-option--selected-wrong";
    return "card-question-option--neutral";
  }

  function optionIcon(optId: string, correctId: string): string {
    if (optId === correctId) return "✓";
    if (selectedOptionId && optId === selectedOptionId) return "✗";
    return "·";
  }

  return (
    <div className="history-fs-question-panel" onClick={(e) => e.stopPropagation()}>
      <div className="history-fs-question-header">
        <span className={`card-question-result-badge ${wasCorrect ? "card-question-result-badge--correct" : "card-question-result-badge--wrong"}`}>
          {wasCorrect ? "✓ Correct" : "✗ Incorrect"}
        </span>
        <button className="flashcard-close" onClick={onClose} aria-label="Close question">✕</button>
      </div>
      {loading && <p className="card-question-loading">Loading…</p>}
      {q && (
        <>
          <p className="card-question-front" dangerouslySetInnerHTML={{ __html: q.front }} />
          <ul className="card-question-options">
            {q.options.map((opt) => (
              <li key={opt.id} className={`card-question-option ${optionClass(opt.id, q.correctOptionId)}`}>
                <span className="card-question-option-icon">{optionIcon(opt.id, q.correctOptionId)}</span>
                <span>{opt.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

type AggResponse = Pick<Query, "examAggregate">;

type Filter = "all" | "correct" | "wrong";

type Props = {
  deckId?: string | null;
  setId?: string | null;
  initialPeriod: Period;
  onClose: () => void;
  onPeriodChange: (p: Period) => void;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function HistoryFullscreen({ deckId, setId, initialPeriod, onClose, onPeriodChange }: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    onPeriodChange(p);
  };
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedCard, setSelectedCard] = useState<{ cardId: string; wasCorrect: boolean; selectedOptionId?: string | null } | null>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setSelectedCard(null);
    setClosing(true);
  };

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (closing && e.target === e.currentTarget) onClose();
  };

  const { data, loading, refetch } = useQuery<AggResponse, QueryExamAggregateArgs>(
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

  // Group filtered answers by deck, preserving first-seen order
  const deckGroups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { deckId: string; deckName: string; answers: typeof filtered }>();
    for (const a of filtered) {
      const key = a.deckId ?? "__unknown__";
      const label = a.deckName ?? "Unknown deck";
      if (!map.has(key)) { order.push(key); map.set(key, { deckId: key, deckName: label, answers: [] }); }
      map.get(key)!.answers.push(a);
    }
    return order.map((k) => map.get(k)!);
  }, [filtered]);

  const multiDeck = deckGroups.length > 1;

  return (
    <>
    <div
      className={`history-fullscreen-backdrop ${closing ? "history-fullscreen-backdrop--closing" : ""}`}
      onClick={handleClose}
      onAnimationEnd={handleAnimationEnd}
    >
      {selectedCard && (
        <CardQuestionPanel
          cardId={selectedCard.cardId}
          wasCorrect={selectedCard.wasCorrect}
          selectedOptionId={selectedCard.selectedOptionId}
          onClose={() => setSelectedCard(null)}
        />
      )}
      <div
        className={`history-fullscreen ${closing ? "history-fullscreen--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Session history"
      >
        {/* Header */}
        <div className="history-fs-header">
          <h2 className="history-fs-title">History</h2>
          <button className="flashcard-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* Period tabs */}
        <div className="history-fs-period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`history-period-tab ${period === p.value ? "history-period-tab--active" : ""}`}
              onClick={() => handlePeriodChange(p.value)}
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

        {/* Answer list — grouped by deck when multiple decks present */}
        <div className="history-fs-answers">
          {loading && filtered.length === 0 && (
            <p className="history-empty">Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="history-empty">No answers for this period.</p>
          )}
          {deckGroups.map((group) => (
            <div key={group.deckId}>
              {multiDeck && (
                <div className="history-fs-deck-header">
                  <span className="history-fs-deck-name">📚 {group.deckName}</span>
                  <span className="history-fs-deck-count">{group.answers.length} answered</span>
                </div>
              )}
              {group.answers.map((a, i) => (
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
          ))}
        </div>
      </div>
    </div>

    </>
  );
}
