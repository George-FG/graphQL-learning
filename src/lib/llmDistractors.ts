

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export type CardInput = {
  id: string;
  front: string;
  correctAnswer: string;
};

export type MCQSet = {
  question: string;
  correct: string;
  distractors: [string, string, string];
};

export type BatchResult =
  | { ok: true; results: Record<string, MCQSet> }
  | { ok: false; error: string };

type MCQResponse = {
  question: string;
  correct: string;
  distractors: [string, string, string];
};

const SYSTEM_PROMPT = `You write multiple-choice questions for exam flashcards.

Given a flashcard front and back, generate:
1. A clear, concise exam-style question based on the flashcard content.
2. The correct answer (copy it verbatim from the flashcard back).
3. Exactly 3 wrong answers that are plausible but incorrect.

Rules:
- The question must be directly answerable by the correct answer.
- All four answers (correct + 3 wrong) must be derived exclusively from the flashcard content you are given. Do not borrow, adapt, or reference content from anywhere else, including these examples.
- Wrong answers must match the type and format of the correct answer (same length, same structure — phrase for phrase, list for list).
- Wrong answers should be close misconceptions, swapped mechanisms, wrong locations, or sibling concepts.
- Do not include explanations or extra text in any field.
- Return only valid JSON matching the schema.

The examples below illustrate the required JSON format only. Their content must not appear in your output.

Format example 1 (short phrase answer):
Flashcard front: "Who founded the city of Constantinople?"
Flashcard back: "Constantine the Great"
Output:
{
  "question": "Who founded the city of Constantinople?",
  "correct": "Constantine the Great",
  "distractors": [
    "Julius Caesar",
    "Augustus",
    "Justinian I"
  ]
}

Format example 2 (sentence answer):
Flashcard front: "Cause of the fall of the Western Roman Empire"
Flashcard back: "Combination of military overstretch, economic decline, and barbarian invasions"
Output:
{
  "question": "What caused the fall of the Western Roman Empire?",
  "correct": "Combination of military overstretch, economic decline, and barbarian invasions",
  "distractors": [
    "A single decisive naval defeat that destroyed the Roman fleet",
    "Volcanic eruption that caused widespread famine and depopulation",
    "Democratic revolution that overthrew the imperial system from within"
  ]
}`;

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildUserPrompt(card: CardInput): string {
  const front = stripHtml(card.front);
  const back = stripHtml(card.correctAnswer);

  return [
    `Flashcard front: "${front}"`,
    `Flashcard back: "${back}"`,
    ``,
    `Generate a multiple-choice question with one correct answer and 3 wrong answers.`,
  ].join("\n");
}

async function callGroq(
  userPrompt: string,
  apiKey: string
): Promise<MCQResponse | null> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });


  if (!response.ok) {
    const errorBody = await response.text().catch(() => "(could not read body)");
    console.error("GROQ request failed: ", response.status, response.statusText, errorBody);
    return null;
  }

  let json: { choices?: { message?: { content?: string } }[] };
  try {
    json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  } catch (e) {
    console.error("GROQ response body is not valid JSON:", e);
    return null;
  }

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error("GROQ response missing content");
    return null;
  }

  let parsed: Partial<MCQResponse>;
  try {
    parsed = JSON.parse(content) as Partial<MCQResponse>;
  } catch (e) {
    console.error("GROQ content is not valid JSON (possibly truncated):", e, "\nRaw content:", content);
    return null;
  }
  if (
    typeof parsed.question !== "string" ||
    typeof parsed.correct !== "string" ||
    !Array.isArray(parsed.distractors) ||
    parsed.distractors.length < 3
  ) {
    console.error("GROQ response failed validation:", parsed);
    return null;
  }

  return {
    question: parsed.question,
    correct: parsed.correct,
    distractors: [parsed.distractors[0], parsed.distractors[1], parsed.distractors[2]],
  };
}

async function fetchMCQSet(
  card: CardInput,
  apiKey: string
): Promise<MCQSet | null> {
  return callGroq(buildUserPrompt(card), apiKey);
}

export async function generateMCQSets(
  cards: CardInput[]
): Promise<BatchResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: "GROQ_API_KEY not set" };
  if (cards.length === 0) return { ok: true, results: {} };

  const results: Record<string, MCQSet> = {};

  for (const card of cards) {
    try {
      const mcq = await fetchMCQSet(card, apiKey);
      if (mcq) results[card.id] = mcq;
    } catch (e) {
      console.error(`GROQ fetch threw for card ${card.id}:`, e);
    }
  }

  return { ok: true, results };
}
