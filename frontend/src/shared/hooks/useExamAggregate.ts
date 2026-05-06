import { useQuery } from "@apollo/client/react";
import { EXAM_AGGREGATE_QUERY } from "../../graphql/queries";
import type { Query, QueryExamAggregateArgs } from "@generated/generated";
import type { Period } from "../../lib/historyPeriods";

type AggResponse = Pick<Query, "examAggregate">;

export function useExamAggregate(deckId: string | null | undefined, setId: string | null | undefined, period: Period) {
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
  return { agg: data?.examAggregate, loading };
}
