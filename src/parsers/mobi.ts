import type { Book, Chapter } from '../types';

interface PdbHeader {
  name: string;
  attributes: number;
  recordCount: number;
  recordOffsets: number[];
}

interface MobiHeader {
  identifier: string;
  headerLength: number;
  title: string;
  author: string;
  encoding: number;
  firstContentRecord: number;
  lastContentRecord: number;
  exthFlags: number;
  exthOffset: number;
  metadata: Record<string, unknown>;
}

export async function parseMobi(
  buffer: ArrayBuffer,
  filename: string
): Promise<Book> {
  const dataView = new DataView(buffer);
  const pdbHeader = parsePdbHeader(dataView);
  const mobiHeader = parseMobiHeader(dataView, pdbHeader);

  const htmlContent = extractHtmlContent(dataView, pdbHeader, mobiHeader);
  const chapters = splitMobiChapters(htmlContent, mobiHeader.title);

  const cover = extractCover(dataView, pdbHeader, mobiHeader);
  const chaptersWithPage = chapters.map((c, idx) => ({
    ...c,
    startPage: idx,
  }));

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    hash: '',
    title: mobiHeader.title || filename.replace(/\.[^/.]+$/, ''),
    author: mobiHeader.author || '未知作者',
    cover,
    format: 'mobi',
    filename,
    fileSize: buffer.byteLength,
    totalPages: chaptersWithPage.length,
    chapters: chaptersWithPage,
    metadata: mobiHeader.metadata,
    status: 'want',
    tags: [],
    rating: 0,
    progress: {
      chapterId: null,
      position: 0,
      page: 1,
      totalPages: chaptersWithPage.length,
      updatedAt: now,
    },
    readingTime: 0,
    fileHash: '',
    createdAt: now,
    updatedAt: now,
  };
}

function parsePdbHeader(dataView: DataView): PdbHeader {
  const nameBytes = new Uint8Array(dataView.buffer, dataView.byteOffset, 32);
  let name = '';
  for (let i = 0; i < 32; i++) {
    if (nameBytes[i] === 0) break;
    name += String.fromCharCode(nameBytes[i]);
  }

  const attributes = dataView.getUint16(32, false);
  const recordCount = dataView.getUint16(76, false);

  const recordOffsets: number[] = [];
  for (let i = 0; i < recordCount; i++) {
    const offset = dataView.getUint32(78 + i * 8, false);
    recordOffsets.push(offset);
  }

  return { name, attributes, recordCount, recordOffsets };
}

function parseMobiHeader(dataView: DataView, pdbHeader: PdbHeader): MobiHeader {
  const record0Offset = pdbHeader.recordOffsets[0];

  const compression = dataView.getUint16(record0Offset, false);
  if (compression !== 1 && compression !== 2 && compression !== 17480) {
    throw new Error('不支持的 MOBI 压缩格式');
  }

  const textLength = dataView.getUint32(record0Offset + 4, false);
  const recordCount = dataView.getUint16(record0Offset + 8, false);
  const recordSize = dataView.getUint16(record0Offset + 10, false);
  const encryptionType = dataView.getUint16(record0Offset + 12, false);

  if (encryptionType !== 0) {
    throw new Error('加密的 MOBI 文件暂不支持');
  }

  const mobiIdentifierOffset = record0Offset + 16;
  const identifier = readString(dataView, mobiIdentifierOffset, 4);

  if (identifier !== 'MOBI') {
    throw new Error('无效的 MOBI 文件：缺少 MOBI 标识符');
  }

  const headerLength = dataView.getUint32(mobiIdentifierOffset + 4, false);

  const encoding = dataView.getUint32(mobiIdentifierOffset + 12, false);

  const titleOffset = dataView.getUint32(mobiIdentifierOffset + 84, false);
  const titleLength = dataView.getUint32(mobiIdentifierOffset + 88, false);
  const title = readEncodedString(
    dataView,
    record0Offset + titleOffset,
    titleLength,
    encoding
  );

  const firstContentRecord = dataView.getUint16(mobiIdentifierOffset + 158, false);
  const lastContentRecord = dataView.getUint16(mobiIdentifierOffset + 160, false);

  const exthFlags = dataView.getUint32(mobiIdentifierOffset + 128, false);
  const exthOffset = mobiIdentifierOffset + 16 + headerLength;

  const metadata: Record<string, unknown> = {
    compression,
    textLength,
    recordCount,
    recordSize,
    title,
    encoding,
  };

  let author = '';

  if (exthFlags & 0x40) {
    const exthData = parseExthHeader(dataView, exthOffset, encoding);
    Object.assign(metadata, exthData);
    author = (exthData.author as string) || '';
  }

  return {
    identifier,
    headerLength,
    title,
    author,
    encoding,
    firstContentRecord,
    lastContentRecord,
    exthFlags,
    exthOffset,
    metadata,
  };
}

function parseExthHeader(
  dataView: DataView,
  offset: number,
  encoding: number
): Record<string, unknown> {
  const identifier = readString(dataView, offset, 4);
  if (identifier !== 'EXTH') {
    return {};
  }

  const headerLength = dataView.getUint32(offset + 4, false);
  const recordCount = dataView.getUint32(offset + 8, false);

  const result: Record<string, unknown> = {};
  let pos = offset + 12;

  for (let i = 0; i < recordCount; i++) {
    const recordType = dataView.getUint32(pos, false);
    const recordLength = dataView.getUint32(pos + 4, false);
    const recordData = pos + 8;

    const dataLength = recordLength - 8;

    switch (recordType) {
      case 100:
        result.author = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 101:
        result.publisher = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 103:
        result.description = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 105:
        result.subject = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 106:
        result.publishDate = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 108:
        result.contributor = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 112:
        result.source = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      case 201:
        result.coverOffset = dataView.getUint32(recordData, false);
        break;
      case 202:
        result.thumbOffset = dataView.getUint32(recordData, false);
        break;
      case 503:
        result.language = readEncodedString(dataView, recordData, dataLength, encoding);
        break;
      default:
        break;
    }

    pos += recordLength;
  }

  void headerLength;
  return result;
}

function extractHtmlContent(
  dataView: DataView,
  pdbHeader: PdbHeader,
  mobiHeader: MobiHeader
): string {
  const firstRecord = mobiHeader.firstContentRecord || 1;
  const lastRecord = mobiHeader.lastContentRecord || pdbHeader.recordCount - 2;

  let htmlContent = '';

  for (let i = firstRecord; i <= lastRecord; i++) {
    const startOffset = pdbHeader.recordOffsets[i];
    const endOffset = i + 1 < pdbHeader.recordOffsets.length
      ? pdbHeader.recordOffsets[i + 1]
      : dataView.byteLength;

    const recordData = new Uint8Array(
      dataView.buffer,
      dataView.byteOffset + startOffset,
      endOffset - startOffset
    );

    const decompressed = decompressRecord(recordData, mobiHeader.metadata);
    htmlContent += decodeByteArray(decompressed, mobiHeader.encoding);
  }

  return cleanMobiHtml(htmlContent);
}

function decompressRecord(
  data: Uint8Array,
  metadata: Record<string, unknown>
): Uint8Array {
  const compression = metadata.compression as number;

  if (compression === 1) {
    return data;
  }

  if (compression === 2) {
    return palmDocDecompress(data);
  }

  return data;
}

function palmDocDecompress(data: Uint8Array): Uint8Array {
  const result: number[] = [];
  let i = 0;
  const len = data.length;

  while (i < len) {
    const byte = data[i];

    if (byte === 0) {
      result.push(0);
      i++;
    } else if (byte < 9) {
      for (let j = 0; j < byte; j++) {
        if (i + 1 + j < len) {
          result.push(data[i + 1 + j]);
        }
      }
      i += 1 + byte;
    } else if (byte < 128) {
      result.push(byte);
      i++;
    } else if (byte < 192) {
      const nextByte = data[i + 1] || 0;
      const combined = ((byte - 128) << 8) | nextByte;
      const distance = (combined >> 3) + 1;
      const length = (combined & 7) + 3;

      for (let j = 0; j < length; j++) {
        const pos = result.length - distance;
        if (pos >= 0) {
          result.push(result[pos]);
        }
      }
      i += 2;
    } else {
      if (byte < 216) {
        result.push(32);
      }
      result.push(0x80 | ((byte - 192) << 5));
      if (i + 1 < len) {
        result[result.length - 1] |= (data[i + 1] & 0x1f);
      }
      i += 2;
    }
  }

  return new Uint8Array(result);
}

function decodeByteArray(data: Uint8Array, encoding: number): string {
  if (encoding === 65001 || encoding === 1252) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(data);
  }

  try {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(data);
  } catch {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data[i]);
    }
    return result;
  }
}

function readString(dataView: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(dataView.getUint8(offset + i));
  }
  return str;
}

function readEncodedString(
  dataView: DataView,
  offset: number,
  length: number,
  encoding: number
): string {
  const bytes = new Uint8Array(dataView.buffer, dataView.byteOffset + offset, length);
  return decodeByteArray(bytes, encoding).replace(/\0/g, '').trim();
}

function cleanMobiHtml(html: string): string {
  let result = html
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<html[^>]*>/gi, '')
    .replace(/<\/html>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<body[^>]*>/gi, '<div class="mobi-body">')
    .replace(/<\/body>/gi, '</div>')
    .replace(/<guide[\s\S]*?<\/guide>/gi, '')
    .replace(/mbp:/gi, 'data-mbp-');

  return result;
}

function splitMobiChapters(htmlContent: string, bookTitle: string): Chapter[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const body = doc.body || doc.documentElement;

  const chapters: Chapter[] = [];
  let currentTitle = bookTitle || '前言';
  let currentContent = '';
  let order = 0;

  const walker = document.createTreeWalker(
    body,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node = walker.currentNode;

  let pageCounter = 0;
  const flushChapter = () => {
    if (currentContent.trim()) {
      chapters.push({
        id: crypto.randomUUID(),
        title: currentTitle,
        order: order++,
        startPage: pageCounter,
        content: currentContent,
      });
      pageCounter++;
    }
  };

  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'h1' || tagName === 'h2' || 
          (tagName.match(/^h[1-6]$/) && el.textContent?.trim() && 
           (el.textContent?.match(/^第[一二三四五六七八九十百千0-9]+[章节部卷篇]/) ||
            el.textContent?.match(/^Chapter\s+\d+/i)))) {
        flushChapter();
        currentTitle = el.textContent?.trim() || `第${order + 1}章`;
        currentContent = '';
      } else {
        currentContent += el.outerHTML;
      }
    }
    const nextNode = walker.nextNode();
    if (!nextNode) break;
    node = nextNode;
  }

  flushChapter();

  if (chapters.length === 0) {
    chapters.push({
      id: crypto.randomUUID(),
      title: bookTitle || '正文',
      order: 0,
      startPage: 0,
      content: body.innerHTML,
    });
  }

  return chapters;
}

function extractCover(
  dataView: DataView,
  pdbHeader: PdbHeader,
  mobiHeader: MobiHeader
): string | null {
  const coverOffset = mobiHeader.metadata.coverOffset as number | undefined;
  if (coverOffset === undefined) {
    return null;
  }

  const coverRecordIndex = Math.floor(coverOffset);
  if (coverRecordIndex >= pdbHeader.recordCount) {
    return null;
  }

  try {
    const recordStart = pdbHeader.recordOffsets[coverRecordIndex];
    const recordEnd = coverRecordIndex + 1 < pdbHeader.recordOffsets.length
      ? pdbHeader.recordOffsets[coverRecordIndex + 1]
      : dataView.byteLength;

    const imageBytes = new Uint8Array(
      dataView.buffer,
      dataView.byteOffset + recordStart,
      recordEnd - recordStart
    );

    const header = imageBytes.slice(0, 8);
    let mimeType = 'image/png';

    if (header[0] === 0xFF && header[1] === 0xD8) {
      mimeType = 'image/jpeg';
    } else if (header[0] === 0x89 && header[1] === 0x50) {
      mimeType = 'image/png';
    } else if (header[0] === 0x47 && header[1] === 0x49) {
      mimeType = 'image/gif';
    }

    let binary = '';
    for (let i = 0; i < imageBytes.length; i++) {
      binary += String.fromCharCode(imageBytes[i]);
    }
    const base64 = btoa(binary);

    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}
