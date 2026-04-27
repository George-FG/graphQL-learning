import { prisma } from "../../../../lib/prisma";
import type { MutationResolver } from "../lib/resolverTypes";

export const recordExamAnswer: MutationResolver<"recordExamAnswer"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const session = await prisma.examSession.findFirst({
    where: {
      id: BigInt(args.sessionId),
      userId: BigInt(context.authUser.userId),
    },
  });
  if (!session) throw new Error("Session not found");

  await prisma.examAnswer.create({
    data: {
      sessionId: BigInt(args.sessionId),
      cardId: args.cardId ? BigInt(args.cardId) : null,
      front: args.front,
      wasCorrect: args.wasCorrect,
      timeSecs: args.timeSecs,
      selectedOptionId: args.selectedOptionId ?? null,
    },
  });

  return true;
};
