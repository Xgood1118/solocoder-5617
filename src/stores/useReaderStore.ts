import { create } from 'zustand';
import { db } from '../db';
import type { ReaderSettings } from '../types';
import { useBookStore } from './useBookStore';

type SidebarTab = 'toc' | 'bookmarks' | 'notes' | 'search';

const DEFAULT_SETTINGS: ReaderSettings = {
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

interface ReaderStore {
  settings: ReaderSettings;
  sidebarOpen: boolean;
  activeSidebarTab: SidebarTab;
  tocOpen: boolean;
  settingsOpen: boolean;
  bookmarksOpen: boolean;
  notesOpen: boolean;
  currentPage: number;
  totalPages: number;

  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<ReaderSettings>) => Promise<void>;
  toggleSidebar: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  openSidebarAndTab: (tab: SidebarTab) => void;
  toggleToc: () => void;
  toggleSettings: () => void;
  toggleBookmarks: () => void;
  toggleNotes: () => void;
  setPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  resetPageForBook: (totalPages: number, savedPage?: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToChapter: (chapterId: string) => void;
}

export const useReaderStore = create<ReaderStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  sidebarOpen: false,
  activeSidebarTab: 'toc',
  tocOpen: false,
  settingsOpen: false,
  bookmarksOpen: false,
  notesOpen: false,
  currentPage: 1,
  totalPages: 0,

  async loadSettings() {
    try {
      const saved = await db.getSettings();
      set({ settings: { ...DEFAULT_SETTINGS, ...(saved || {}) } });
    } catch (error) {
      console.warn('Failed to load settings from IndexedDB, using defaults:', error);
      set({ settings: { ...DEFAULT_SETTINGS } });
    }
  },

  async updateSettings(partial: Partial<ReaderSettings>) {
    const newSettings = { ...get().settings, ...partial };
    try {
      await db.saveSettings(newSettings);
    } catch (error) {
      console.warn('Failed to save settings to IndexedDB:', error);
    }
    set({ settings: newSettings });
  },

  toggleSidebar() {
    set(state => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setActiveSidebarTab(tab: SidebarTab) {
    set({ activeSidebarTab: tab });
  },

  openSidebarAndTab(tab: SidebarTab) {
    set({ sidebarOpen: true, activeSidebarTab: tab });
  },

  toggleToc() {
    const state = get();
    set({
      sidebarOpen: !state.sidebarOpen || state.activeSidebarTab !== 'toc',
      activeSidebarTab: 'toc',
    });
  },

  toggleSettings() {
    set(state => ({ settingsOpen: !state.settingsOpen }));
  },

  toggleBookmarks() {
    const state = get();
    set({
      sidebarOpen: !state.sidebarOpen || state.activeSidebarTab !== 'bookmarks',
      activeSidebarTab: 'bookmarks',
    });
  },

  toggleNotes() {
    const state = get();
    set({
      sidebarOpen: !state.sidebarOpen || state.activeSidebarTab !== 'notes',
      activeSidebarTab: 'notes',
    });
  },

  setPage(page: number) {
    const { totalPages } = get();
    const clampedPage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
    set({ currentPage: clampedPage });
  },

  setTotalPages(total: number) {
    const t = Math.max(0, Math.floor(total));
    set(state => ({
      totalPages: t,
      currentPage: Math.max(1, Math.min(state.currentPage, Math.max(1, t))),
    }));
  },

  resetPageForBook(totalPages: number, savedPage?: number) {
    const t = Math.max(1, Math.floor(totalPages));
    const p = savedPage && savedPage >= 1 && savedPage <= t ? savedPage : 1;
    set({ totalPages: t, currentPage: p });
  },

  nextPage() {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  prevPage() {
    const { currentPage } = get();
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
    }
  },

  goToChapter(chapterId: string) {
    const currentBookId = useBookStore.getState().currentBookId;
    if (!currentBookId) return;
    const book = useBookStore.getState().books.find(b => b.id === currentBookId);
    if (!book) return;
    const chapter = book.chapters.find(c => c.id === chapterId);
    if (chapter) {
      set({ currentPage: Math.max(1, chapter.startPage) });
    }
  },
}));
