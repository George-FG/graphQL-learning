import { prisma } from "../../../../lib/prisma";
import { parseApkgFile } from "../../../../lib/apkgParser";
import type { MutationResolver } from "../lib/resolverTypes";

export const uploadApkg: MutationResolver<"uploadApkg"> = async (_parent, args, context) => {
  if (!context.authUser) throw new Error("Not authenticated");

  const parsedDecks = parseApkgFile(args.fileContent);
  if (parsedDecks.length === 0) throw new Error("No valid decks found in the .apkg file");

  const userId = BigInt(context.authUser.userId);
  let decksCreated = 0;

  for (const parsed of parsedDecks) {
    const cards = parsed.cards;

    if (args.shuffle) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
    }

    // All path segments except the last are set names; last is the deck name.
    const setPath = parsed.deckPath.slice(0, -1);
    const deckName = parsed.deckPath[parsed.deckPath.length - 1];

    let currentParentId: bigint | null = null;
    for (const setName of setPath) {
      let set: { id: bigint } | null = await prisma.deckSet.findFirst({
        where: { userId, parentId: currentParentId, name: setName },
      });
      if (!set) {
        set = await prisma.deckSet.create({
          data: { userId, parentId: currentParentId, name: setName },
        });
      }
      currentParentId = set.id;
    }

    await prisma.deck.create({
      data: {
        userId,
        name: deckName,
        deckSetId: currentParentId,
        cards: {
          create: cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            position: index,
          })),
        },
      },
    });

    decksCreated++;
  }

  return decksCreated;
};
