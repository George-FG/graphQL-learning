import bcrypt from "bcrypt";
import { prisma } from "../../../lib/prisma";
import type { Resolvers } from "@generated/generated";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../../lib/auth";
import { parseAnkiFile } from "../../../lib/ankiParser";
import { generateMCQSets, stripHtml, type MCQSet } from "../../../lib/llmDistractors";
import type { GraphQLContext } from "@generated/context";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/",
};

function toGraphQLUser(user: {
  id: bigint;
  username: string;
}) {
  return {
    ID: user.id.toString(),
    username: user.username,
  };
}

async function createSession(
  user: {
    id: bigint;
    username: string;
  },
  context: GraphQLContext
) {
  const accessToken = signAccessToken({
    userId: user.id.toString(),
    username: user.username,
  });

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  context.res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, refreshCookieOptions);

  return {
    accessToken,
    User: toGraphQLUser(user),
  };
}

export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    getUserByID: async (_parent, args) => {
      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(args.ID),
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return toGraphQLUser(user);
    },

    me: async (_parent, _args, context) => {
      if (!context.authUser) {
        return undefined;
      }

      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(context.authUser.userId),
        },
      });

      if (!user) {
        return undefined;
      }

      return toGraphQLUser(user);
    },

    myDecks: async (_parent, _args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const decks = await prisma.deck.findMany({
        where: { userId: BigInt(context.authUser.userId) },
        include: { _count: { select: { cards: true } } },
        orderBy: { createdAt: "desc" },
      });

      return decks.map((deck) => ({
        id: deck.id.toString(),
        name: deck.name,
        createdAt: deck.createdAt.toISOString(),
        cardCount: deck._count.cards,
        cards: [],
      }));
    },

    deck: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const PAGE_SIZE = 10;
      const offset = Math.max(0, args.offset ?? 0);
      const limit = Math.min(50, args.limit ?? PAGE_SIZE);

      const deck = await prisma.deck.findFirst({
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

      if (!deck) return undefined;

      return {
        id: deck.id.toString(),
        name: deck.name,
        createdAt: deck.createdAt.toISOString(),
        cardCount: deck._count.cards,
        cards: deck.cards.map((c) => ({
          id: c.id.toString(),
          front: c.front,
          back: c.back,
          position: c.position,
        })),
      };
    },

    quizQuestions: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const BATCH = Math.min(2, Math.max(1, args.limit ?? 2));
      const offset = Math.max(0, args.offset ?? 0);

      const deckMeta = await prisma.deck.findFirst({
        where: {
          id: BigInt(args.deckId),
          userId: BigInt(context.authUser.userId),
        },
        include: { _count: { select: { cards: true } } },
      });

      if (!deckMeta) throw new Error("Deck not found");

      const totalCards = deckMeta._count.cards;

      const questionCards = await prisma.card.findMany({
        where: { deckId: BigInt(args.deckId) },
        orderBy: { position: "asc" },
        skip: offset,
        take: BATCH,
      });

      if (questionCards.length === 0) {
        return { questions: [], totalCards };
      }

      // Fallback pool: position-based distractors (used when LLM is unavailable
      // or for cards that haven't been cached yet during the LLM call)
      const distractorPool = await prisma.card.findMany({
        where: {
          deckId: BigInt(args.deckId),
          id: { notIn: questionCards.map((c) => c.id) },
        },
        orderBy: { position: "asc" },
        take: 200,
      });

      function shuffle<T>(arr: T[]): T[] {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      /** Deterministic shuffle seeded by card ID — same card always gives the same option order. */
      function seededShuffle<T>(arr: T[], seed: bigint): T[] {
        const a = [...arr];
        // Simple LCG using card id as seed
        let s = Number(seed % BigInt(2 ** 31));
        const rand = () => {
          s = (s * 1664525 + 1013904223) & 0x7fffffff;
          return s / 0x7fffffff;
        };
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      function positionDistractors(
        card: { id: bigint; position: number },
        count: number
      ): string[] {
        const nearby = distractorPool.filter(
          (c) => Math.abs(c.position - card.position) <= 20 && c.id !== card.id
        );
        const far = distractorPool.filter(
          (c) => !nearby.includes(c) && c.id !== card.id
        );
        return [...shuffle(nearby), ...shuffle(far)]
          .slice(0, count)
          .map((c) => stripHtml(c.back));
      }

      // Determine which cards need LLM generation (cache miss)
      const uncachedCards = questionCards.filter((c) => {
        if (!c.distractors) return true;
        try {
          const parsed = JSON.parse(c.distractors) as unknown;
          return (
            typeof parsed !== "object" ||
            parsed === null ||
            !("question" in (parsed as object)) ||
            !("correct" in (parsed as object)) ||
            !Array.isArray((parsed as MCQSet).distractors) ||
            (parsed as MCQSet).distractors.length < 3
          );
        } catch { return true; }
      });

      // One LLM request per uncached card (sequential)
      const llmCache: Record<string, MCQSet> = {};
      if (uncachedCards.length > 0) {
        const batchResult = await generateMCQSets(
          uncachedCards.map((c) => ({
            id: c.id.toString(),
            front: c.front,
            correctAnswer: c.back,
          }))
        );

        if (batchResult.ok) {
          Object.assign(llmCache, batchResult.results);

          // Persist new cache entries (fire-and-forget)
          for (const card of uncachedCards) {
            const mcq = llmCache[card.id.toString()];
            if (mcq) {
              prisma.card
                .update({
                  where: { id: card.id },
                  data: { distractors: JSON.stringify(mcq) },
                })
                .catch(() => {/* non-critical */});
            }
          }
        }
      }

      // Build final questions using LLM results where available, fallback otherwise
      const questions = questionCards.map((card) => {
        const idStr = card.id.toString();

        // Resolve MCQSet: LLM cache > DB cache > position fallback
        let mcq: MCQSet | null = null;

        if (llmCache[idStr]) {
          mcq = llmCache[idStr];
        } else if (card.distractors) {
          try {
            const cached = JSON.parse(card.distractors) as unknown;
            if (
              typeof cached === "object" &&
              cached !== null &&
              "question" in (cached as object) &&
              "correct" in (cached as object) &&
              Array.isArray((cached as MCQSet).distractors) &&
              (cached as MCQSet).distractors.length >= 3
            ) {
              mcq = cached as MCQSet;
            }
          } catch {/* fall through */}
        }

        let correctText: string;
        let distractorTexts: string[];

        if (mcq) {
          correctText = mcq.correct;
          distractorTexts = mcq.distractors.slice(0, 3);
        } else {
          correctText = stripHtml(card.back);
          distractorTexts = positionDistractors(card, 3);
        }

        const distractorOptions = distractorTexts.map((text, i) => ({
          id: `${idStr}_d${i}`,
          text,
        }));

        const allOptions = seededShuffle([
          { id: idStr, text: correctText },
          ...distractorOptions,
        ], card.id);

        return {
          cardId: idStr,
          front: mcq ? mcq.question : stripHtml(card.front),
          options: allOptions,
          correctOptionId: idStr,
        };
      });

      return { questions, totalCards };
    },
  },

  Mutation: {
    signUp: async (_parent, args, context) => {
      const username = args.username.trim();

      const existingUser = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (existingUser) {
        throw new Error("Username already exists");
      }

      const passwordHash = await bcrypt.hash(args.password, 12);

      const user = await prisma.user.create({
        data: {
          username,
          passwordHash,
        },
      });

      return createSession(user, context);
    },

    login: async (_parent, args, context) => {
      const username = args.username.trim();

      const user = await prisma.user.findUnique({
        where: {
          username,
        },
      });

      if (!user) {
        throw new Error("Invalid username or password");
      }

      const passwordMatches = await bcrypt.compare(
        args.password,
        user.passwordHash
      );

      if (!passwordMatches) {
        throw new Error("Invalid username or password");
      }

      return createSession(user, context);
    },

    refreshSession: async (_parent, _args, context) => {
      const rawRefreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME] as
        | string
        | undefined;

      if (!rawRefreshToken) {
        throw new Error("No refresh token");
      }

      const tokenHash = hashRefreshToken(rawRefreshToken);

      const session = await prisma.userSession.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new Error("Invalid refresh token");
      }

      if (session.revokedAt) {
        context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new Error("Session revoked");
      }

      if (session.expiresAt <= new Date()) {
        await prisma.userSession.delete({
          where: {
            tokenHash,
          },
        });

        context.res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
        throw new Error("Refresh token expired");
      }

      const nextRawRefreshToken = generateRefreshToken();
      const nextTokenHash = hashRefreshToken(nextRawRefreshToken);
      const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

      await prisma.userSession.update({
        where: {
          tokenHash,
        },
        data: {
          tokenHash: nextTokenHash,
          expiresAt: nextExpiresAt,
          lastUsedAt: new Date(),
        },
      });

      context.res.cookie(
        REFRESH_COOKIE_NAME,
        nextRawRefreshToken,
        refreshCookieOptions
      );

      return {
        accessToken: signAccessToken({
          userId: session.user.id.toString(),
          username: session.user.username,
        }),
        User: toGraphQLUser(session.user),
      };
    },

    logout: async (_parent, _args, context) => {
      const rawRefreshToken = context.req.cookies?.[REFRESH_COOKIE_NAME] as
        | string
        | undefined;

      if (rawRefreshToken) {
        const tokenHash = hashRefreshToken(rawRefreshToken);

        await prisma.userSession.deleteMany({
          where: {
            tokenHash,
          },
        });
      }

      context.res.clearCookie(REFRESH_COOKIE_NAME, {
        path: "/",
      });

      return true;
    },

    uploadDeck: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      let cards = parseAnkiFile(args.fileContent);
      if (cards.length === 0) {
        throw new Error("No valid cards found in the uploaded file");
      }

      if (args.shuffle) {
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cards[i], cards[j]] = [cards[j], cards[i]];
        }
      }

      const deck = await prisma.deck.create({
        data: {
          userId: BigInt(context.authUser.userId),
          name: args.name,
          cards: {
            create: cards.map((card, index) => ({
              front: card.front,
              back: card.back,
              position: index,
            })),
          },
        },
        include: {
          _count: { select: { cards: true } },
        },
      });

      return {
        id: deck.id.toString(),
        name: deck.name,
        createdAt: deck.createdAt.toISOString(),
        cardCount: deck._count.cards,
        cards: [],
      };
    },

    deleteDeck: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const deck = await prisma.deck.findFirst({
        where: {
          id: BigInt(args.id),
          userId: BigInt(context.authUser.userId),
        },
      });

      if (!deck) {
        throw new Error("Deck not found");
      }

      // Explicitly clear LLM cache before deletion (cascade would remove the
      // rows anyway, but this makes the intent explicit and future-proof).
      await prisma.card.updateMany({
        where: { deckId: deck.id },
        data: { distractors: null },
      });

      await prisma.deck.delete({ where: { id: deck.id } });
      return true;
    },
  },
};