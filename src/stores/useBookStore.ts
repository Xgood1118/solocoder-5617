import { create } from 'zustand';
import { db } from '../db';
import type { Book, BookStatus, LibraryExportData } from '../types';

interface BookStore {
  books: Book[];
  currentBookId: string | null;
  loading: boolean;
  searchQuery: string;
  filterStatus: BookStatus | 'all';
  activeTag: string | null;

  loadBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  setCurrentBook: (id: string | null) => void;
  updateProgress: (
    bookId: string,
    chapterId: string | null,
    position: number,
    page: number,
    totalPages: number
  ) => Promise<void>;
  addReadingTime: (bookId: string, seconds: number) => Promise<void>;
  setStatus: (bookId: string, status: BookStatus) => Promise<void>;
  setRating: (bookId: string, rating: number) => Promise<void>;
  addTag: (bookId: string, tag: string) => Promise<void>;
  removeTag: (bookId: string, tag: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: BookStatus | 'all') => void;
  setActiveTag: (tag: string | null) => void;
  exportLibrary: () => Promise<LibraryExportData>;
  importLibrary: (data: LibraryExportData) => Promise<void>;
}

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  currentBookId: null,
  loading: false,
  searchQuery: '',
  filterStatus: 'all',
  activeTag: null,

  async loadBooks() {
    set({ loading: true });
    try {
      const books = await db.getAllBooks();
      set({ books, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error('Failed to load books:', error);
    }
  },

  async addBook(book: Book) {
    await db.addBook(book);
    set(state => ({
      books: [...state.books, book],
    }));
  },

  async updateBook(id: string, updates: Partial<Book>) {
    await db.updateBook(id, updates);
    set(state => ({
      books: state.books.map(b =>
        b.id === id ? { ...b, ...updates, updatedAt: Date.now() } as Book : b
      ),
    }));
  },

  async removeBook(id: string) {
    await db.deleteBook(id);
    set(state => ({
      books: state.books.filter(b => b.id !== id),
      currentBookId: state.currentBookId === id ? null : state.currentBookId,
    }));
  },

  setCurrentBook(id: string | null) {
    set({ currentBookId: id });
  },

  async updateProgress(
    bookId: string,
    chapterId: string | null,
    position: number,
    page: number,
    totalPages: number
  ) {
    const updates = {
      progress: {
        chapterId,
        position,
        page,
        totalPages,
        updatedAt: Date.now(),
      },
    };
    await db.updateBook(bookId, updates);
    set(state => ({
      books: state.books.map(b =>
        b.id === bookId
          ? {
              ...b,
              progress: {
                chapterId,
                position,
                page,
                totalPages,
                updatedAt: Date.now(),
              },
              updatedAt: Date.now(),
            } as Book
          : b
      ),
    }));
  },

  async addReadingTime(bookId: string, seconds: number) {
    const book = get().books.find(b => b.id === bookId);
    if (!book) return;
    const newReadingTime = book.readingTime + seconds;
    await db.updateBook(bookId, { readingTime: newReadingTime });
    set(state => ({
      books: state.books.map(b =>
        b.id === bookId
          ? { ...b, readingTime: newReadingTime, updatedAt: Date.now() } as Book
          : b
      ),
    }));
  },

  async setStatus(bookId: string, status: BookStatus) {
    await get().updateBook(bookId, { status });
  },

  async setRating(bookId: string, rating: number) {
    await get().updateBook(bookId, { rating });
  },

  async addTag(bookId: string, tag: string) {
    const book = get().books.find(b => b.id === bookId);
    if (!book || book.tags.includes(tag)) return;
    const newTags = [...book.tags, tag];
    await get().updateBook(bookId, { tags: newTags });
  },

  async removeTag(bookId: string, tag: string) {
    const book = get().books.find(b => b.id === bookId);
    if (!book) return;
    const newTags = book.tags.filter(t => t !== tag);
    await get().updateBook(bookId, { tags: newTags });
  },

  setSearchQuery(query: string) {
    set({ searchQuery: query });
  },

  setFilterStatus(status: BookStatus | 'all') {
    set({ filterStatus: status });
  },

  setActiveTag(tag: string | null) {
    set({ activeTag: tag });
  },

  async exportLibrary() {
    const { books } = get();
    const notes = await db.getAllNotes();
    const bookmarks = await db.getAllBookmarks();
    const settings = await db.getSettings();
    const data: LibraryExportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      books,
      notes,
      bookmarks,
      settings: settings || {
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
      },
    };
    return data;
  },

  async importLibrary(data: LibraryExportData) {
    for (const book of data.books) {
      await db.addBook(book);
    }
    for (const note of data.notes) {
      await db.addNote(note);
    }
    for (const bookmark of data.bookmarks) {
      await db.addBookmark(bookmark);
    }
    if (data.settings) {
      await db.saveSettings(data.settings);
    }
    set({
      books: data.books,
    });
  },
}));
