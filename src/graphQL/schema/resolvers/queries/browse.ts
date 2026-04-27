import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import type { QueryResolver } from "../lib/resolverTypes";

export const browse: QueryResolver<"browse"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const userId = BigInt(context.authUser.userId);
  const parentSetId = args.parentSetId ? BigInt(args.parentSetId) : null;

  const [sets, decks] = await Promise.all([
    prisma.deckSet.findMany({
      where: { userId, parentId: parentSetId },
      orderBy: { name: "asc" },
      include: { _count: { select: { children: true, decks: true } } },
    }),
    prisma.deck.findMany({
      where: { userId, deckSetId: parentSetId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { cards: true } } },
    }),
  ]);

  let cardCountMap = new Map<string, number>();
  if (sets.length > 0) {
    const setIds = sets.map((s) => s.id);
    const countRows = await prisma.$queryRaw<{ root_id: bigint; card_count: bigint }[]>`
      WITH RECURSIVE set_tree AS (
        SELECT id, id AS root_id FROM deck_sets WHERE id IN (${Prisma.join(setIds)})
        UNION ALL
        SELECT ds.id, st.root_id FROM deck_sets ds
        INNER JOIN set_tree st ON ds.parent_id = st.id
      )
      SELECT st.root_id, COUNT(c.id) AS card_count
      FROM set_tree st
      LEFT JOIN decks d ON d.deck_set_id = st.id
      LEFT JOIN cards c ON c.deck_id = d.id
      GROUP BY st.root_id
    `;
    for (const row of countRows) {
      cardCountMap.set(row.root_id.toString(), Number(row.card_count));
    }
  }

  return {
    sets: sets.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      createdAt: s.createdAt.toISOString(),
      parentId: s.parentId?.toString() ?? undefined,
      childSetCount: s._count.children,
      deckCount: s._count.decks,
      totalCardCount: cardCountMap.get(s.id.toString()) ?? 0,
    })),
    decks: decks.map((d) => ({
      id: d.id.toString(),
      name: d.name,
      createdAt: d.createdAt.toISOString(),
      cardCount: d._count.cards,
      cards: [],
    })),
  };
};
