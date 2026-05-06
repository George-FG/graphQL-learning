import { useQuery } from "@apollo/client/react";
import { EXAM_SESSION_DETAIL_QUERY } from "../../graphql/queries";
import type { Query, QueryExamSessionDetailArgs } from "@generated/generated";

type DetailResponse = Pick<Query, "examSessionDetail">;

export function useExamSessionDetail(sessionId: string) {
  const { data, loading } = useQuery<DetailResponse, QueryExamSessionDetailArgs>(
    EXAM_SESSION_DETAIL_QUERY,
    { variables: { id: sessionId }, fetchPolicy: "cache-and-network" }
  );
  return { session: data?.examSessionDetail, loading };
}
