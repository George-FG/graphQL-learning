import { prisma } from "../../../../lib/prisma";
import { parsePeriodStart } from "../lib/periodFilter";
import { getDescendantSetIds } from "../lib/quizHelpers";
import type { QueryResolver } from "../lib/resolverTypes";

export const examAggregate: QueryResolver<"examAggregate"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const userId = BigInt(context.authUser.userId);
  const since = parsePeriodStart(args.period);

  // Determine which deck IDs are in scope for this view level.
  // We filter answers by their card's deckId rather than the session's setId/deckId tag.
  // This ensures answers appear at every hierarchy level that contains their deck —
  // e.g. an exam done at a parent set is visible when viewing any child set.
  let cardFilter: object | undefined;
  if (args.deckId) {
    cardFilter = { deckId: BigInt(args.deckId) };
  } else if (args.setId) {
    const allSetIds = await getDescendantSetIds(BigInt(args.setId), userId);
    const deckRows = await prisma.deck.findMany({
      where: { deckSetId: { in: allSetIds }, userId },
      select: { id: true },
    });
    if (deckRows.length === 0) {
      return { totalAnswered: 0, correctCount: 0, pctCorrect: 0, avgTimeSecs: 0, sessionCount: 0, answers: [] };
    }
    cardFilter = { deckId: { in: deckRows.map((d) => d.id) } };
  }

  // Query answers directly; use session relation for user/date scoping.
  const rawAnswers = await prisma.examAnswer.findMany({
    where: {
      ...(cardFilter ? { card: cardFilter } : {}),
      session: {
        userId,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
    },
    include: {
      session: { select: { id: true, createdAt: true } },
      card: { include: { deck: { select: { id: true, name: true } } } },
    },
    orderBy: [{ sessionId: "desc" }, { id: "asc" }],
    take: 2000,
  });

  const sessionIds = new Set(rawAnswers.map((a) => a.sessionId.toString()));

  const allAnswers = rawAnswers.map((a) => ({
    cardId: a.cardId?.toString() ?? undefined,
    front: a.front,
    wasCorrect: a.wasCorrect,
    timeSecs: a.timeSecs,
    sessionDate: a.session.createdAt.toISOString(),
    selectedOptionId: a.selectedOptionId ?? undefined,
    deckId: a.card?.deck.id.toString() ?? undefined,
    deckName: a.card?.deck.name ?? undefined,
  }));

  const totalAnswered = allAnswers.length;
  const correctCount = allAnswers.filter((a) => a.wasCorrect).length;
  const totalTime = allAnswers.reduce((sum, a) => sum + a.timeSecs, 0);

  return {
    totalAnswered,
    correctCount,
    pctCorrect: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 1000) / 10 : 0,
    avgTimeSecs: totalAnswered > 0 ? Math.round((totalTime / totalAnswered) * 10) / 10 : 0,
    sessionCount: sessionIds.size,
    answers: allAnswers,
  };
};

