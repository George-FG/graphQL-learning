import { useEffect } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { CARD_QUESTION_QUERY } from "../../graphql/queries";
import type { Query, QueryCardQuestionArgs } from "@generated/generated";

type CardQuestionResponse = Pick<Query, "cardQuestion">;

export function useCardQuestion(cardId: string) {
  const [fetchQuestion, { data, loading }] = useLazyQuery<CardQuestionResponse, QueryCardQuestionArgs>(
    CARD_QUESTION_QUERY,
    { fetchPolicy: "cache-first" }
  );

  useEffect(() => {
    fetchQuestion({ variables: { cardId } });
  }, [cardId, fetchQuestion]);

  return { question: data?.cardQuestion, loading };
}
