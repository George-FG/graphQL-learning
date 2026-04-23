import { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { DECK_QUERY } from "../graphql/queries";
import type { Query, QueryDeckArgs, Card } from "@generated/generated";

const PAGE_SIZE = 10;
const PREFETCH_AT = 3; // fetch next batch when this many cards remain in buffer

type CardSlice = Pick<Card, "id" | "front" | "back" | "position">;
type DeckResponse = Pick<Query, "deck">;

type Props = {
  deckId: string;
  deckName: string;
  totalCards: number;
  onClose: () => void;
};

export default function FlashcardViewer({ deckId, deckName, totalCards, onClose }: Props) {
  const [cards, setCards] = useState<CardSlice[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Track which offsets we've already fetched or are fetching
  const fetchedOffsets = useRef(new Set<number>());

  const [fetchCards, { data: fetchedData }] = useLazyQuery<DeckResponse, QueryDeckArgs>(DECK_QUERY, {
    fetchPolicy: "network-only",
  });

  // Merge newly fetched cards into the buffer whenever the query result changes
  useEffect(() => {
    const incoming = fetchedData?.deck?.cards ?? [];
    if (incoming.length === 0) return;
    setCards((prev) => {
      const positions = new Set(prev.map((c) => c.position));
      const fresh = incoming.filter((c) => !positions.has(c.position));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort((a, b) => a.position - b.position);
    });
  }, [fetchedData]);

  const fetch = (offset: number) => {
    if (fetchedOffsets.current.has(offset)) return;
    if (offset >= totalCards) return;
    fetchedOffsets.current.add(offset);
    void fetchCards({ variables: { id: deckId, offset, limit: PAGE_SIZE } });
  };

  // Fetch first page on mount
  useEffect(() => {
    fetch(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Prefetch next page when within PREFETCH_AT cards of the buffer end
  useEffect(() => {
    const bufferEnd = cards.length; // next offset to fetch
    if (index >= bufferEnd - PREFETCH_AT) {
      fetch(bufferEnd);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cards.length]);

  const isLoaded = cards.length > 0;
  const card = cards[index] ?? null;
  const isFirst = index === 0;
  const isLast = index === totalCards - 1;
  // Disable Next if the next card isn't buffered yet
  const nextBuffered = cards[index + 1] != null;

  const handlePrev = () => { setFlipped(false); setIndex((i) => i - 1); };
  const handleNext = () => { setFlipped(false); setIndex((i) => i + 1); };
  const handleFlip = () => setFlipped((f) => !f);

  if (!isLoaded) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <p>Loading cards…</p>
        </div>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <h2>{deckName}</h2>
          <p>This deck has no cards.</p>
          <button className="primary-button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="flashcard-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Flashcard viewer: ${deckName}`}
      >
        <div className="flashcard-header">
          <h2>{deckName}</h2>
          <span className="flashcard-counter">
            {index + 1} / {totalCards}
          </span>
          <button className="flashcard-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {card ? (
          <button
            className={`flashcard-face ${flipped ? "is-flipped" : ""}`}
            onClick={handleFlip}
            aria-label={flipped ? "Showing answer. Click to see question." : "Showing question. Click to reveal answer."}
          >
            <div className="flashcard-label">{flipped ? "Answer" : "Question"}</div>
            <div
              className="flashcard-content"
              dangerouslySetInnerHTML={{ __html: flipped ? card.back : card.front }}
            />
            <div className="flashcard-hint">
              {flipped ? "Click to see question" : "Click to reveal answer"}
            </div>
          </button>
        ) : (
          <div className="flashcard-face">
            <div className="flashcard-label">Loading…</div>
          </div>
        )}

        <div className="flashcard-nav">
          <button className="secondary-button" onClick={handlePrev} disabled={isFirst}>
            ← Previous
          </button>
          <button
            className="secondary-button"
            onClick={handleNext}
            disabled={isLast || !nextBuffered}
          >
            {!isLast && !nextBuffered ? "Loading…" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

