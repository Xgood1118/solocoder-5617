import * as pdfjsLib from 'pdfjs-dist';
import type { Book, Chapter } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function parsePdf(
  file: ArrayBuffer,
  filename: string
): Promise<Book> {
  const typedArray = new Uint8Array(file);
  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const pdf = await loadingTask.promise;

  const pageCount = pdf.numPages;

  const metadataObj = await pdf.getMetadata().catch(() => ({}));
  const info = (metadataObj as { info?: Record<string, unknown> }).info || {};

  const title = (info.Title as string)?.trim() || filename.replace(/\.[^/.]+$/, '');
  const author = (info.Author as string)?.trim() || '未知作者';

  const chapters: Chapter[] = [];

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => (item as { str: string }).str)
      .join(' ');
    pageTexts.push(pageText);
  }

  const groupedChapters = groupPagesIntoChapters(pageTexts, title);

  let order = 0;
  for (const chapter of groupedChapters) {
    chapters.push({
      id: crypto.randomUUID(),
      title: chapter.title,
      order: order++,
      startPage: chapter.pageStart,
      content: buildChapterHtml(chapter.pages, chapter.pageStart, chapter.pageEnd),
      pageStart: chapter.pageStart,
      pageEnd: chapter.pageEnd,
    });
  }

  const cover = await extractPdfCover(file).catch(() => null);

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    hash: '',
    title,
    author,
    cover,
    format: 'pdf',
    filename,
    fileSize: file.byteLength,
    totalPages: pageCount,
    chapters,
    metadata: {
      ...info,
      pageCount,
    },
    status: 'want',
    tags: [],
    rating: 0,
    progress: {
      chapterId: null,
      position: 0,
      page: 1,
      totalPages: pageCount,
      updatedAt: now,
    },
    readingTime: 0,
    fileHash: '',
    createdAt: now,
    updatedAt: now,
  };
}

function groupPagesIntoChapters(
  pageTexts: string[],
  bookTitle: string
): {
  title: string;
  pages: string[];
  pageStart: number;
  pageEnd: number;
}[] {
  const chapters: {
    title: string;
    pages: string[];
    pageStart: number;
    pageEnd: number;
  }[] = [];

  let currentTitle = bookTitle || '前言';
  let currentPages: string[] = [];
  let pageStart = 0;

  const flush = (pageEnd: number) => {
    if (currentPages.length > 0) {
      chapters.push({
        title: currentTitle,
        pages: [...currentPages],
        pageStart,
        pageEnd,
      });
    }
  };

  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i];
    const chapterTitle = detectChapterTitle(pageText);

    if (chapterTitle && currentPages.length > 0) {
      flush(i - 1);
      currentTitle = chapterTitle;
      currentPages = [pageText];
      pageStart = i;
    } else {
      if (currentPages.length === 0) {
        pageStart = i;
      }
      currentPages.push(pageText);
    }
  }

  flush(pageTexts.length - 1);

  if (chapters.length === 0 && pageTexts.length > 0) {
    chapters.push({
      title: bookTitle || '正文',
      pages: pageTexts,
      pageStart: 0,
      pageEnd: pageTexts.length - 1,
    });
  }

  return chapters;
}

function detectChapterTitle(pageText: string): string | null {
  const firstLine = pageText
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 0);

  if (!firstLine) return null;

  const patterns = [
    /^第\s*([一二三四五六七八九十百千万零〇壹贰叁肆伍陆柒捌玖拾佰仟0-9]+)\s*[章节部卷篇]\s*[:：]?\s*(.*)$/,
    /^Chapter\s+(\d+)\s*[:：]?\s*(.*)$/i,
    /^CHAPTER\s+(\d+)\s*[:：]?\s*(.*)$/,
    /^(\d+)[.、]\s*(.+)$/,
    /^[一二三四五六七八九十百千]+[、.]\s*(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = firstLine.match(pattern);
    if (match) {
      const titleText = match[2] || match[1];
      if (titleText && titleText.length < 100) {
        return firstLine.substring(0, 150);
      }
    }
  }

  if (firstLine.length < 80 && /^[\u4e00-\u9fa5A-Za-z0-9\s：:、.,。！!?？\-_《》""''（）()]+$/.test(firstLine)) {
    if (firstLine.length >= 2 && /[一二三四五六七八九十百千0-9]/.test(firstLine)) {
      return firstLine.substring(0, 150);
    }
  }

  return null;
}

function buildChapterHtml(
  pages: string[],
  pageStart: number,
  pageEnd: number
): string {
  let html = '<div class="pdf-chapter">';

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pageStart + i + 1;
    const pageContent = escapeHtml(pages[i])
      .replace(/\n{2,}/g, '</p><p class="pdf-paragraph">')
      .replace(/\n/g, '<br/>');

    html += `
      <div class="pdf-page" data-page="${pageNum}">
        <div class="pdf-page-number" style="text-align:center;color:#999;font-size:0.8em;margin:1em 0;">— 第 ${pageNum} 页 —</div>
        <p class="pdf-paragraph">${pageContent}</p>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function extractPdfCover(file: ArrayBuffer): Promise<string | null> {
  try {
    const typedArray = new Uint8Array(file);
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;

    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await firstPage.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}
