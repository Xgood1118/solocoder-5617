export type BookStatus = 'want' | 'reading' | 'finished';

export type BookFormat = 'epub' | 'mobi' | 'pdf' | 'txt' | 'md' | 'unknown';

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'night';

export type FontFamily = 'serif' | 'sans-serif' | 'song' | 'source-han-sans' | 'monospace';

export type ReadingMode = 'page' | 'scroll';

export type PageAnimation = 'none' | 'slide' | 'flip';

export type NoteType = 'highlight' | 'note';

export interface Chapter {
  id: string;
  title: string;
  href?: string;
  order: number;
  startPage: number;
  content?: string;
  pageStart?: number;
  pageEnd?: number;
}

export interface ReadingProgress {
  chapterId: string | null;
  position: number;
  page: number;
  totalPages: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  hash: string;
  title: string;
  author: string;
  cover: string | null;
  format: BookFormat;
  filename: string;
  fileSize: number;
  totalPages: number;
  chapters: Chapter[];
  metadata: Record<string, unknown>;
  status: BookStatus;
  tags: string[];
  rating: number;
  progress: ReadingProgress;
  readingTime: number;
  fileHash: string;
  createdAt: number;
  updatedAt: number;
  data?: ArrayBuffer | string;
}

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: FontFamily;
  fontSize: string;
  lineHeight: number;
  paragraphSpacing: number;
  brightness: number;
  readingMode: ReadingMode;
  pageAnimation: PageAnimation;
  tapToTurn: boolean;
  swipeToTurn: boolean;
  keyboardNavigation: boolean;
  showMarginNotes: boolean;
}

export interface Note {
  id: string;
  bookId: string;
  chapterId: string;
  type: NoteType;
  text: string;
  noteText?: string;
  color?: string;
  startOffset: number;
  endOffset: number;
  page: number;
  createdAt: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  page: number;
  position: number;
  note?: string;
  createdAt: number;
}

export interface LibraryExport {
  version: string;
  exportedAt: number;
  books: Book[];
  notes: Note[];
  bookmarks: Bookmark[];
  settings: ReaderSettings;
}

export type LibraryExportData = LibraryExport;
