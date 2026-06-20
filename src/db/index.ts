import { createStore, get, set, del, entries, clear } from 'idb-keyval';
import type { Book, Bookmark, Note, ReaderSettings, LibraryExport } from '../types';

const DB_NAME = 'ebook-reader-db';
const LS_FALLBACK_PREFIX = 'ebr_fallback_';

const READER_SETTINGS_KEY = 'reader-settings';
export const DEFAULT_READER_SETTINGS: ReaderSettings = {
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

let idbAvailable = true;
let initAttempted = false;

function checkIdb(): boolean {
  if (initAttempted) return idbAvailable;
  initAttempted = true;
  try {
    if (typeof indexedDB === 'undefined') {
      idbAvailable = false;
      return false;
    }
  } catch {
    idbAvailable = false;
    return false;
  }
  return idbAvailable;
}

let booksStore: any;
let notesStore: any;
let bookmarksStore: any;
let settingsStore: any;
let shelfStore: any;

function initStores() {
  try {
    booksStore = booksStore || createStore(DB_NAME, 'books');
    notesStore = notesStore || createStore(DB_NAME, 'notes');
    bookmarksStore = bookmarksStore || createStore(DB_NAME, 'bookmarks');
    settingsStore = settingsStore || createStore(DB_NAME, 'settings');
    shelfStore = shelfStore || createStore(DB_NAME, 'shelf');
  } catch (e) {
    idbAvailable = false;
    console.warn('IndexedDB stores init failed, using localStorage fallback:', e);
  }
}

initStores();

function safeGet<T>(key: IDBValidKey, store: any): Promise<T | undefined> {
  checkIdb();
  if (!idbAvailable) {
    try {
      const raw = localStorage.getItem(LS_FALLBACK_PREFIX + store.name + '_' + String(key));
      return Promise.resolve(raw ? (JSON.parse(raw) as T) : undefined);
    } catch {
      return Promise.resolve(undefined);
    }
  }
  try {
    initStores();
    return get<T>(key, store).catch(() => undefined);
  } catch (e) {
    idbAvailable = false;
    console.warn('safeGet fallback to LS:', e);
    return safeGet<T>(key, store);
  }
}

function safeSet(key: IDBValidKey, value: any, store: any): Promise<void> {
  checkIdb();
  if (!idbAvailable) {
    try {
      localStorage.setItem(
        LS_FALLBACK_PREFIX + store.name + '_' + String(key),
        JSON.stringify(value)
      );
    } catch {}
    return Promise.resolve();
  }
  try {
    initStores();
    return set(key, value, store).catch((e) => {
      idbAvailable = false;
      console.warn('safeSet fallback to LS:', e);
      return safeSet(key, value, store);
    });
  } catch (e) {
    idbAvailable = false;
    return safeSet(key, value, store);
  }
}

function safeDel(key: IDBValidKey, store: any): Promise<void> {
  checkIdb();
  if (!idbAvailable) {
    try {
      localStorage.removeItem(LS_FALLBACK_PREFIX + store.name + '_' + String(key));
    } catch {}
    return Promise.resolve();
  }
  try {
    initStores();
    return del(key, store).catch(() => Promise.resolve());
  } catch {
    return Promise.resolve();
  }
}

function safeEntries(store: any): Promise<[IDBValidKey, any][]> {
  checkIdb();
  if (!idbAvailable) {
    try {
      const prefix = LS_FALLBACK_PREFIX + store.name + '_';
      const result: [IDBValidKey, any][] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const realKey = k.slice(prefix.length);
          const raw = localStorage.getItem(k);
          if (raw) result.push([realKey, JSON.parse(raw)]);
        }
      }
      return Promise.resolve(result);
    } catch {
      return Promise.resolve([]);
    }
  }
  try {
    initStores();
    return entries(store).catch(() => []);
  } catch {
    idbAvailable = false;
    return safeEntries(store);
  }
}

function safeClear(store: any): Promise<void> {
  checkIdb();
  if (!idbAvailable) {
    try {
      const prefix = LS_FALLBACK_PREFIX + store.name + '_';
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {}
    return Promise.resolve();
  }
  try {
    initStores();
    return clear(store).catch(() => Promise.resolve());
  } catch {
    return Promise.resolve();
  }
}

export async function getAllBooks(): Promise<Book[]> {
  const allEntries = await safeEntries(booksStore);
  return allEntries.map(([, value]) => value as Book);
}

export async function getBook(id: string): Promise<Book | undefined> {
  return safeGet<Book>(id, booksStore);
}

export async function addBook(book: Book): Promise<void> {
  await safeSet(book.id, book, booksStore);
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<void> {
  const existing = await getBook(id);
  if (!existing) return;
  const updated = { ...existing, ...updates } as Book;
  await safeSet(id, updated, booksStore);
}

export async function deleteBook(id: string): Promise<void> {
  await safeDel(id, booksStore);
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
  const allEntries = await safeEntries(notesStore);
  return allEntries
    .map(([, value]) => value as Note)
    .filter((note: Note) => note.bookId === bookId);
}

export async function getAllNotes(): Promise<Note[]> {
  const allEntries = await safeEntries(notesStore);
  return allEntries.map(([, value]) => value as Note);
}

export async function addNote(note: Note): Promise<void> {
  await safeSet(note.id, note, notesStore);
}

export async function updateNote(id: string, updates: Partial<Note>): Promise<void> {
  const allEntries = await safeEntries(notesStore);
  const found = allEntries.find(([key]) => key === id);
  if (!found) return;
  const existing = found[1] as Note;
  const updated = { ...existing, ...updates } as Note;
  await safeSet(id, updated, notesStore);
}

export async function deleteNote(id: string): Promise<void> {
  await safeDel(id, notesStore);
}

export async function getBookBookmarks(bookId: string): Promise<Bookmark[]> {
  const allEntries = await safeEntries(bookmarksStore);
  return allEntries
    .map(([, value]) => value as Bookmark)
    .filter((bookmark: Bookmark) => bookmark.bookId === bookId);
}

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const allEntries = await safeEntries(bookmarksStore);
  return allEntries.map(([, value]) => value as Bookmark);
}

export async function addBookmark(bookmark: Bookmark): Promise<void> {
  await safeSet(bookmark.id, bookmark, bookmarksStore);
}

export async function deleteBookmark(id: string): Promise<void> {
  await safeDel(id, bookmarksStore);
}

export async function getSettings(): Promise<ReaderSettings | undefined> {
  try {
    const saved = await safeGet<ReaderSettings>(READER_SETTINGS_KEY, settingsStore);
    if (!saved) return undefined;
    return { ...DEFAULT_READER_SETTINGS, ...saved };
  } catch (e) {
    console.warn('getSettings error, using defaults:', e);
    return undefined;
  }
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  await safeSet(READER_SETTINGS_KEY, settings, settingsStore);
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
  await safeClear(booksStore);
  await safeClear(notesStore);
  await safeClear(bookmarksStore);

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
