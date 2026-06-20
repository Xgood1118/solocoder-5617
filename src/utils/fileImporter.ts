export const FILE_SIZE_LIMIT = 100 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ['.epub', '.mobi', '.pdf', '.txt', '.md', '.markdown'] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > FILE_SIZE_LIMIT) {
    const sizeMB = (FILE_SIZE_LIMIT / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `文件大小超过限制（最大 ${sizeMB}MB）`,
    };
  }

  const name = file.name.toLowerCase();
  const ext = '.' + name.split('.').pop() || '';
  if (!SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension)) {
    return {
      valid: false,
      error: `不支持的文件格式（${ext}），支持的格式：${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

function extractFilenameFromUrl(url: string, headers?: Headers): string {
  if (headers) {
    const disposition = headers.get('Content-Disposition');
    if (disposition) {
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (filenameMatch) {
        return decodeURIComponent(filenameMatch[1].trim());
      }
    }
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || 'downloaded-file';
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'downloaded-file';
  }
}

export async function fetchFromUrl(
  url: string
): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const filename = extractFilenameFromUrl(url, response.headers);

  return { buffer, filename };
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function readFileAsText(
  file: File,
  encoding?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsText(file, encoding);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
