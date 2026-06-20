import type { Book, BookFormat } from '../types';
import { parseEpub } from './epub';
import { parseMobi } from './mobi';
import { parsePdf } from './pdf';
import { parseTxt } from './txt';
import { parseMd } from './md';

export const FILE_SIZE_LIMIT = 100 * 1024 * 1024;

const MIME_TYPE_MAP: Record<string, BookFormat> = {
  'application/epub+zip': 'epub',
  'application/x-mobipocket-ebook': 'mobi',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
};

const EXTENSION_MAP: Record<string, BookFormat> = {
  epub: 'epub',
  mobi: 'mobi',
  azw: 'mobi',
  azw3: 'mobi',
  pdf: 'pdf',
  txt: 'txt',
  md: 'md',
  markdown: 'md',
};

export function detectFormat(filenameOrMimeType: string): BookFormat {
  if (MIME_TYPE_MAP[filenameOrMimeType]) {
    return MIME_TYPE_MAP[filenameOrMimeType];
  }

  const ext = filenameOrMimeType.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MAP[ext] || 'unknown';
}

export async function generateFileHash(content: ArrayBuffer | string): Promise<string> {
  const buffer = typeof content === 'string' 
    ? new TextEncoder().encode(content) 
    : new Uint8Array(content);

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fileToArrayBuffer(file: File | ArrayBuffer): Promise<ArrayBuffer> {
  if (file instanceof ArrayBuffer) {
    return file;
  }
  return await file.arrayBuffer();
}

export async function parseBook(
  file: File | ArrayBuffer,
  name: string
): Promise<Book> {
  const buffer = await fileToArrayBuffer(file);
  const fileSize = buffer.byteLength;

  if (fileSize > FILE_SIZE_LIMIT) {
    throw new Error(`文件大小超过限制（${(FILE_SIZE_LIMIT / 1024 / 1024).toFixed(0)}MB）`);
  }

  const format = detectFormat(name);

  if (format === 'unknown') {
    throw new Error(`不支持的文件格式: ${name}`);
  }

  const hash = await generateFileHash(buffer);

  let book: Book;
  switch (format) {
    case 'epub':
      book = await parseEpub(buffer, name);
      break;
    case 'mobi':
      book = await parseMobi(buffer, name);
      break;
    case 'pdf':
      book = await parsePdf(buffer, name);
      break;
    case 'txt':
      book = await parseTxt(buffer, name);
      break;
    case 'md':
      book = await parseMd(buffer, name);
      break;
    default:
      throw new Error(`不支持的格式: ${format}`);
  }

  book.hash = hash;
  book.fileSize = fileSize;
  book.filename = name;

  return book;
}

export { parseEpub, parseMobi, parsePdf, parseTxt, parseMd };
export type { Book, BookFormat } from '../types';
