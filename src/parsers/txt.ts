import type { Book, Chapter } from '../types';

export async function parseTxt(
  buffer: ArrayBuffer,
  filename: string
): Promise<Book> {
  const decoder = new TextDecoder('utf-8');
  const content = decoder.decode(buffer);

  const chapters = splitTxtChapters(content, filename);
  const title = filename.replace(/\.[^/.]+$/, '');
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    hash: '',
    title,
    author: '未知作者',
    cover: null,
    format: 'txt',
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

function splitTxtChapters(content: string, bookTitle: string): Chapter[] {
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
        startPage: startPage + 1,
        content: buildChapterHtml(currentLines),
        pageStart: startPage + 1,
        pageEnd: pageEnd + 1,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const chapterTitle = detectChapterTitle(line);

    if (chapterTitle && currentLines.length > 0) {
      flushChapter(i - 1);
      currentTitle = chapterTitle;
      currentLines = [lines[i]];
      startPage = i;
    } else {
      if (currentLines.length === 0) {
        startPage = i;
      }
      currentLines.push(lines[i]);
    }
  }

  flushChapter(lines.length - 1);

  if (chapters.length === 0) {
    chapters.push({
      id: crypto.randomUUID(),
      title: bookTitle || '正文',
      order: 0,
      startPage: 1,
      content: buildChapterHtml(lines),
      pageStart: 1,
      pageEnd: lines.length,
    });
  }

  return chapters;
}

function detectChapterTitle(line: string): string | null {
  if (!line) return null;

  const patterns = [
    /^第\s*([一二三四五六七八九十百千万零〇壹贰叁肆伍陆柒捌玖拾佰仟0-9]+)\s*[章节部卷篇]\s*[:：]?\s*(.*)$/,
    /^Chapter\s+(\d+)\s*[:：]?\s*(.*)$/i,
    /^CHAPTER\s+(\d+)\s*[:：]?\s*(.*)$/,
    /^(\d+)[.、]\s*(.+)$/,
    /^[一二三四五六七八九十百千]+[、.]\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      return line.substring(0, 150);
    }
  }

  return null;
}

function buildChapterHtml(lines: string[]): string {
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') {
      if (currentParagraph.length > 0) {
        paragraphs.push(`<p class="txt-paragraph">${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
    } else {
      currentParagraph.push(escapeHtml(trimmed));
    }
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(`<p class="txt-paragraph">${currentParagraph.join(' ')}</p>`);
  }

  return `<div class="txt-content">${paragraphs.join('\n')}</div>`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
