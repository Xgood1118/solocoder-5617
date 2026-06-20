import JSZip from 'jszip';
import type { Book, Chapter } from '../types';

interface OpfMetadata {
  title: string;
  author: string;
  coverId?: string;
  metadata: Record<string, unknown>;
}

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

export async function parseEpub(
  file: ArrayBuffer | Blob,
  filename: string
): Promise<Book> {
  const buffer = file instanceof Blob ? await file.arrayBuffer() : file;
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('无效的 EPUB 文件：缺少 container.xml');
  }

  const opfPath = parseContainerXml(containerXml);
  if (!opfPath) {
    throw new Error('无效的 EPUB 文件：找不到 OPF 文件路径');
  }

  const opfDir = opfPath.split('/').slice(0, -1).join('/') || '';
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) {
    throw new Error('无效的 EPUB 文件：找不到 OPF 文件');
  }

  const { metadata, manifest, spine, tocHref } = parseOpf(opfXml);

  let cover: string | null = null;
  if (metadata.coverId) {
    const coverItem = manifest.find(m => m.id === metadata.coverId);
    if (coverItem) {
      const coverHref = opfDir ? `${opfDir}/${coverItem.href}` : coverItem.href;
      const coverBlob = await zip.file(coverHref)?.async('base64');
      if (coverBlob) {
        cover = `data:${coverItem.mediaType};base64,${coverBlob}`;
      }
    }
  }

  const chapters = await parseSpine(zip, spine, manifest, opfDir, tocHref);
  const chaptersWithPage = chapters.map((c, idx) => ({
    ...c,
    startPage: idx,
  }));

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    hash: '',
    title: metadata.title || filename.replace(/\.[^/.]+$/, ''),
    author: metadata.author || '未知作者',
    cover,
    format: 'epub',
    filename,
    fileSize: buffer.byteLength,
    totalPages: chaptersWithPage.length,
    chapters: chaptersWithPage,
    metadata: metadata.metadata,
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

function parseContainerXml(xml: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const rootfile = doc.querySelector('rootfile');
  return rootfile?.getAttribute('full-path') || null;
}

function parseOpf(xml: string): {
  metadata: OpfMetadata;
  manifest: ManifestItem[];
  spine: string[];
  tocHref?: string;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');

  const nsResolver = (prefix: string): string | null => {
    const ns: Record<string, string> = {
      opf: 'http://www.idpf.org/2007/opf',
      dc: 'http://purl.org/dc/elements/1.1/',
    };
    return ns[prefix] || null;
  };

  const titleEl = doc.querySelector('metadata > title, metadata > dc\\:title');
  const title = titleEl?.textContent?.trim() || '';

  const authorEl = doc.querySelector('metadata > creator, metadata > dc\\:creator');
  const author = authorEl?.textContent?.trim() || '';

  let coverId: string | undefined;
  const metaCover = doc.querySelector('meta[name="cover"]');
  if (metaCover) {
    coverId = metaCover.getAttribute('content') || undefined;
  }

  const manifestItems = doc.querySelectorAll('manifest > item');
  const manifest: ManifestItem[] = Array.from(manifestItems).map(item => ({
    id: item.getAttribute('id') || '',
    href: item.getAttribute('href') || '',
    mediaType: item.getAttribute('media-type') || '',
  }));

  const itemrefs = doc.querySelectorAll('spine > itemref');
  const spine: string[] = Array.from(itemrefs)
    .map(ref => ref.getAttribute('idref') || '')
    .filter(Boolean);

  const tocAttribute = doc.querySelector('spine')?.getAttribute('toc');
  let tocHref: string | undefined;
  if (tocAttribute) {
    const tocItem = manifest.find(m => m.id === tocAttribute);
    tocHref = tocItem?.href;
  }

  const metadataObj: Record<string, unknown> = {};
  const allMeta = doc.querySelectorAll('metadata > *');
  allMeta.forEach(el => {
    const tag = el.tagName.replace('dc:', '');
    if (tag && el.textContent) {
      metadataObj[tag] = el.textContent.trim();
    }
  });

  return {
    metadata: { title, author, coverId, metadata: metadataObj },
    manifest,
    spine,
    tocHref,
  };
}

async function parseSpine(
  zip: JSZip,
  spine: string[],
  manifest: ManifestItem[],
  opfDir: string,
  _tocHref?: string
): Promise<Chapter[]> {
  const chapters: Chapter[] = [];
  let order = 0;

  for (const idref of spine) {
    const item = manifest.find(m => m.id === idref);
    if (!item || !item.href.endsWith('.xhtml') && !item.href.endsWith('.html') && !item.href.endsWith('.htm')) {
      continue;
    }

    const fullHref = opfDir ? `${opfDir}/${item.href}` : item.href;
    const content = await zip.file(fullHref)?.async('string');
    if (!content) continue;

    const chapterTitle = extractChapterTitle(content, item.href);
    const chapterContent = processHtmlContent(content, zip, opfDir);

    chapters.push({
      id: crypto.randomUUID(),
      title: chapterTitle,
      href: item.href,
      order: order++,
      startPage: order - 1,
      content: chapterContent,
    });
  }

  return chapters;
}

function extractChapterTitle(html: string, fallback: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const titleEl = doc.querySelector('title');
  if (titleEl?.textContent?.trim()) {
    return titleEl.textContent.trim();
  }

  const h1El = doc.querySelector('h1');
  if (h1El?.textContent?.trim()) {
    return h1El.textContent.trim();
  }

  const h2El = doc.querySelector('h2');
  if (h2El?.textContent?.trim()) {
    return h2El.textContent.trim();
  }

  return fallback.split('/').pop() || fallback;
}

function processHtmlContent(html: string, zip: JSZip, opfDir: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const body = doc.body || doc.documentElement;

  const images = body.querySelectorAll('img');
  images.forEach(async (img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      const fullSrc = opfDir ? resolvePath(opfDir, src) : src;
      const imgFile = zip.file(fullSrc);
      if (imgFile) {
        const ext = fullSrc.split('.').pop()?.toLowerCase() || '';
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          svg: 'image/svg+xml',
        };
        const mimeType = mimeTypes[ext] || 'image/png';
        const base64 = await imgFile.async('base64');
        img.setAttribute('src', `data:${mimeType};base64,${base64}`);
      }
    }
  });

  return body.innerHTML;
}

function resolvePath(base: string, relative: string): string {
  const baseParts = base.split('/').filter(Boolean);
  const relativeParts = relative.split('/');

  for (const part of relativeParts) {
    if (part === '..') {
      baseParts.pop();
    } else if (part !== '.') {
      baseParts.push(part);
    }
  }

  return baseParts.join('/');
}
