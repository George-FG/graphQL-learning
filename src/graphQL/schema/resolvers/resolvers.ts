import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { Resolvers } from "@generated/generated";
import {
  REFRESH_TOKEN_TTL_MS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from "../../../lib/auth";
import { parseApkgFile } from "../../../lib/apkgParser";
import { generateMCQSets, stripHtml, type MCQSet } from "../../../lib/llmDistractors";
import type { GraphQLContext } from "@generated/context";

const REFRESH_COOKIE_NAME = "refreshToken";

// ---------------------------------------------------------------------------
// Shared quiz-building helpers
// ---------------------------------------------------------------------------

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

/** Deterministic shuffle of an array using a numeric seed (for random exam order). */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = Math.abs(seed) % (2 ** 31);
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

type CardForQuiz = {
  id: bigint;
  front: string;
  back: string;
  position: number;
  distractors: string | null;
};

/** Build MCQ quiz questions for the given cards, using LLM (with caching) for
 *  distractors and falling back to position-based pool if LLM is unavailable.
 *  Caching is stored on the card row so the same card produces the same
 *  question regardless of which deck or set it is accessed through. */
async function buildQuizQuestions(
  questionCards: CardForQuiz[],
  distractorPool: CardForQuiz[],
): Promise<{ cardId: string; front: string; options: { id: string; text: string }[]; correctOptionId: string }[]> {
  function positionDistractors(card: { id: bigint; position: number }, count: number): string[] {
    const nearby = distractorPool.filter(
      (c) => Math.abs(c.position - card.position) <= 20 && c.id !== card.id
    );
    const far = distractorPool.filter((c) => !nearby.includes(c) && c.id !== card.id);
    return [...shuffle(nearby), ...shuffle(far)].slice(0, count).map((c) => stripHtml(c.back));
  }

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

  const llmCache: Record<string, MCQSet> = {};
  if (uncachedCards.length > 0) {
    const batchResult = await generateMCQSets(
      uncachedCards.map((c) => ({ id: c.id.toString(), front: c.front, correctAnswer: c.back }))
    );
    if (batchResult.ok) {
      Object.assign(llmCache, batchResult.results);
      for (const card of uncachedCards) {
        const mcq = llmCache[card.id.toString()];
        if (mcq) {
          prisma.card
            .update({ where: { id: card.id }, data: { distractors: JSON.stringify(mcq) } })
            .catch(() => {/* non-critical */});
        }
      }
    }
  }

  return questionCards.map((card) => {
    const idStr = card.id.toString();
    let mcq: MCQSet | null = null;
    if (llmCache[idStr]) {
      mcq = llmCache[idStr];
    } else if (card.distractors) {
      try {
        const cached = JSON.parse(card.distractors) as unknown;
        if (
          typeof cached === "object" && cached !== null &&
          "question" in (cached as object) && "correct" in (cached as object) &&
          Array.isArray((cached as MCQSet).distractors) &&
          (cached as MCQSet).distractors.length >= 3
        ) {
          mcq = cached as MCQSet;
        }
      } catch {/* fall through */}
    }

    const correctText = mcq ? mcq.correct : stripHtml(card.back);
    const distractorTexts = mcq ? mcq.distractors.slice(0, 3) : positionDistractors(card, 3);
    const distractorOptions = distractorTexts.map((text, i) => ({ id: `${idStr}_d${i}`, text }));
    const allOptions = seededShuffle([{ id: idStr, text: correctText }, ...distractorOptions], card.id);

    return {
      cardId: idStr,
      front: mcq ? mcq.question : stripHtml(card.front),
      options: allOptions,
      correctOptionId: idStr,
    };
  });
}

/** Return all DeckSet IDs in the subtree rooted at rootSetId (inclusive). */
async function getDescendantSetIds(rootSetId: bigint, userId: bigint): Promise<bigint[]> {
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    WITH RECURSIVE set_tree AS (
      SELECT id FROM deck_sets WHERE id = ${rootSetId} AND user_id = ${userId}
      UNION ALL
      SELECT ds.id FROM deck_sets ds
      INNER JOIN set_tree st ON ds.parent_id = st.id
    )
    SELECT id FROM set_tree
  `;
  return rows.map((r) => r.id);
}

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

    browse: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

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

      // Compute total card counts (all cards under each set, recursively) in one CTE query
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

      let questionCards: CardForQuiz[];
      if (args.seed != null) {
        // Random mode: fetch all IDs, shuffle deterministically, then page
        const allIds = await prisma.card.findMany({
          where: { deckId: BigInt(args.deckId) },
          select: { id: true },
          orderBy: { id: "asc" },
        });
        const pageIds = shuffleWithSeed(allIds.map((r) => r.id), args.seed).slice(offset, offset + BATCH);
        if (pageIds.length === 0) return { questions: [], totalCards };
        const fetched = await prisma.card.findMany({ where: { id: { in: pageIds } } });
        const cardMap = new Map(fetched.map((c) => [c.id.toString(), c]));
        questionCards = pageIds.map((id) => cardMap.get(id.toString())!).filter(Boolean);
      } else {
        questionCards = await prisma.card.findMany({
          where: { deckId: BigInt(args.deckId) },
          orderBy: { position: "asc" },
          skip: offset,
          take: BATCH,
        });
      }

      if (questionCards.length === 0) {
        return { questions: [], totalCards };
      }

      const distractorPool = await prisma.card.findMany({
        where: {
          deckId: BigInt(args.deckId),
          id: { notIn: questionCards.map((c) => c.id) },
        },
        orderBy: { position: "asc" },
        take: 200,
      });

      const questions = await buildQuizQuestions(questionCards, distractorPool);
      return { questions, totalCards };
    },

    quizQuestionsForSet: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const userId = BigInt(context.authUser.userId);
      const setId = BigInt(args.setId);

      const allSetIds = await getDescendantSetIds(setId, userId);
      if (allSetIds.length === 0) throw new Error("Set not found");

      const deckRows = await prisma.deck.findMany({
        where: { deckSetId: { in: allSetIds }, userId },
        select: { id: true },
      });
      const deckIds = deckRows.map((d) => d.id);
      if (deckIds.length === 0) return { questions: [], totalCards: 0 };

      const BATCH = Math.min(2, Math.max(1, args.limit ?? 2));
      const offset = Math.max(0, args.offset ?? 0);

      const totalCards = await prisma.card.count({ where: { deckId: { in: deckIds } } });

      let questionCards: CardForQuiz[];
      if (args.seed != null) {
        const allIds = await prisma.card.findMany({
          where: { deckId: { in: deckIds } },
          select: { id: true },
          orderBy: { id: "asc" },
        });
        const pageIds = shuffleWithSeed(allIds.map((r) => r.id), args.seed).slice(offset, offset + BATCH);
        if (pageIds.length === 0) return { questions: [], totalCards };
        const fetched = await prisma.card.findMany({ where: { id: { in: pageIds } } });
        const cardMap = new Map(fetched.map((c) => [c.id.toString(), c]));
        questionCards = pageIds.map((id) => cardMap.get(id.toString())!).filter(Boolean);
      } else {
        questionCards = await prisma.card.findMany({
          where: { deckId: { in: deckIds } },
          orderBy: [{ deckId: "asc" }, { position: "asc" }],
          skip: offset,
          take: BATCH,
        });
      }

      if (questionCards.length === 0) return { questions: [], totalCards };

      const distractorPool = await prisma.card.findMany({
        where: { deckId: { in: deckIds }, id: { notIn: questionCards.map((c) => c.id) } },
        orderBy: [{ deckId: "asc" }, { position: "asc" }],
        take: 200,
      });

      const questions = await buildQuizQuestions(questionCards, distractorPool);
      return { questions, totalCards };
    },

    examHistory: async (_parent, args, context) => {
      if (!context.authUser) throw new Error("Not authenticated");
      const userId = BigInt(context.authUser.userId);

      // Period filter → createdAt >=
      const now = new Date();
      let since: Date | undefined;
      switch (args.period ?? "all") {
        case "today": {
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        }
        case "24h": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case "7d":  since = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000); break;
        case "30d": since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        default: since = undefined;
      }

      const sessions = await prisma.examSession.findMany({
        where: {
          userId,
          ...(args.deckId ? { deckId: BigInt(args.deckId) } : {}),
          ...(args.setId  ? { setId:  BigInt(args.setId)  } : {}),
          ...(!args.deckId && !args.setId ? {} : {}),
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
    },

    examSessionDetail: async (_parent, args, context) => {
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
    },

    examAggregate: async (_parent, args, context) => {
      if (!context.authUser) throw new Error("Not authenticated");
      const userId = BigInt(context.authUser.userId);

      const now = new Date();
      let since: Date | undefined;
      switch (args.period ?? "all") {
        case "today": {
          since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        }
        case "24h": since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case "7d":  since = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000); break;
        case "30d": since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case "week": {
          const d = new Date(now);
          d.setDate(d.getDate() - d.getDay());
          d.setHours(0, 0, 0, 0);
          since = d;
          break;
        }
        case "month": {
          since = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        }
        default: since = undefined;
      }

      const sessions = await prisma.examSession.findMany({
        where: {
          userId,
          ...(args.deckId ? { deckId: BigInt(args.deckId) } : {}),
          ...(args.setId  ? { setId:  BigInt(args.setId)  } : {}),
          ...(since ? { createdAt: { gte: since } } : {}),
          answers: { some: {} },  // exclude sessions with no recorded answers
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
    },

    cardQuestion: async (_parent, args, context) => {
      if (!context.authUser) throw new Error("Not authenticated");
      const userId = BigInt(context.authUser.userId);

      // Fetch the card (verify ownership via deck → user)
      const card = await prisma.card.findFirst({
        where: {
          id: BigInt(args.cardId),
          deck: { userId },
        },
        select: { id: true, front: true, back: true, position: true, distractors: true, deckId: true },
      });
      if (!card) return undefined;

      // Fetch sibling cards from the same deck as the distractor pool
      const siblings = await prisma.card.findMany({
        where: { deckId: card.deckId, id: { not: card.id } },
        select: { id: true, front: true, back: true, position: true, distractors: true },
        take: 50,
      });

      const [question] = await buildQuizQuestions([card], siblings);
      return question ?? undefined;
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

    uploadApkg: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const parsedDecks = parseApkgFile(args.fileContent);
      if (parsedDecks.length === 0) {
        throw new Error("No valid decks found in the .apkg file");
      }

      const userId = BigInt(context.authUser.userId);
      let decksCreated = 0;

      for (const parsed of parsedDecks) {
        let cards = parsed.cards;

        if (args.shuffle) {
          for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
          }
        }

        // deckPath: e.g. ["Medicine", "Year 1", "Week 02_ COPD"]
        // All segments except last are sets; last is the deck name
        const setPath = parsed.deckPath.slice(0, -1);
        const deckName = parsed.deckPath[parsed.deckPath.length - 1];

        // Find or create each set level in sequence
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

    deleteDeckSet: async (_parent, args, context) => {
      if (!context.authUser) {
        throw new Error("Not authenticated");
      }

      const set = await prisma.deckSet.findFirst({
        where: {
          id: BigInt(args.id),
          userId: BigInt(context.authUser.userId),
        },
      });

      if (!set) {
        throw new Error("Set not found");
      }

      // Cascade in DB handles all children sets and decks
      await prisma.deckSet.delete({ where: { id: set.id } });
      return true;
    },

    startExamSession: async (_parent, args, context) => {
      if (!context.authUser) throw new Error("Not authenticated");
      const session = await prisma.examSession.create({
        data: {
          userId: BigInt(context.authUser.userId),
          deckId: args.deckId ? BigInt(args.deckId) : null,
          setId: args.setId ? BigInt(args.setId) : null,
          seed: args.seed ?? null,
          totalCards: args.totalCards,
        },
      });
      return session.id.toString();
    },

    recordExamAnswer: async (_parent, args, context) => {
      if (!context.authUser) throw new Error("Not authenticated");
      const session = await prisma.examSession.findFirst({
        where: { id: BigInt(args.sessionId), userId: BigInt(context.authUser.userId) },
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
    },
  },
};