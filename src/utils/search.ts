import type { Book } from '../types';

export interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  match: string;
  contextStart: string;
  contextEnd: string;
  position: number;
}

export interface SearchOptions {
  maxResults?: number;
  contextLength?: number;
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = escapeRegExp(query);
  const regex = new RegExp(escaped, 'gi');
  return text.replace(regex, (match) => `<mark>${match}</mark>`);
}

export function searchInBook(
  book: Book,
  query: string,
  options?: SearchOptions
): SearchResult[] {
  if (!query.trim()) return [];

  const maxResults = options?.maxResults ?? 100;
  const contextLength = options?.contextLength ?? 50;
  const escaped = escapeRegExp(query);
  const regex = new RegExp(escaped, 'gi');
  const results: SearchResult[] = [];

  for (const chapter of book.chapters) {
    if (!chapter.content) continue;

    const plainText = stripHtml(chapter.content);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(plainText)) !== null) {
      if (results.length >= maxResults) break;

      const position = match.index;
      const matchText = match[0];

      const contextStartIdx = Math.max(0, position - contextLength);
      const contextEndIdx = Math.min(plainText.length, position + matchText.length + contextLength);

      const contextStart = plainText.slice(contextStartIdx, position);
      const matchWithContext = plainText.slice(position, position + matchText.length);
      const contextEnd = plainText.slice(position + matchText.length, contextEndIdx);

      const highlighted =
        highlightMatch(contextStart, query) +
        `<mark>${matchText}</mark>` +
        highlightMatch(contextEnd, query);

      results.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        match: highlighted,
        contextStart,
        contextEnd,
        position,
      });

      if (match[0].length === 0) regex.lastIndex++;
    }

    if (results.length >= maxResults) break;
  }

  return results;
}
