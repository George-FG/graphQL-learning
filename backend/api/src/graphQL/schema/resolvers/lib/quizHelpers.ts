import { prisma } from "../../../../lib/prisma";
import { generateMCQSets, stripHtml, type MCQSet } from "../../../../lib/llmDistractors";

export type CardForQuiz = {
  id: bigint;
  front: string;
  back: string;
  position: number;
  distractors: string | null;
};

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deterministic shuffle seeded by card ID — same card always gives the same option order. */
export function seededShuffle<T>(arr: T[], seed: bigint): T[] {
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
export function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
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

/** Build MCQ quiz questions for the given cards, using LLM (with caching) for
 *  distractors and falling back to position-based pool if LLM is unavailable.
 *  Caching is stored on the card row so the same card produces the same
 *  question regardless of which deck or set it is accessed through. */
export async function buildQuizQuestions(
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
export async function getDescendantSetIds(rootSetId: bigint, userId: bigint): Promise<bigint[]> {
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
