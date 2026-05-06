import { useQuery } from "@apollo/client/react";
import { ME_QUERY } from "../../graphql/queries";
import type { Query } from "@generated/generated";

type MeResponse = Pick<Query, "me">;

export function useMe() {
  const { data, loading, error } = useQuery<MeResponse>(ME_QUERY, {
    fetchPolicy: "network-only",
  });
  return { user: data?.me ?? null, loading, error };
}
