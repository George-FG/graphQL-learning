import { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { QUIZ_QUESTIONS_QUERY } from "../graphql/queries";
import type { Query, QueryQuizQuestionsArgs, QuizQuestion } from "@generated/generated";

const BATCH_SIZE = 5;

type QuizResponse = Pick<Query, "quizQuestions">;

type AnswerState = "unanswered" | "correct" | "wrong";

type Props = {
  deckId: string;
  deckName: string;
  totalCards: number;
  onClose: () => void;
};

/**
 * Clean up plain-text option strings:
 * - Remove trailing punctuation (. , ; :)
 * - Insert a line break where a full stop is followed by a number + dot
 *   (e.g. "foo. 2. bar" → "foo.<br>2. bar")
 */
function formatOptionText(text: string): string {
  let out = text
    // Insert <br> and drop the preceding full stop before a new list item
    .replace(/\.\s+(\d+\.)/g, "<br>$1");
  // Strip trailing punctuation
  out = out.replace(/[.,;:]+$/, "");
  return out;
}

export default function ExamMode({ deckId, deckName, totalCards, onClose }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");

  const fetchedOffsets = useRef(new Set<number>());

  const [fetchQuestions, { data: fetchedData }] = useLazyQuery<
    QuizResponse,
    QueryQuizQuestionsArgs
  >(QUIZ_QUESTIONS_QUERY, { fetchPolicy: "network-only" });

  useEffect(() => {
    const incoming = fetchedData?.quizQuestions?.questions ?? [];
    if (incoming.length === 0) return;
    setQuestions((prev) => {
      const existingIds = new Set(prev.map((q) => q.cardId));
      const fresh = incoming.filter((q) => !existingIds.has(q.cardId));
      return [...prev, ...fresh];
    });
  }, [fetchedData]);

  const fetch = (offset: number) => {
    if (fetchedOffsets.current.has(offset)) return;
    if (offset >= totalCards) return;
    fetchedOffsets.current.add(offset);
    void fetchQuestions({ variables: { deckId, offset, limit: BATCH_SIZE } });
  };

  // Fetch first batch on mount
  useEffect(() => {
    fetch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Fetch next batch exactly when the user lands on the last question
  // of the current buffer — no earlier
  useEffect(() => {
    if (questions.length > 0 && qIndex === questions.length - 1) {
      fetch(questions.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, questions.length]);

  const isLoaded = questions.length > 0;
  const question = questions[qIndex] ?? null;
  const isLast = qIndex === totalCards - 1;
  const nextBuffered = questions[qIndex + 1] != null;
  const submitted = answerState !== "unanswered";

  const handleSubmit = () => {
    if (!selected || !question) return;
    setAnswerState(selected === question.correctOptionId ? "correct" : "wrong");
  };

  const handleNext = () => {
    setSelected(null);
    setAnswerState("unanswered");
    setQIndex((i) => i + 1);
  };

  if (!isLoaded) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <p>Generating questions…</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <p>{nextBuffered === false && !isLast ? "Loading next question…" : "All questions complete!"}</p>
          <button className="primary-button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const progress = ((qIndex + 1) / totalCards) * 100;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="exam-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Exam: ${deckName}`}
      >
        {/* Header */}
        <div className="exam-header">
          <div className="exam-title-row">
            <h2>{deckName}</h2>
            <button className="flashcard-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="exam-progress-row">
            <span className="exam-counter">Question {qIndex + 1} of {totalCards}</span>
          </div>
          <div className="exam-progress-bar">
            <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="exam-question">
          <div
            className="exam-question-text"
            dangerouslySetInnerHTML={{ __html: question.front }}
          />
        </div>

        {/* Options */}
        <ol className="exam-options" type="A">
          {question.options.map((opt, i) => {
            const isCorrect = opt.id === question.correctOptionId;
            const isSelected = opt.id === selected;

            let optClass = "exam-option";
            if (submitted) {
              if (isCorrect) optClass += " exam-option--correct";
              else if (isSelected) optClass += " exam-option--wrong";
            } else if (isSelected) {
              optClass += " exam-option--selected";
            }

            return (
              <li key={opt.id}>
                <button
                  className={optClass}
                  disabled={submitted}
                  onClick={() => setSelected(opt.id)}
                  aria-pressed={isSelected}
                >
                  <span className="exam-option-letter">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span
                    className="exam-option-text"
                    dangerouslySetInnerHTML={{ __html: formatOptionText(opt.text) }}
                  />
                  {submitted && isCorrect && (
                    <span className="exam-option-badge exam-option-badge--correct">✓ Correct</span>
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <span className="exam-option-badge exam-option-badge--wrong">✗ Incorrect</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Feedback */}
        {submitted && (
          <div className={`exam-feedback ${answerState === "correct" ? "exam-feedback--correct" : "exam-feedback--wrong"}`}>
            {answerState === "correct"
              ? "Correct! Well done."
              : "Incorrect. The correct answer is highlighted above."}
          </div>
        )}

        {/* Actions */}
        <div className="exam-actions">
          {!submitted ? (
            <button
              className="primary-button"
              disabled={!selected}
              onClick={handleSubmit}
            >
              Submit Answer
            </button>
          ) : isLast ? (
            <button className="primary-button" onClick={onClose}>
              Finish
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={!nextBuffered}
              onClick={handleNext}
            >
              {nextBuffered ? "Next Question →" : "Loading…"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
