export {
  searchInBook,
  escapeRegExp,
  stripHtml,
  highlightMatch,
} from './search';
export type { SearchResult, SearchOptions } from './search';

export {
  renderPdfPage,
  getPdfTextPage,
  loadPdfDocument,
} from './pdfRenderer';

export {
  FILE_SIZE_LIMIT,
  SUPPORTED_EXTENSIONS,
  validateFile,
  fetchFromUrl,
  readFileAsArrayBuffer,
  readFileAsText,
  downloadBlob,
} from './fileImporter';
export type { FileValidationResult, SupportedExtension } from './fileImporter';
