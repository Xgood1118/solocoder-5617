import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const pdfCache = new Map<string, Promise<any>>();

export async function loadPdfDocument(pdfData: ArrayBuffer): Promise<any> {
  const cacheKey = `pdf_${pdfData.byteLength}`;
  const cached = pdfCache.get(cacheKey);
  if (cached) return cached;

  const typedArray = new Uint8Array(pdfData);
  const loadingTask = pdfjsLib.getDocument({ data: typedArray });
  const promise = loadingTask.promise;
  pdfCache.set(cacheKey, promise);
  return promise;
}

export async function renderPdfPage(
  container: HTMLElement,
  pdfData: ArrayBuffer,
  pageNum: number,
  scale: number = 1
): Promise<{ width: number; height: number }> {
  const pdf = await loadPdfDocument(pdfData);
  const page = await pdf.getPage(pageNum);

  const containerWidth = container.clientWidth || 800;
  const viewport = page.getViewport({ scale: 1 });
  const computedScale = (containerWidth / viewport.width) * scale;
  const scaledViewport = page.getViewport({ scale: computedScale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get canvas 2D context');
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = scaledViewport.width * dpr;
  canvas.height = scaledViewport.height * dpr;
  canvas.style.width = `${scaledViewport.width}px`;
  canvas.style.height = `${scaledViewport.height}px`;
  context.scale(dpr, dpr);

  container.innerHTML = '';
  container.appendChild(canvas);

  await page.render({
    canvasContext: context,
    viewport: scaledViewport,
  }).promise;

  return {
    width: scaledViewport.width,
    height: scaledViewport.height,
  };
}

export async function getPdfTextPage(
  pdfData: ArrayBuffer,
  pageNum: number
): Promise<string> {
  const pdf = await loadPdfDocument(pdfData);
  const page = await pdf.getPage(pageNum);
  const textContent = await page.getTextContent();
  return textContent.items
    .map((item: any) => item.str)
    .join(' ');
}
