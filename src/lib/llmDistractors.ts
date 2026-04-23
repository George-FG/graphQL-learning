/**
 * LLM-powered distractor generator.
 *
 * Provider: Groq (free tier — https://console.groq.com)
 *   Set GROQ_API_KEY in .env
 *   Model: llama-3.3-70b-versatile  (free, fast, high quality)
 *
 * All cards in a batch are sent in ONE request to Groq and all distractors
 * are returned together, minimising latency and API calls.
 *
 * Caching: distractors are cached in the `cards.distractors` column
 * so each card is only sent to the LLM once.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export type CardInput = {
  id: string;
  front: string;
  correctAnswer: string;
};

export type BatchResult =
  | { ok: true; results: Record<string, string[]> }  // id → distractors[]
  | { ok: false; error: string };

/**
 * Send up to `cards.length` questions to the LLM in a single request.
 * Returns a map of card id → 3 distractor strings.
 */
export async function generateDistractorsBatch(
  cards: CardInput[],
  distractorsPerCard = 3
): Promise<BatchResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GROQ_API_KEY not set" };
  }

  if (cards.length === 0) {
    return { ok: true, results: {} };
  }

  const cardList = cards
    .map(
      (c, i) =>
        `Card ${i + 1} [id:${c.id}]\nQuestion: ${stripHtml(c.front)}\nCorrect answer: ${stripHtml(c.correctAnswer)}`
    )
    .join("\n\n");

  const prompt = `You are generating multiple-choice exam distractors for medical student flashcards.

For EACH card below, generate exactly ${distractorsPerCard} WRONG answer options that:
- Are plausible and in the same medical/scientific domain as the question
- Are similar in length and style to the correct answer
- Would genuinely challenge a student (not obviously wrong)
- Are factually incorrect or incomplete compared to the correct answer

${cardList}

Respond with ONLY a JSON object where each key is the card id and the value is an array of ${distractorsPerCard} distractor strings. No explanation, no markdown fences.
Example for 2 cards:
{"id_of_card_1": ["wrong A", "wrong B", "wrong C"], "id_of_card_2": ["wrong D", "wrong E", "wrong F"]}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        // ~80 tokens per card × batch size + overhead
        max_tokens: Math.min(4096, 200 + cards.length * 200),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `Groq API error ${response.status}: ${text}` };
    }

    const json = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const content = json.choices?.[0]?.message?.content?.trim() ?? "";

    const parsed = JSON.parse(content) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Unexpected LLM response format" };
    }

    const results: Record<string, string[]> = {};
    for (const [id, arr] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
        results[id] = (arr as string[]).slice(0, distractorsPerCard);
      }
    }

    return { ok: true, results };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

