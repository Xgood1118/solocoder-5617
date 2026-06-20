import { create } from 'zustand';
import { db } from '../db';
import type { Note, Bookmark } from '../types';
import { useBookStore } from './useBookStore';

interface Selection {
  text: string;
  rect: DOMRect | null;
  chapterId: string | null;
}

interface NoteStore {
  notes: Note[];
  bookmarks: Bookmark[];
  selection: Selection | null;
  toolbarVisible: boolean;

  loadBookNotes: (bookId: string) => Promise<void>;
  loadBookBookmarks: (bookId: string) => Promise<void>;
  createHighlight: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'type'>) => Promise<void>;
  createNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'type'>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  createBookmark: (data: Omit<Bookmark, 'id' | 'createdAt'>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  setSelection: (selection: Selection | null) => void;
  clearSelection: () => void;
  showToolbar: (visible: boolean) => void;
  exportNotes: (bookId: string) => Promise<string>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  bookmarks: [],
  selection: null,
  toolbarVisible: false,

  async loadBookNotes(bookId: string) {
    try {
      const notes = await db.getBookNotes(bookId);
      set({ notes });
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  },

  async loadBookBookmarks(bookId: string) {
    try {
      const bookmarks = await db.getBookBookmarks(bookId);
      set({ bookmarks });
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  },

  async createHighlight(noteData) {
    const now = Date.now();
    const note: Note = {
      ...noteData,
      id: generateId(),
      type: 'highlight',
      createdAt: now,
      updatedAt: now,
    };
    await db.addNote(note);
    set(state => ({ notes: [...state.notes, note] }));
  },

  async createNote(noteData) {
    const now = Date.now();
    const note: Note = {
      ...noteData,
      id: generateId(),
      type: 'note',
      createdAt: now,
      updatedAt: now,
    };
    await db.addNote(note);
    set(state => ({ notes: [...state.notes, note] }));
  },

  async updateNote(id: string, updates: Partial<Note>) {
    await db.updateNote(id, updates);
    set(state => ({
      notes: state.notes.map(n =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
      ),
    }));
  },

  async deleteNote(id: string) {
    await db.deleteNote(id);
    set(state => ({
      notes: state.notes.filter(n => n.id !== id),
    }));
  },

  async createBookmark(data) {
    const now = Date.now();
    const bookmark: Bookmark = {
      ...data,
      id: generateId(),
      createdAt: now,
    };
    await db.addBookmark(bookmark);
    set(state => ({ bookmarks: [...state.bookmarks, bookmark] }));
  },

  async deleteBookmark(id: string) {
    await db.deleteBookmark(id);
    set(state => ({
      bookmarks: state.bookmarks.filter(b => b.id !== id),
    }));
  },

  setSelection(selection: Selection | null) {
    set({ selection });
  },

  clearSelection() {
    set({ selection: null, toolbarVisible: false });
  },

  showToolbar(visible: boolean) {
    set({ toolbarVisible: visible });
  },

  async exportNotes(bookId: string): Promise<string> {
    const notes = await db.getBookNotes(bookId);
    const book = useBookStore.getState().books.find(b => b.id === bookId);
    if (!book) return '';

    const notesByChapter = notes.reduce<Record<string, Note[]>>(
      (acc: Record<string, Note[]>, note: Note) => {
        if (!acc[note.chapterId]) {
          acc[note.chapterId] = [];
        }
        acc[note.chapterId].push(note);
        return acc;
      },
      {} as Record<string, Note[]>
    );

    const lines: string[] = [];
    lines.push(`# ${book.title}`);
    lines.push('');
    if (book.author) {
      lines.push(`**作者**: ${book.author}`);
      lines.push('');
    }
    lines.push(`**导出时间**: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const chapter of book.chapters) {
      const chapterNotes = notesByChapter[chapter.id];
      if (!chapterNotes || chapterNotes.length === 0) continue;

      lines.push(`## ${chapter.title}`);
      lines.push('');

      const sortedNotes = [...chapterNotes].sort((a, b) => a.page - b.page);

      for (const note of sortedNotes) {
        lines.push(`### 第 ${note.page} 页`);
        lines.push('');

        if (note.text) {
          lines.push(`> ${note.text.replace(/\n/g, '\n> ')}`);
          lines.push('');
        }

        if (note.type === 'note' && note.noteText) {
          lines.push(note.noteText);
          lines.push('');
        }

        lines.push(`*创建时间: ${new Date(note.createdAt).toLocaleString()}*`);
        lines.push('');
      }
    }

    return lines.join('\n');
  },
}));
