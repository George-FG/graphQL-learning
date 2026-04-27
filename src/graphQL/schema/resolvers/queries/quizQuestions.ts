import { prisma } from "../../../../lib/prisma";
import { buildQuizQuestions, shuffleWithSeed, type CardForQuiz } from "../lib/quizHelpers";
import type { QueryResolver } from "../lib/resolverTypes";

export const quizQuestions: QueryResolver<"quizQuestions"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const BATCH = Math.min(2, Math.max(1, args.limit ?? 2));
  const offset = Math.max(0, args.offset ?? 0);

  const deckMeta = await prisma.deck.findFirst({
    where: {
      id: BigInt(args.deckId),
      userId: BigInt(context.authUser.userId),
    },
    include: { _count: { select: { cards: true } } },
  });
  if (!deckMeta) throw new Error("Deck not found");

  const totalCards = deckMeta._count.cards;

  let questionCards: CardForQuiz[];
  if (args.seed != null) {
    const allIds = await prisma.card.findMany({
      where: { deckId: BigInt(args.deckId) },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const pageIds = shuffleWithSeed(allIds.map((r) => r.id), args.seed).slice(offset, offset + BATCH);
    if (pageIds.length === 0) return { questions: [], totalCards };
    const fetched = await prisma.card.findMany({ where: { id: { in: pageIds } } });
    const cardMap = new Map(fetched.map((c) => [c.id.toString(), c]));
    questionCards = pageIds.map((id) => cardMap.get(id.toString())!).filter(Boolean);
  } else {
    questionCards = await prisma.card.findMany({
      where: { deckId: BigInt(args.deckId) },
      orderBy: { position: "asc" },
      skip: offset,
      take: BATCH,
    });
  }

  if (questionCards.length === 0) return { questions: [], totalCards };

  const distractorPool = await prisma.card.findMany({
    where: {
      deckId: BigInt(args.deckId),
      id: { notIn: questionCards.map((c) => c.id) },
    },
    orderBy: { position: "asc" },
    take: 200,
  });

  const questions = await buildQuizQuestions(questionCards, distractorPool);
  return { questions, totalCards };
};
