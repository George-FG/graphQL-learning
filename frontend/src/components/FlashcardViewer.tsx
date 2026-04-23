import { useState } from "react";
import type { Card } from "@generated/generated";

type Props = {
  deckName: string;
  cards: Pick<Card, "id" | "front" | "back" | "position">[];
  onClose: () => void;
};

export default function FlashcardViewer({ deckName, cards, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <h2>{deckName}</h2>
          <p>This deck has no cards.</p>
          <button className="primary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const card = cards[index];
  const isFirst = index === 0;
  const isLast = index === cards.length - 1;

  const handlePrev = () => {
    setFlipped(false);
    setIndex((i) => i - 1);
  };

  const handleNext = () => {
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  const handleFlip = () => setFlipped((f) => !f);

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
            {index + 1} / {cards.length}
          </span>
          <button
            className="flashcard-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <button
          className={`flashcard-face ${flipped ? "is-flipped" : ""}`}
          onClick={handleFlip}
          aria-label={flipped ? "Showing answer. Click to see question." : "Showing question. Click to reveal answer."}
        >
          <div className="flashcard-label">
            {flipped ? "Answer" : "Question"}
          </div>
          <div
            className="flashcard-content"
            /* Anki cards contain HTML — render it safely */
            dangerouslySetInnerHTML={{ __html: flipped ? card.back : card.front }}
          />
          <div className="flashcard-hint">
            {flipped ? "Click to see question" : "Click to reveal answer"}
          </div>
        </button>

        <div className="flashcard-nav">
          <button
            className="secondary-button"
            onClick={handlePrev}
            disabled={isFirst}
          >
            ← Previous
          </button>
          <button
            className="secondary-button"
            onClick={handleNext}
            disabled={isLast}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
