import { prisma } from "../../../../lib/prisma";
import type { MutationResolver } from "../lib/resolverTypes";

export const deleteDeckSet: MutationResolver<"deleteDeckSet"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const set = await prisma.deckSet.findFirst({
    where: {
      id: BigInt(args.id),
      userId: BigInt(context.authUser.userId),
    },
  });
  if (!set) throw new Error("Set not found");

  await prisma.deckSet.delete({ where: { id: set.id } });
  return true;
};
