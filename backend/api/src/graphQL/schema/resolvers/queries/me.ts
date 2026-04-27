import { prisma } from "../../../../lib/prisma";
import { toGraphQLUser } from "../lib/authHelpers";
import type { QueryResolver } from "../lib/resolverTypes";

export const me: QueryResolver<"me"> = async (_parent, _args, context) => {
  if (!context.authUser) return undefined;
  const user = await prisma.user.findUnique({ where: { id: BigInt(context.authUser.userId) } });
  if (!user) return undefined;
  return toGraphQLUser(user);
};
