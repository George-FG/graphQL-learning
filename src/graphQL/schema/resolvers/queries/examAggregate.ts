import { prisma } from "../../../../lib/prisma";
import { parsePeriodStart } from "../lib/periodFilter";
import type { QueryResolver } from "../lib/resolverTypes";

export const examAggregate: QueryResolver<"examAggregate"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const userId = BigInt(context.authUser.userId);
  const since = parsePeriodStart(args.period);

  const sessions = await prisma.examSession.findMany({
    where: {
      userId,
      ...(args.deckId ? { deckId: BigInt(args.deckId) } : {}),
      ...(args.setId  ? { setId:  BigInt(args.setId)  } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
      answers: { some: {} },
    },
    include: {
      answers: { orderBy: { id: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const allAnswers = sessions.flatMap((s) =>
    s.answers.map((a) => ({
      cardId: a.cardId?.toString() ?? undefined,
      front: a.front,
      wasCorrect: a.wasCorrect,
      timeSecs: a.timeSecs,
      sessionDate: s.createdAt.toISOString(),
      selectedOptionId: a.selectedOptionId ?? undefined,
    }))
  );

  const totalAnswered = allAnswers.length;
  const correctCount = allAnswers.filter((a) => a.wasCorrect).length;
  const totalTime = allAnswers.reduce((sum, a) => sum + a.timeSecs, 0);

  return {
    totalAnswered,
    correctCount,
    pctCorrect: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 1000) / 10 : 0,
    avgTimeSecs: totalAnswered > 0 ? Math.round((totalTime / totalAnswered) * 10) / 10 : 0,
    sessionCount: sessions.length,
    answers: allAnswers,
  };
};
