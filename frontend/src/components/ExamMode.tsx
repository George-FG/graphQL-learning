import { useEffect, useMemo, useRef, useState } from "react";
import { useExamSession } from "../shared/hooks";
import type { ExamSource } from "../shared/hooks";

type AnswerState = "unanswered" | "correct" | "wrong";

export type { ExamSource };

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
  // Separate keys so exam-mode and random-mode progress never collide.
  const storageKey = `examProgress_${seed != null ? "random" : "exam"}_${source.type}_${source.id}`;

  const savedProgress = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { lastIndex?: number; seed?: number };
      const idx = parsed.lastIndex;
      if (typeof idx !== "number" || idx <= 0 || idx >= totalCards) return null;
      if (seed != null) {
        // Random mode: only resumable if we stored the exact same-deck seed.
        return typeof parsed.seed === "number"
          ? { lastIndex: idx, storedSeed: parsed.seed }
          : null;
      }
      return { lastIndex: idx } as { lastIndex: number; storedSeed?: number };
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [resumeAsked, setResumeAsked] = useState(savedProgress !== null);
  const [baseOffset, setBaseOffset] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");

  // Session stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [avgSeconds, setAvgSeconds] = useState<number | null>(null);
  const questionStartRef = useRef<number>(0);

  const { questions, effectiveSeed, beginSession, submitAnswer, prefetchIfNeeded } = useExamSession(source, totalCards, seed);

  // Fetch first batch once resume decision is made + start session
  useEffect(() => {
    if (resumeAsked) return;
    const overrideSeed = savedProgress?.storedSeed;
    beginSession(baseOffset, overrideSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAsked, baseOffset]);

  // Reset start time when question changes
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [qIndex]);

  // Prefetch next batch exactly when landing on last question of buffer
  useEffect(() => {
    if (resumeAsked) return;
    prefetchIfNeeded(qIndex, baseOffset);
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

    submitAnswer(question.cardId, question.front, isCorrect, elapsed, selected);
  };

  const handleNext = () => {
    try {
      const entry = effectiveSeed != null
        ? { lastIndex: globalIndex + 1, seed: effectiveSeed }
        : { lastIndex: globalIndex + 1 };
      localStorage.setItem(storageKey, JSON.stringify(entry));
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
    if (savedProgress) {
      setBaseOffset(savedProgress.lastIndex);
    }
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
            You left off at <strong>question {savedProgress!.lastIndex + 1}</strong> of {totalCards}.
          </p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={handleStartOver}>Start Over</button>
            <button className="primary-button" onClick={handleResume}>Resume from Q{savedProgress!.lastIndex + 1}</button>
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
