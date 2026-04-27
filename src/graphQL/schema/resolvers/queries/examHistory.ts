import { prisma } from "../../../../lib/prisma";
import { parsePeriodStart } from "../lib/periodFilter";
import type { QueryResolver } from "../lib/resolverTypes";

export const examHistory: QueryResolver<"examHistory"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const userId = BigInt(context.authUser.userId);
  const since = parsePeriodStart(args.period);

  const sessions = await prisma.examSession.findMany({
    where: {
      userId,
      ...(args.deckId ? { deckId: BigInt(args.deckId) } : {}),
      ...(args.setId  ? { setId:  BigInt(args.setId)  } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    include: {
      answers: { select: { wasCorrect: true, timeSecs: true } },
      deck: { select: { name: true } },
      deckSet: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return sessions.map((s) => {
    const answered = s.answers.length;
    const correct = s.answers.filter((a) => a.wasCorrect).length;
    const totalTime = s.answers.reduce((sum, a) => sum + a.timeSecs, 0);
    return {
      id: s.id.toString(),
      createdAt: s.createdAt.toISOString(),
      totalCards: s.totalCards,
      answeredCount: answered,
      correctCount: correct,
      pctCorrect: answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0,
      avgTimeSecs: answered > 0 ? Math.round((totalTime / answered) * 10) / 10 : 0,
      isRandom: s.seed != null,
      sourceName: s.deck?.name ?? s.deckSet?.name ?? "Unknown",
    };
  });
};
