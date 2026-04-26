import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { QUIZ_QUESTIONS_QUERY, QUIZ_QUESTIONS_FOR_SET_QUERY } from "../graphql/queries";
import type { Query, QueryQuizQuestionsArgs, QueryQuizQuestionsForSetArgs, QuizQuestion } from "@generated/generated";

const BATCH_SIZE = 2;

type QuizResponse = Pick<Query, "quizQuestions">;
type QuizSetResponse = Pick<Query, "quizQuestionsForSet">;

type AnswerState = "unanswered" | "correct" | "wrong";

export type ExamSource = { type: "deck"; id: string } | { type: "set"; id: string };

type Props = {
  source: ExamSource;
  name: string;
  totalCards: number;
  seed?: number;
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
    .replace(/\.\s+(\d+\.)/g, "<br>$1");
  out = out.replace(/[.,;:]+$/, "");
  return out;
}

export default function ExamMode({ source, name, totalCards, seed, onClose }: Props) {
  const storageKey = source.type === "deck"
    ? `examProgress_deck_${source.id}`
    : `examProgress_set_${source.id}`;

  const savedIndex = useMemo(() => {
    if (seed != null) return 0; // random mode: always start fresh
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { lastIndex: number };
      return typeof parsed.lastIndex === "number" &&
        parsed.lastIndex > 0 &&
        parsed.lastIndex < totalCards
        ? parsed.lastIndex
        : 0;
    } catch { return 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [resumeAsked, setResumeAsked] = useState(savedIndex > 0);
  const [baseOffset, setBaseOffset] = useState(0);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");

  // Session stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [avgSeconds, setAvgSeconds] = useState<number | null>(null);
  const questionStartRef = useRef<number>(0);

  const fetchedOffsets = useRef(new Set<number>());

  const [fetchDeckQuestions, { data: deckData }] = useLazyQuery<QuizResponse, QueryQuizQuestionsArgs>(
    QUIZ_QUESTIONS_QUERY, { fetchPolicy: "network-only" }
  );
  const [fetchSetQuestions, { data: setData }] = useLazyQuery<QuizSetResponse, QueryQuizQuestionsForSetArgs>(
    QUIZ_QUESTIONS_FOR_SET_QUERY, { fetchPolicy: "network-only" }
  );

  const fetchedData = source.type === "deck"
    ? deckData?.quizQuestions
    : setData?.quizQuestionsForSet;

  useEffect(() => {
    const incoming = fetchedData?.questions ?? [];
    if (incoming.length === 0) return;
    startTransition(() => {
      setQuestions((prev) => {
        const existingIds = new Set(prev.map((q) => q.cardId));
        const fresh = incoming.filter((q) => !existingIds.has(q.cardId));
        return [...prev, ...fresh];
      });
    });
  }, [fetchedData]);

  const fetchBatch = (offset: number) => {
    if (fetchedOffsets.current.has(offset)) return;
    if (offset >= totalCards) return;
    fetchedOffsets.current.add(offset);
    if (source.type === "deck") {
      void fetchDeckQuestions({ variables: { deckId: source.id, offset, limit: BATCH_SIZE, seed } });
    } else {
      void fetchSetQuestions({ variables: { setId: source.id, offset, limit: BATCH_SIZE, seed } });
    }
  };

  // Fetch first batch once resume decision is made
  useEffect(() => {
    if (resumeAsked) return;
    fetchBatch(baseOffset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAsked, baseOffset]);

  // Reset start time when question changes
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [qIndex]);

  // Prefetch next batch exactly when landing on last question of buffer
  useEffect(() => {
    if (resumeAsked) return;
    if (questions.length > 0 && qIndex === questions.length - 1) {
      fetchBatch(baseOffset + questions.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, questions.length, resumeAsked]);

  const isLoaded = questions.length > 0;
  const question = questions[qIndex] ?? null;
  const globalIndex = baseOffset + qIndex;
  const isLast = globalIndex === totalCards - 1;
  const nextBuffered = questions[qIndex + 1] != null;
  const submitted = answerState !== "unanswered";
  const totalAnswered = correctCount + wrongCount;

  const handleSubmit = () => {
    if (!selected || !question) return;
    const isCorrect = selected === question.correctOptionId;
    setAnswerState(isCorrect ? "correct" : "wrong");

    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    if (isCorrect) setCorrectCount((n) => n + 1);
    else setWrongCount((n) => n + 1);

    setAvgSeconds((prev) =>
      prev === null ? elapsed : Math.round((prev * totalAnswered + elapsed) / (totalAnswered + 1))
    );
  };

  const handleNext = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ lastIndex: globalIndex + 1 }));
    } catch { /* ignore */ }
    setSelected(null);
    setAnswerState("unanswered");
    setQIndex((i) => i + 1);
  };

  const handleFinish = () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    onClose();
  };

  const handleResume = () => {
    setBaseOffset(savedIndex);
    setResumeAsked(false);
  };

  const handleStartOver = () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setBaseOffset(0);
    setResumeAsked(false);
  };

  // Resume prompt
  if (resumeAsked) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-title"
        >
          <h2 id="resume-title">{name}</h2>
          <p className="modal-subtitle">
            You left off at <strong>question {savedIndex + 1}</strong> of {totalCards}.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={handleStartOver}>Start Over</button>
            <button className="primary-button" onClick={handleResume}>Resume from Q{savedIndex + 1}</button>
          </div>
        </div>
      </div>
    );
  }

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
          <p>{!nextBuffered && !isLast ? "Loading next question…" : "All questions complete!"}</p>
          <button className="primary-button" onClick={handleFinish}>Close</button>
        </div>
      </div>
    );
  }

  const progress = ((globalIndex + 1) / totalCards) * 100;
  const pct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="exam-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Exam: ${name}`}
      >
        {/* Header */}
        <div className="exam-header">
          <div className="exam-title-row">
            <h2>{name}</h2>
            <button className="flashcard-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="exam-progress-row">
            <span className="exam-counter">Question {globalIndex + 1} of {totalCards}</span>
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

        {/* Session stats — replaces the old feedback banner */}
        {totalAnswered > 0 && (
          <div className={`exam-stats ${pct !== null && pct >= 60 ? "exam-stats--good" : "exam-stats--poor"}`}>
            <span>{correctCount}/{totalAnswered} correct ({pct}%)</span>
            {avgSeconds !== null && (
              <span className="exam-stats-avg">· avg {avgSeconds}s</span>
            )}
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
            <button className="primary-button" onClick={handleFinish}>
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
