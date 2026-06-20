import { createStore, get, set, del, entries, clear } from 'idb-keyval';
import type { Book, Bookmark, Note, ReaderSettings, LibraryExport } from '../types';

const DB_NAME = 'ebook-reader-db';

const booksStore = createStore(DB_NAME, 'books');
const notesStore = createStore(DB_NAME, 'notes');
const bookmarksStore = createStore(DB_NAME, 'bookmarks');
const settingsStore = createStore(DB_NAME, 'settings');
const shelfStore = createStore(DB_NAME, 'shelf');

const READER_SETTINGS_KEY = 'reader-settings';
const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 'md',
  lineHeight: 1.6,
  paragraphSpacing: 16,
  brightness: 100,
  readingMode: 'page',
  pageAnimation: 'slide',
  tapToTurn: true,
  swipeToTurn: true,
  keyboardNavigation: true,
  showMarginNotes: true,
};

export async function getAllBooks(): Promise<Book[]> {
  const allEntries = await entries(booksStore);
  return allEntries.map(([, value]) => value as Book);
}

export async function getBook(id: string): Promise<Book | undefined> {
  return get<Book>(id, booksStore);
}

export async function addBook(book: Book): Promise<void> {
  await set(book.id, book, booksStore);
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<void> {
  const existing = await getBook(id);
  if (!existing) return;
  const updated = { ...existing, ...updates } as Book;
  await set(id, updated, booksStore);
}

export async function deleteBook(id: string): Promise<void> {
  await del(id, booksStore);
  const notes = await getBookNotes(id);
  for (const note of notes) {
    await deleteNote(note.id);
  }
  const bookmarks = await getBookBookmarks(id);
  for (const bookmark of bookmarks) {
    await deleteBookmark(bookmark.id);
  }
}

export async function getBookNotes(bookId: string): Promise<Note[]> {
  const allEntries = await entries(notesStore);
  return allEntries
    .map(([, value]) => value as Note)
    .filter((note: Note) => note.bookId === bookId);
}

export async function getAllNotes(): Promise<Note[]> {
  const allEntries = await entries(notesStore);
  return allEntries.map(([, value]) => value as Note);
}

export async function addNote(note: Note): Promise<void> {
  await set(note.id, note, notesStore);
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<void> {
  const allEntries = await entries(notesStore);
  const found = allEntries.find(([key]) => key === id);
  if (!found) return;
  const existing = found[1] as Note;
  const updated = { ...existing, ...updates } as Note;
  await set(id, updated, notesStore);
}

export async function deleteNote(id: string): Promise<void> {
  await del(id, notesStore);
}

export async function getBookBookmarks(bookId: string): Promise<Bookmark[]> {
  const allEntries = await entries(bookmarksStore);
  return allEntries
    .map(([, value]) => value as Bookmark)
    .filter((bookmark: Bookmark) => bookmark.bookId === bookId);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const allEntries = await entries(bookmarksStore);
  return allEntries.map(([, value]) => value as Bookmark);
}

export async function addBookmark(bookmark: Bookmark): Promise<void> {
  await set(bookmark.id, bookmark, bookmarksStore);
}

export async function deleteBookmark(id: string): Promise<void> {
  await del(id, bookmarksStore);
}

export async function getSettings(): Promise<ReaderSettings | undefined> {
  return get<ReaderSettings>(READER_SETTINGS_KEY, settingsStore);
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  await set(READER_SETTINGS_KEY, settings, settingsStore);
}

export async function exportLibrary(): Promise<LibraryExport> {
  const [books, notes, bookmarks, settings] = await Promise.all([
    getAllBooks(),
    getAllNotes(),
    getAllBookmarks(),
    getSettings(),
  ]);
  return {
    books,
    notes,
    bookmarks,
    settings: settings ?? DEFAULT_READER_SETTINGS,
    version: '1.0.0',
    exportedAt: Date.now(),
  };
}

export async function importLibrary(data: LibraryExport): Promise<void> {
  await clear(booksStore);
  await clear(notesStore);
  await clear(bookmarksStore);

  const bookPromises = data.books.map((book: Book) => addBook(book));
  const notePromises = data.notes.map((note: Note) => addNote(note));
  const bookmarkPromises = data.bookmarks.map((bookmark: Bookmark) => addBookmark(bookmark));

  await Promise.all([...bookPromises, ...notePromises, ...bookmarkPromises]);
  if (data.settings) {
    await saveSettings(data.settings);
  }
}

export const db = {
  getAllBooks,
  getBook,
  addBook,
  updateBook,
  deleteBook,
  getBookNotes,
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  getBookBookmarks,
  getAllBookmarks,
  addBookmark,
  deleteBookmark,
  getSettings,
  saveSettings,
  exportLibrary,
  importLibrary,
};
