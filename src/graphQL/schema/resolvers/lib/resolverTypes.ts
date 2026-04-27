import type { Resolvers } from "@generated/generated";
import type { GraphQLContext } from "@generated/context";

type R = Resolvers<GraphQLContext>;
type QR = NonNullable<R["Query"]>;
type MR = NonNullable<R["Mutation"]>;

export type QueryResolver<K extends keyof QR> = NonNullable<QR[K]>;
export type MutationResolver<K extends keyof MR> = NonNullable<MR[K]>;
