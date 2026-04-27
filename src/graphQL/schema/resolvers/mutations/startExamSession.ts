import { prisma } from "../../../../lib/prisma";
import type { MutationResolver } from "../lib/resolverTypes";

export const startExamSession: MutationResolver<"startExamSession"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const session = await prisma.examSession.create({
    data: {
      userId: BigInt(context.authUser.userId),
      deckId: args.deckId ? BigInt(args.deckId) : null,
      setId: args.setId ? BigInt(args.setId) : null,
      seed: args.seed ?? null,
      totalCards: args.totalCards,
    },
  });

  return session.id.toString();
};
