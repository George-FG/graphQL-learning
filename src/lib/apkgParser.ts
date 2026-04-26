import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import * as fzstd from "fzstd";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type ParsedDeck = {
  /** Full path from root to this deck, e.g. ["Medicine", "Year 1", "Week 02_ COPD"] */
  deckPath: string[];
  cards: { front: string; back: string }[];
};

interface AnkiDeckEntry {
  id: number | string;
  name: string;
}

interface AnkiColRow {
  decks: string | null;
}

interface AnkiDeckTableRow {
  id: number | string;
  name: string;
}

interface AnkiNoteRow {
  id: number;
  flds: string;
}

interface AnkiCardRow {
  nid: number;
  did: number;
}

/**
 * Parses an Anki .apkg file (base64-encoded) into a list of decks, each with
 * its full path hierarchy and cards. The .apkg is a zip containing a SQLite
 * collection database (collection.anki2 or collection.anki21).
 *
 * Deck paths use "::" as Anki's native hierarchy separator:
 *   "Medicine::Year 1::Week 02_ COPD" → ["Medicine", "Year 1", "Week 02_ COPD"]
 *
 * Only leaf decks (those with cards) are returned.
 */
export function parseApkgFile(base64Content: string): ParsedDeck[] {
  const buffer = Buffer.from(base64Content, "base64");
  const zip = new AdmZip(buffer);

  // Find the SQLite collection:
  // - .anki21b = zstd-compressed SQLite (Anki 2.1.50+)
  // - .anki21  = plain SQLite (Anki 2.1.x)
  // - .anki2   = plain SQLite (legacy / compatibility stub in newer exports)
  const anki21b = zip.getEntry("collection.anki21b");
  const anki21  = zip.getEntry("collection.anki21");
  const anki2   = zip.getEntry("collection.anki2");

  // Prefer .anki21b > .anki21 > .anki2
  // But skip .anki2 when a newer format also exists — newer Anki puts a stub
  // .anki2 with a "please update" placeholder note, not real data.
  const entry = anki21b ?? anki21 ?? anki2;

  if (!entry) {
    throw new Error(
      "Invalid .apkg file: no SQLite collection found (expected collection.anki21b, collection.anki21, or collection.anki2)"
    );
  }

  // Decompress zstd if needed, then write to a temp file (better-sqlite3 needs a path)
  let dbBytes = entry.getData();
  if (entry.entryName.endsWith(".anki21b")) {
    dbBytes = Buffer.from(fzstd.decompress(dbBytes));
  }
  const tmpPath = path.join(
    os.tmpdir(),
    `anki_${Date.now()}_${Math.random().toString(36).slice(2)}.db`
  );

  try {
    fs.writeFileSync(tmpPath, dbBytes);

    const db = new Database(tmpPath, { readonly: true });

    // col table has one row; decks column is a JSON map of id → deck object
    // Newer Anki (2.1.28+) may store decks in a separate `decks` table instead.
    let decksMap: Record<string, AnkiDeckEntry> = {};
    try {
      const colRow = db.prepare("SELECT decks FROM col").get() as AnkiColRow | undefined;
      if (colRow?.decks) {
        decksMap = JSON.parse(colRow.decks) as Record<string, AnkiDeckEntry>;
      }
    } catch { /* fall through to decks table */ }

    // If col.decks is empty or only contains the built-in Default deck, try the
    // newer `decks` table introduced in Anki 2.1.28.
    const hasNonDefault = Object.values(decksMap).some((d) => d.name !== "Default");
    if (!hasNonDefault) {
      try {
        const deckRows = db
          .prepare("SELECT id, name FROM decks")
          .all() as AnkiDeckTableRow[];
        for (const row of deckRows) {
          decksMap[row.id.toString()] = { id: row.id, name: row.name };
        }
      } catch { /* table doesn't exist in this schema version */ }
    }

    // notes table: id, flds (fields joined by \x1f unit separator)
    const notes = db
      .prepare("SELECT id, flds FROM notes")
      .all() as AnkiNoteRow[];

    // Build note id → { front, back } map
    // Field[0] = front, field[1] = back for all standard Basic/Cloze note types
    const noteMap = new Map<number, { front: string; back: string }>();
    for (const note of notes) {
      const fields = note.flds.split("\x1f");
      const front = fields[0]?.trim() ?? "";
      // Some note types have empty/metadata fields at index 1; find the first
      // non-empty field after the front (mirrors the .txt parser behaviour).
      let back = "";
      for (let i = 1; i < fields.length; i++) {
        const candidate = fields[i].trim();
        if (candidate) { back = candidate; break; }
      }
      if (front && back) {
        noteMap.set(note.id, { front, back });
      }
    }

    // cards table: nid (note id), did (deck id)
    const cards = db
      .prepare("SELECT nid, did FROM cards")
      .all() as AnkiCardRow[];

    // Group note-based cards by deck id
    const deckCards = new Map<number, { front: string; back: string }[]>();
    for (const card of cards) {
      const note = noteMap.get(card.nid);
      if (!note) continue;
      if (!deckCards.has(card.did)) deckCards.set(card.did, []);
      deckCards.get(card.did)!.push(note);
    }

    db.close();

    // Build result: one ParsedDeck per leaf deck that has cards
    const result: ParsedDeck[] = [];

    for (const [deckIdStr, deckInfo] of Object.entries(decksMap)) {
      // Skip the built-in empty Default deck
      if (deckInfo.name === "Default") continue;

      const deckId = parseInt(deckIdStr, 10);
      const deckCardList = deckCards.get(deckId);
      if (!deckCardList || deckCardList.length === 0) continue;

      // Deduplicate cards by front+back (Anki can create duplicate card entries
      // for the same note when multiple card templates exist on a note type)
      const seen = new Set<string>();
      const uniqueCards: { front: string; back: string }[] = [];
      for (const c of deckCardList) {
        const key = `${c.front}\x00${c.back}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCards.push(c);
        }
      }

      // Anki ≤2.1.44 uses "::" as hierarchy separator; ≥2.1.45 uses "\x1f"
      const deckPath = deckInfo.name.split(/\x1f|::/).map((s) => s.trim()).filter(Boolean);
      result.push({ deckPath, cards: uniqueCards });
    }

    return result;
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Temp file cleanup is best-effort
    }
  }
}
