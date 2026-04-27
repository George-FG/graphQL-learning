import { prisma } from "../../../../lib/prisma";
import type { QueryResolver } from "../lib/resolverTypes";

export const myDecks: QueryResolver<"myDecks"> = async (_parent, _args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const decks = await prisma.deck.findMany({
    where: { userId: BigInt(context.authUser.userId) },
    include: { _count: { select: { cards: true } } },
    orderBy: { createdAt: "desc" },
  });

  return decks.map((d) => ({
    id: d.id.toString(),
    name: d.name,
    createdAt: d.createdAt.toISOString(),
    cardCount: d._count.cards,
    cards: [],
  }));
};
