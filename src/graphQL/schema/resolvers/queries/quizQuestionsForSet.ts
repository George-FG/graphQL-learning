import { prisma } from "../../../../lib/prisma";
import { buildQuizQuestions, shuffleWithSeed, getDescendantSetIds, type CardForQuiz } from "../lib/quizHelpers";
import type { QueryResolver } from "../lib/resolverTypes";

export const quizQuestionsForSet: QueryResolver<"quizQuestionsForSet"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const userId = BigInt(context.authUser.userId);
  const setId = BigInt(args.setId);

  const allSetIds = await getDescendantSetIds(setId, userId);
  if (allSetIds.length === 0) throw new Error("Set not found");

  const deckRows = await prisma.deck.findMany({
    where: { deckSetId: { in: allSetIds }, userId },
    select: { id: true },
  });
  const deckIds = deckRows.map((d) => d.id);
  if (deckIds.length === 0) return { questions: [], totalCards: 0 };

  const BATCH = Math.min(2, Math.max(1, args.limit ?? 2));
  const offset = Math.max(0, args.offset ?? 0);

  const totalCards = await prisma.card.count({ where: { deckId: { in: deckIds } } });

  let questionCards: CardForQuiz[];
  if (args.seed != null) {
    const allIds = await prisma.card.findMany({
      where: { deckId: { in: deckIds } },
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
      where: { deckId: { in: deckIds } },
      orderBy: [{ deckId: "asc" }, { position: "asc" }],
      skip: offset,
      take: BATCH,
    });
  }

  if (questionCards.length === 0) return { questions: [], totalCards };

  const distractorPool = await prisma.card.findMany({
    where: { deckId: { in: deckIds }, id: { notIn: questionCards.map((c) => c.id) } },
    orderBy: [{ deckId: "asc" }, { position: "asc" }],
    take: 200,
  });

  const questions = await buildQuizQuestions(questionCards, distractorPool);
  return { questions, totalCards };
};
