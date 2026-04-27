import { prisma } from "../../../../lib/prisma";
import type { QueryResolver } from "../lib/resolverTypes";

export const examSessionDetail: QueryResolver<"examSessionDetail"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const session = await prisma.examSession.findFirst({
    where: { id: BigInt(args.id), userId: BigInt(context.authUser.userId) },
    include: {
      answers: { orderBy: { id: "asc" } },
      deck: { select: { name: true } },
      deckSet: { select: { name: true } },
    },
  });
  if (!session) throw new Error("Session not found");

  const answered = session.answers.length;
  const correct = session.answers.filter((a) => a.wasCorrect).length;
  const totalTime = session.answers.reduce((sum, a) => sum + a.timeSecs, 0);

  return {
    id: session.id.toString(),
    createdAt: session.createdAt.toISOString(),
    totalCards: session.totalCards,
    answeredCount: answered,
    correctCount: correct,
    pctCorrect: answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0,
    avgTimeSecs: answered > 0 ? Math.round((totalTime / answered) * 10) / 10 : 0,
    isRandom: session.seed != null,
    sourceName: session.deck?.name ?? session.deckSet?.name ?? "Unknown",
    answers: session.answers.map((a) => ({
      cardId: a.cardId?.toString() ?? undefined,
      front: a.front,
      wasCorrect: a.wasCorrect,
      timeSecs: a.timeSecs,
      selectedOptionId: a.selectedOptionId ?? undefined,
    })),
  };
};
