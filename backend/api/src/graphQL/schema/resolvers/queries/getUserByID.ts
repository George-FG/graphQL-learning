import { prisma } from "../../../../lib/prisma";
import { toGraphQLUser } from "../lib/authHelpers";
import type { QueryResolver } from "../lib/resolverTypes";

export const getUserByID: QueryResolver<"getUserByID"> = async (_parent, args) => {
  const user = await prisma.user.findUnique({ where: { id: BigInt(args.ID) } });
  if (!user) throw new Error("User not found");
  return toGraphQLUser(user);
};
