import { prisma } from "../../../../lib/prisma";
import { buildQuizQuestions } from "../lib/quizHelpers";
import type { QueryResolver } from "../lib/resolverTypes";

export const cardQuestion: QueryResolver<"cardQuestion"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const userId = BigInt(context.authUser.userId);

  const card = await prisma.card.findFirst({
    where: {
      id: BigInt(args.cardId),
      deck: { userId },
    },
    select: { id: true, front: true, back: true, position: true, distractors: true, deckId: true },
  });
  if (!card) return undefined;

  const siblings = await prisma.card.findMany({
    where: { deckId: card.deckId, id: { not: card.id } },
    select: { id: true, front: true, back: true, position: true, distractors: true },
    take: 50,
  });

  const [question] = await buildQuizQuestions([card], siblings);
  return question ?? undefined;
};
