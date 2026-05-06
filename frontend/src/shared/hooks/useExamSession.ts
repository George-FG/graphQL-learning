import { useEffect, useRef, useState, startTransition } from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { QUIZ_QUESTIONS_QUERY, QUIZ_QUESTIONS_FOR_SET_QUERY } from "../../graphql/queries";
import { START_EXAM_SESSION_MUTATION, RECORD_EXAM_ANSWER_MUTATION } from "../../graphql/mutations";
import type {
  Mutation,
  MutationStartExamSessionArgs,
  MutationRecordExamAnswerArgs,
  Query,
  QueryQuizQuestionsArgs,
  QueryQuizQuestionsForSetArgs,
  QuizQuestion,
} from "@generated/generated";

export type ExamSource = { type: "deck"; id: string } | { type: "set"; id: string };

const BATCH_SIZE = 2;

type QuizResponse = Pick<Query, "quizQuestions">;
type QuizSetResponse = Pick<Query, "quizQuestionsForSet">;
type StartSessionResponse = Pick<Mutation, "startExamSession">;
type RecordAnswerResponse = Pick<Mutation, "recordExamAnswer">;

export function useExamSession(source: ExamSource, totalCards: number, seed?: number) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [effectiveSeed, setEffectiveSeed] = useState<number | undefined>(seed);
  const sessionIdRef = useRef<string | null>(null);
  const fetchedOffsets = useRef(new Set<number>());

  const [fetchDeckQuestions, { data: deckData }] = useLazyQuery<QuizResponse, QueryQuizQuestionsArgs>(
    QUIZ_QUESTIONS_QUERY,
    { fetchPolicy: "network-only" }
  );
  const [fetchSetQuestions, { data: setData }] = useLazyQuery<QuizSetResponse, QueryQuizQuestionsForSetArgs>(
    QUIZ_QUESTIONS_FOR_SET_QUERY,
    { fetchPolicy: "network-only" }
  );
  const [startSession] = useMutation<StartSessionResponse, MutationStartExamSessionArgs>(START_EXAM_SESSION_MUTATION);
  const [recordAnswer] = useMutation<RecordAnswerResponse, MutationRecordExamAnswerArgs>(RECORD_EXAM_ANSWER_MUTATION);

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

  const fetchBatch = (offset: number, overrideSeed?: number) => {
    if (fetchedOffsets.current.has(offset)) return;
    if (offset >= totalCards) return;
    fetchedOffsets.current.add(offset);
    const useSeed = overrideSeed ?? effectiveSeed;
    if (source.type === "deck") {
      void fetchDeckQuestions({ variables: { deckId: source.id, offset, limit: BATCH_SIZE, seed: useSeed } });
    } else {
      void fetchSetQuestions({ variables: { setId: source.id, offset, limit: BATCH_SIZE, seed: useSeed } });
    }
  };

  const beginSession = (baseOffset: number, overrideSeed?: number) => {
    if (overrideSeed !== undefined) setEffectiveSeed(overrideSeed);
    fetchBatch(baseOffset, overrideSeed);
    if (sessionIdRef.current !== null) return;
    sessionIdRef.current = "pending";
    void startSession({
      variables: {
        deckId: source.type === "deck" ? source.id : undefined,
        setId: source.type === "set" ? source.id : undefined,
        seed: overrideSeed ?? effectiveSeed,
        totalCards,
      },
    }).then((res) => {
      sessionIdRef.current = res.data?.startExamSession ?? null;
    }).catch(() => { sessionIdRef.current = null; });
  };

  const submitAnswer = (cardId: string, front: string, wasCorrect: boolean, timeSecs: number, selectedOptionId: string) => {
    if (!sessionIdRef.current) return;
    void recordAnswer({
      variables: {
        sessionId: sessionIdRef.current,
        cardId,
        front,
        wasCorrect,
        timeSecs,
        selectedOptionId,
      },
    }).catch(() => {/* non-critical */});
  };

  const prefetchIfNeeded = (qIndex: number, baseOffset: number) => {
    if (questions.length > 0 && qIndex === questions.length - 1) {
      fetchBatch(baseOffset + questions.length);
    }
  };

  return {
    questions,
    effectiveSeed,
    sessionIdRef,
    fetchedOffsets,
    beginSession,
    submitAnswer,
    prefetchIfNeeded,
  };
}
