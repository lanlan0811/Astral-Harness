/**
 * Fuzzy matching for the command palette, slash commands and @-mentions.
 *
 * Ranking rules, in order:
 *   1. prefix match beats substring match beats subsequence match
 *   2. shorter haystacks win ties, so "open" beats "open workspace project settings"
 *   3. every token in the query must match (AND, not OR)
 *
 * Scores are banded by *kind* of match so a prefix hit can never be beaten by a
 * lucky subsequence hit in a longer field.
 */

const PREFIX_SCORE = 0;
const SUBSTRING_SCORE = 100;
const SUBSEQUENCE_SCORE = 200;

export interface FuzzyField {
  /** Higher weight means a match here counts for more. */
  weight: number;
  value: string;
}

export interface FuzzyMatch {
  score: number;
  /** Range of `text` that produced the hit, for highlighting. */
  start: number;
  end: number;
}

/** Best single match of `query` inside `text`, or null when there is none. */
export function fuzzyMatchIn(query: string, text: string): FuzzyMatch | null {
  if (!query) return { score: PREFIX_SCORE, start: 0, end: 0 };
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  if (lowerText.startsWith(lowerQuery)) {
    return { score: PREFIX_SCORE + (text.length - query.length), start: 0, end: query.length };
  }

  const substringIndex = lowerText.indexOf(lowerQuery);
  if (substringIndex >= 0) {
    return {
      score: SUBSTRING_SCORE + (text.length - query.length),
      start: substringIndex,
      end: substringIndex + query.length,
    };
  }

  // Subsequence: every query char in order, not necessarily adjacent.
  let queryIndex = 0;
  let textIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;
  while (queryIndex < lowerQuery.length && textIndex < lowerText.length) {
    if (lowerQuery[queryIndex] === lowerText[textIndex]) {
      if (firstMatch < 0) firstMatch = textIndex;
      lastMatch = textIndex;
      queryIndex += 1;
    }
    textIndex += 1;
  }
  if (queryIndex < lowerQuery.length) return null;
  return {
    score: SUBSEQUENCE_SCORE + (text.length - query.length),
    start: firstMatch,
    end: lastMatch + 1,
  };
}

/**
 * Score a candidate against a multi-token query. Every whitespace-separated token
 * must hit at least one weighted field; the candidate's score is the sum of the
 * best field hit per token.
 */
export function fuzzyScoreFields(query: string, fields: FuzzyField[]): number | null {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    let best: number | null = null;
    for (const field of fields) {
      const match = fuzzyMatchIn(token, field.value);
      if (!match) continue;
      const weighted = match.score + field.weight;
      if (best === null || weighted < best) best = weighted;
    }
    if (best === null) return null;
    total += best;
  }
  return total;
}

export interface RankedItem<T> {
  item: T;
  score: number;
  /** Index of the original item, used to break score ties stably. */
  index: number;
}

/** Rank `items` by `getFields`; drops everything that does not match. Stable on ties. */
export function rankByFuzzy<T>(
  query: string,
  items: readonly T[],
  getFields: (item: T) => FuzzyField[],
  limit?: number,
): RankedItem<T>[] {
  const ranked: RankedItem<T>[] = [];
  items.forEach((item, index) => {
    const score = fuzzyScoreFields(query, getFields(item));
    if (score === null) return;
    ranked.push({ item, score, index });
  });
  ranked.sort((a, b) => (a.score === b.score ? a.index - b.index : a.score - b.score));
  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}
