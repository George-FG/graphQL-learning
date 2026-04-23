export type ParsedCard = {
  front: string;
  back: string;
};

/**
 * Parses an Anki export .txt file (tab-separated) into front/back card pairs.
 * Lines starting with '#' are metadata headers and are skipped.
 * The first column is treated as the front, the second as the back.
 * Empty lines are skipped.
 */
export function parseAnkiFile(fileContent: string): ParsedCard[] {
  const lines = fileContent.split(/\r?\n/);
  const cards: ParsedCard[] = [];

  // Detect separator from header, defaulting to tab
  let separator = "\t";
  for (const line of lines) {
    const sepMatch = line.match(/^#separator:(.+)$/i);
    if (sepMatch) {
      const raw = sepMatch[1].trim();
      separator = raw === "tab" ? "\t" : raw;
      break;
    }
  }

  for (const line of lines) {
    // Skip metadata header lines
    if (line.startsWith("#") || line.trim() === "") continue;

    const columns = splitAnkiLine(line, separator);

    const front = columns[0]?.trim() ?? "";

    // The back may not be in columns[1]: Anki often places an empty sort/extra
    // field at columns[1], with the actual answer at columns[2] or later.
    // Find the first non-empty column after the front.
    let back = "";
    for (let i = 1; i < columns.length; i++) {
      const candidate = columns[i].trim();
      if (candidate) {
        back = candidate;
        break;
      }
    }

    if (!front || !back) continue;

    cards.push({ front, back });
  }

  return cards;
}

/**
 * Splits a line by the separator, respecting Anki's quoted fields
 * (fields may be wrapped in double-quotes with internal quotes escaped as "").
 */
function splitAnkiLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
      continue;
    }

    // Not in quotes
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (line.startsWith(separator, i)) {
      result.push(current);
      current = "";
      i += separator.length;
      continue;
    }

    current += char;
    i++;
  }

  result.push(current);
  return result;
}
