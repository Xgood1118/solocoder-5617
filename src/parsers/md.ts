import { marked } from 'marked';
import type { Book, Chapter } from '../types';

export async function parseMd(
  buffer: ArrayBuffer,
  filename: string
): Promise<Book> {
  const decoder = new TextDecoder('utf-8');
  const content = decoder.decode(buffer);

  const chapters = splitMdChapters(content, filename);
  const title = extractTitle(content) || filename.replace(/\.[^/.]+$/, '');
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    hash: '',
    title,
    author: '未知作者',
    cover: null,
    format: 'md',
    filename,
    fileSize: buffer.byteLength,
    totalPages: chapters.length,
    chapters,
    metadata: {},
    status: 'want',
    tags: [],
    rating: 0,
    progress: {
      chapterId: null,
      position: 0,
      page: 1,
      totalPages: chapters.length,
      updatedAt: now,
    },
    readingTime: 0,
    fileHash: '',
    createdAt: now,
    updatedAt: now,
  };
}

function extractTitle(content: string): string | null {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return null;
}

function splitMdChapters(content: string, bookTitle: string): Chapter[] {
  const chapters: Chapter[] = [];
  const lines = content.split(/\r?\n/);
  let currentTitle = bookTitle || '前言';
  let currentLines: string[] = [];
  let order = 0;
  let startPage = 0;

  const flushChapter = (pageEnd: number) => {
    if (currentLines.length > 0) {
      chapters.push({
        id: crypto.randomUUID(),
        title: currentTitle,
        order: order++,
        startPage: startPage,
        content: marked.parse(currentLines.join('\n')) as string,
        pageStart: startPage,
        pageEnd: pageEnd,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isChapterHeading = detectChapterHeading(trimmed);

    if (isChapterHeading && currentLines.length > 0) {
      flushChapter(i - 1);
      currentTitle = cleanHeading(trimmed);
      currentLines = [line];
      startPage = i;
    } else {
      if (currentLines.length === 0) {
        startPage = i;
      }
      currentLines.push(line);
    }
  }

  flushChapter(lines.length - 1);

  if (chapters.length === 0) {
    chapters.push({
      id: crypto.randomUUID(),
      title: bookTitle || '正文',
      order: 0,
      startPage: 0,
      content: marked.parse(content) as string,
      pageStart: 0,
      pageEnd: lines.length - 1,
    });
  }

  return chapters;
}

function detectChapterHeading(line: string): boolean {
  if (!line) return false;

  if (/^##\s+/.test(line)) {
    return true;
  }

  if (/^#\s+/.test(line)) {
    return false;
  }

  const patterns = [
    /^第\s*([一二三四五六七八九十百千万零〇壹贰叁肆伍陆柒捌玖拾佰仟0-9]+)\s*[章节部卷篇]/,
    /^Chapter\s+(\d+)/i,
    /^CHAPTER\s+(\d+)/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(line)) {
      return true;
    }
  }

  return false;
}

function cleanHeading(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('## ')) {
    return trimmed.substring(3).trim();
  }
  return trimmed.substring(0, 150);
}
