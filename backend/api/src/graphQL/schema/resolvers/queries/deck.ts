import { prisma } from "../../../../lib/prisma";
import type { QueryResolver } from "../lib/resolverTypes";

export const deck: QueryResolver<"deck"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const PAGE_SIZE = 10;
  const offset = Math.max(0, args.offset ?? 0);
  const limit = Math.min(50, args.limit ?? PAGE_SIZE);

  const result = await prisma.deck.findFirst({
    where: {
      id: BigInt(args.id),
      userId: BigInt(context.authUser.userId),
    },
    include: {
      cards: {
        orderBy: { position: "asc" },
        skip: offset,
        take: limit,
      },
      _count: { select: { cards: true } },
    },
  });

  if (!result) return undefined;

  return {
    id: result.id.toString(),
    name: result.name,
    createdAt: result.createdAt.toISOString(),
    cardCount: result._count.cards,
    cards: result.cards.map((c) => ({
      id: c.id.toString(),
      front: c.front,
      back: c.back,
      position: c.position,
    })),
  };
};
