import { prisma } from "../../../../lib/prisma";
import type { MutationResolver } from "../lib/resolverTypes";

export const deleteDeck: MutationResolver<"deleteDeck"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const deck = await prisma.deck.findFirst({
    where: {
      id: BigInt(args.id),
      userId: BigInt(context.authUser.userId),
    },
  });
  if (!deck) throw new Error("Deck not found");

  // Clear cached distractors before deletion (non-blocking cascade)
  await prisma.card.updateMany({
    where: { deckId: deck.id },
    data: { distractors: null },
  });

  await prisma.deck.delete({ where: { id: deck.id } });
  return true;
};
