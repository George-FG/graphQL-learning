

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

type BatchMCQResponse = {
  mcqs: MCQResponse[];
};

const BATCH_SIZE = 2;

const SYSTEM_PROMPT = `You write multiple-choice questions for exam flashcards.

You will receive one or more numbered flashcards. For each one, generate:
1. A clear, concise exam-style question based on that flashcard's content.
2. The correct answer (copy it verbatim from that flashcard's back).
3. Exactly 3 wrong answers that are plausible but incorrect.

Critical rules:
- Each card's question and all four answers must be derived EXCLUSIVELY from that card's own front and back. Do not use content from any other card.
- Wrong answers must match the type and format of the correct answer (same length, same structure — phrase for phrase, list for list).
- Wrong answers should be close misconceptions, swapped mechanisms, wrong locations, or sibling concepts.
- Do not include explanations or extra text in any field.
- Correct answerer cannot be worked out purely by elimination; all options should be similarly plausible.
- Return only valid JSON: { "mcqs": [ ...one object per card, in order... ] }

The examples below illustrate the required JSON format only. Their content must not appear in your output.

Format example (2 cards):
Card 1 front: "Who founded the city of Constantinople?"
Card 1 back: "Constantine the Great"
Card 2 front: "Cause of the fall of the Western Roman Empire"
Card 2 back: "Combination of military overstretch, economic decline, and barbarian invasions"
Output:
{
  "mcqs": [
    {
      "question": "Who founded the city of Constantinople?",
      "correct": "Constantine the Great",
      "distractors": ["Julius Caesar", "Augustus", "Justinian I"]
    },
    {
      "question": "What caused the fall of the Western Roman Empire?",
      "correct": "Combination of military overstretch, economic decline, and barbarian invasions",
      "distractors": [
        "A single decisive naval defeat that destroyed the Roman fleet",
        "Volcanic eruption that caused widespread famine and depopulation",
        "Democratic revolution that overthrew the imperial system from within"
      ]
    }
  ]
}`;

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildBatchPrompt(cards: CardInput[]): string {
  const lines: string[] = [];
  cards.forEach((card, i) => {
    lines.push(`Card ${i + 1} front: "${stripHtml(card.front)}"`);
    lines.push(`Card ${i + 1} back: "${stripHtml(card.correctAnswer)}"`);
  });
  lines.push("");
  lines.push(
    `Generate one MCQ per card. Return { "mcqs": [ ...${cards.length} objects in order... ] }.`
  );
  return lines.join("\n");
}

async function callGroq(
  userPrompt: string,
  apiKey: string
): Promise<MCQResponse[] | null> {
  console.log("requesting...")
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
      max_tokens: 1600,
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

  let parsed: Partial<BatchMCQResponse>;
  try {
    parsed = JSON.parse(content) as Partial<BatchMCQResponse>;
  } catch (e) {
    console.error("GROQ content is not valid JSON (possibly truncated):", e, "\nRaw content:", content);
    return null;
  }

  if (!Array.isArray(parsed.mcqs) || parsed.mcqs.length === 0) {
    console.error("GROQ response failed validation:", parsed);
    return null;
  }

  const valid: MCQResponse[] = [];
  for (const item of parsed.mcqs) {
    if (
      typeof item.question === "string" &&
      typeof item.correct === "string" &&
      Array.isArray(item.distractors) &&
      item.distractors.length >= 3
    ) {
      valid.push({
        question: item.question,
        correct: item.correct,
        distractors: [item.distractors[0], item.distractors[1], item.distractors[2]],
      });
    }
  }

  return valid.length > 0 ? valid : null;
}

async function fetchMCQBatch(
  cards: CardInput[],
  apiKey: string
): Promise<MCQResponse[] | null> {
  return callGroq(buildBatchPrompt(cards), apiKey);
}

export async function generateMCQSets(
  cards: CardInput[]
): Promise<BatchResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, error: "GROQ_API_KEY not set" };
  if (cards.length === 0) return { ok: true, results: {} };

  const results: Record<string, MCQSet> = {};

  // Process cards in batches of BATCH_SIZE
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    try {
      const mcqs = await fetchMCQBatch(batch, apiKey);
      if (mcqs) {
        batch.forEach((card, idx) => {
          if (mcqs[idx]) results[card.id] = mcqs[idx];
        });
      }
    } catch (e) {
      console.error(`GROQ fetch threw for batch starting at card ${batch[0].id}:`, e);
    }
  }

  return { ok: true, results };
}
