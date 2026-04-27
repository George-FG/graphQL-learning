import { useLazyQuery } from "@apollo/client/react";
import { useEffect } from "react";
import { CARD_QUESTION_QUERY } from "../graphql/queries";
import type { Query, QueryCardQuestionArgs } from "@generated/generated";

type CardQuestionResponse = Pick<Query, "cardQuestion">;

type Props = {
  cardId: string;
  wasCorrect: boolean;
  /** The option ID the user selected (may be undefined for older answers) */
  selectedOptionId?: string;
  onClose: () => void;
};

export default function CardQuestionModal({ cardId, wasCorrect, selectedOptionId, onClose }: Props) {
  const [fetchQuestion, { data, loading }] = useLazyQuery<CardQuestionResponse, QueryCardQuestionArgs>(
    CARD_QUESTION_QUERY,
    { fetchPolicy: "cache-first" }
  );

  useEffect(() => {
    fetchQuestion({ variables: { cardId } });
  }, [cardId, fetchQuestion]);

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
    <div className="card-question-backdrop" onClick={onClose}>
      <div
        className="card-question-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Card question"
      >
        <div className="card-question-modal-header">
          <span className={`card-question-result-badge ${wasCorrect ? "card-question-result-badge--correct" : "card-question-result-badge--wrong"}`}>
            {wasCorrect ? "✓ You got this right" : "✗ You got this wrong"}
          </span>
          <button className="flashcard-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && <p className="card-question-loading">Loading question…</p>}

        {q && (
          <>
            <p
              className="card-question-front"
              dangerouslySetInnerHTML={{ __html: q.front }}
            />
            <ul className="card-question-options">
              {q.options.map((opt) => (
                <li
                  key={opt.id}
                  className={`card-question-option ${optionClass(opt.id, q.correctOptionId)}`}
                >
                  <span className="card-question-option-icon">
                    {optionIcon(opt.id, q.correctOptionId)}
                  </span>
                  <span>{opt.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

