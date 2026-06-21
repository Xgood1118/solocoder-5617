import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import { useNoteStore } from '../stores/useNoteStore';
import type { Book, Chapter } from '../types';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { NotePanel } from './NotePanel';
import { SettingsPanel } from './SettingsPanel';
import { SelectionToolbar } from './SelectionToolbar';
import { ProgressBar } from './ProgressBar';

const themeStyles: Record<string, Record<string, string>> = {
  light: {
    '--bg-color': '#ffffff',
    '--text-color': '#333333',
    '--accent-color': '#4a90d9',
    '--border-color': '#e0e0e0',
    '--highlight-yellow': 'rgba(255, 245, 157, 0.5)',
    '--highlight-green': 'rgba(144, 238, 144, 0.5)',
    '--highlight-blue': 'rgba(173, 216, 230, 0.5)',
    '--highlight-pink': 'rgba(255, 192, 203, 0.5)',
  },
  sepia: {
    '--bg-color': '#f4ecd8',
    '--text-color': '#5b4636',
    '--accent-color': '#8b7355',
    '--border-color': '#d4c4a8',
    '--highlight-yellow': 'rgba(255, 245, 157, 0.6)',
    '--highlight-green': 'rgba(144, 238, 144, 0.6)',
    '--highlight-blue': 'rgba(173, 216, 230, 0.6)',
    '--highlight-pink': 'rgba(255, 192, 203, 0.6)',
  },
  dark: {
    '--bg-color': '#1a1a2e',
    '--text-color': '#e0e0e0',
    '--accent-color': '#64b5f6',
    '--border-color': '#2d2d44',
    '--highlight-yellow': 'rgba(255, 245, 157, 0.3)',
    '--highlight-green': 'rgba(144, 238, 144, 0.3)',
    '--highlight-blue': 'rgba(173, 216, 230, 0.3)',
    '--highlight-pink': 'rgba(255, 192, 203, 0.3)',
  },
  night: {
    '--bg-color': '#000000',
    '--text-color': '#a0a0a0',
    '--accent-color': '#4a90d9',
    '--border-color': '#1a1a1a',
    '--highlight-yellow': 'rgba(255, 245, 157, 0.25)',
    '--highlight-green': 'rgba(144, 238, 144, 0.25)',
    '--highlight-blue': 'rgba(173, 216, 230, 0.25)',
    '--highlight-pink': 'rgba(255, 192, 203, 0.25)',
  },
};

const fontSizes: Record<string, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

const fontFamilyMap: Record<string, string> = {
  serif: '"Georgia", "Times New Roman", serif',
  'sans-serif': '"Helvetica Neue", Arial, sans-serif',
  song: '"SimSun", "Songti SC", serif',
  'source-han-sans': '"Source Han Sans CN", "Noto Sans CJK SC", sans-serif',
  monospace: '"Consolas", "Monaco", "Courier New", monospace',
};

export const Reader: React.FC = () => {
  const { books, currentBookId, updateProgress } = useBookStore();
  const { settings, currentPage, totalPages, nextPage, prevPage, setPage, tocOpen, notesOpen, settingsOpen, sidebarOpen } = useReaderStore();
  const { notes, selection, toolbarVisible, clearSelection, setSelection, showToolbar } = useNoteStore();

  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [animationClass, setAnimationClass] = useState<string>('');
  const prevBookIdRef = useRef<string | null>(null);
  const { resetPageForBook, loadBookNotes, loadBookBookmarks } = {
    resetPageForBook: useReaderStore((s) => s.resetPageForBook),
    loadBookNotes: useNoteStore((s) => s.loadBookNotes),
    loadBookBookmarks: useNoteStore((s) => s.loadBookBookmarks),
  };

  const currentBook = useMemo<Book | undefined>(
    () => books.find((b) => b.id === currentBookId),
    [books, currentBookId]
  );

  useEffect(() => {
    if (!currentBookId || currentBookId === prevBookIdRef.current) return;
    prevBookIdRef.current = currentBookId;
    const book = books.find((b) => b.id === currentBookId);
    if (!book) return;
    const savedPage = book.progress?.page;
    const tp = book.totalPages || book.chapters.length;
    resetPageForBook(tp, savedPage);
    loadBookNotes(currentBookId);
    loadBookBookmarks(currentBookId);
  }, [currentBookId, books, resetPageForBook, loadBookNotes, loadBookBookmarks]);

  const currentChapter = useMemo<Chapter | undefined>(() => {
    if (!currentBook) return undefined;
    return currentBook.chapters.find(
      (c) => currentPage >= c.startPage && (c.pageEnd ? currentPage <= c.pageEnd : true)
    );
  }, [currentBook, currentPage]);

  const progressPercent = useMemo(() => {
    if (totalPages <= 0) return 0;
    return Math.round((currentPage / totalPages) * 100);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!currentBookId || totalPages <= 0 || currentPage <= 0) return;
    const timer = window.setTimeout(() => {
      void updateProgress(
        currentBookId,
        currentChapter?.id || null,
        currentPage,
        currentPage,
        totalPages
      );
    }, 500);
    return () => window.clearTimeout(timer);
  }, [currentBookId, currentPage, totalPages, currentChapter, updateProgress]);

  const pageNotes = useMemo(() => {
    if (!currentBookId) return [];
    return notes.filter((n) => n.bookId === currentBookId && n.page === currentPage);
  }, [notes, currentBookId, currentPage]);

  useEffect(() => {
    const html = document.documentElement;
    const themeVars = themeStyles[settings.theme] || themeStyles.light;
    Object.entries(themeVars).forEach(([key, value]) => {
      html.style.setProperty(key, value);
    });
  }, [settings.theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!settings.keyboardNavigation) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === 'Escape') {
        clearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation, nextPage, prevPage, clearSelection]);

  const handleNextPage = useCallback(() => {
    if (settings.pageAnimation !== 'none') {
      setAnimationClass(settings.pageAnimation === 'slide' ? 'slide-left' : 'flip-next');
      setTimeout(() => setAnimationClass(''), 300);
    }
    nextPage();
  }, [settings.pageAnimation, nextPage]);

  const handlePrevPage = useCallback(() => {
    if (settings.pageAnimation !== 'none') {
      setAnimationClass(settings.pageAnimation === 'slide' ? 'slide-right' : 'flip-prev');
      setTimeout(() => setAnimationClass(''), 300);
    }
    prevPage();
  }, [settings.pageAnimation, prevPage]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!settings.tapToTurn) return;
      if (window.getSelection()?.toString()) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const thirdWidth = rect.width / 3;
      if (x < thirdWidth) {
        handlePrevPage();
      } else if (x > rect.width - thirdWidth) {
        handleNextPage();
      }
    },
    [settings.tapToTurn, handleNextPage, handlePrevPage]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!settings.swipeToTurn) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    },
    [settings.swipeToTurn]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!settings.swipeToTurn) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
      const minSwipeDistance = 50;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handlePrevPage();
        } else {
          handleNextPage();
        }
      }
    },
    [settings.swipeToTurn, handleNextPage, handlePrevPage]
  );

  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim() === '') {
      clearSelection();
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({
      text: sel.toString(),
      rect,
      chapterId: currentChapter?.id || null,
    });
    showToolbar(true);
  }, [currentChapter, setSelection, showToolbar, clearSelection]);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  const getCurrentPageContent = useCallback(() => {
    if (!currentBook || !currentChapter) return '';
    if (settings.readingMode === 'scroll') {
      return currentBook.chapters
        .map((ch) => ch.content || `<h2>${ch.title}</h2>`)
        .join('<hr style="margin: 40px 0; border: none; border-top: 1px solid var(--border-color);" />');
    }
    return currentChapter.content || `<h2>${currentChapter.title}</h2>`;
  }, [currentBook, currentChapter, settings.readingMode]);

  const getHighlightedContent = useCallback((html: string) => {
    if (!currentBook || !settings.showMarginNotes) return html;
    let result = html;
    const bookNotes = notes.filter((n) => n.bookId === currentBook.id);
    bookNotes.forEach((note) => {
      if (note.text && note.color) {
        const colorVar = `var(--highlight-${note.color})`;
        const regex = new RegExp(note.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        result = result.replace(
          regex,
          `<mark style="background-color: ${colorVar}; padding: 2px 4px; border-radius: 3px;" data-note-id="${note.id}">${note.text}</mark>`
        );
      }
    });
    return result;
  }, [notes, currentBook, settings.showMarginNotes]);

  const readerStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontSize: fontSizes[settings.fontSize] || fontSizes.md,
    fontFamily: fontFamilyMap[settings.fontFamily] || fontFamilyMap.serif,
    lineHeight: settings.lineHeight,
    filter: `brightness(${settings.brightness / 100})`,
    minHeight: '100vh',
    transition: 'all 0.3s ease',
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '40px 32px',
    cursor: settings.tapToTurn ? 'pointer' : 'default',
    userSelect: 'text',
  };

  const scrollContentStyle: React.CSSProperties = {
    ...contentStyle,
    cursor: 'text',
  };

  const animationStyles: Record<string, React.CSSProperties> = {
    'slide-left': { animation: 'slideLeft 0.3s ease' },
    'slide-right': { animation: 'slideRight 0.3s ease' },
    'flip-next': { animation: 'flipNext 0.3s ease', transformOrigin: 'left center' },
    'flip-prev': { animation: 'flipPrev 0.3s ease', transformOrigin: 'right center' },
  };

  if (!currentBook) {
    return (
      <div style={readerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <p>未选择书籍，返回图书馆选择一本书开始阅读</p>
        </div>
      </div>
    );
  }

  return (
    <div style={readerStyle}>
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideRight {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes flipNext {
          from { transform: perspective(1000px) rotateY(-90deg); opacity: 0; }
          to { transform: perspective(1000px) rotateY(0); opacity: 1; }
        }
        @keyframes flipPrev {
          from { transform: perspective(1000px) rotateY(90deg); opacity: 0; }
          to { transform: perspective(1000px) rotateY(0); opacity: 1; }
        }
        .reader-content p { margin-bottom: ${settings.paragraphSpacing}px; }
        .margin-note {
          position: absolute;
          right: -240px;
          width: 200px;
          font-size: 0.85em;
          padding: 8px 12px;
          border-left: 3px solid var(--accent-color);
          background: color-mix(in srgb, var(--bg-color) 90%, var(--accent-color) 10%);
          border-radius: 0 4px 4px 0;
        }
      `}</style>

      <Toolbar />

      {sidebarOpen && <Sidebar />}

      {settingsOpen && <SettingsPanel />}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 100px)', paddingBottom: '60px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {settings.readingMode === 'page' ? (
            <div
              ref={contentRef}
              onClick={handleClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="reader-content"
              style={{
                ...contentStyle,
                ...(animationClass ? animationStyles[animationClass] : {}),
                position: 'relative',
              }}
              dangerouslySetInnerHTML={{ __html: getHighlightedContent(getCurrentPageContent()) }}
            />
          ) : (
            <div
              ref={contentRef}
              className="reader-content"
              style={scrollContentStyle}
              dangerouslySetInnerHTML={{ __html: getHighlightedContent(getCurrentPageContent()) }}
            />
          )}

          {settings.showMarginNotes &&
            pageNotes.filter((n) => n.type === 'note' && n.noteText).map((note) => (
              <div
                key={note.id}
                className="margin-note"
                style={{
                  position: 'absolute',
                  right: '16px',
                  width: '200px',
                  fontSize: '0.85em',
                  padding: '8px 12px',
                  borderLeft: '3px solid var(--accent-color)',
                  background: 'color-mix(in srgb, var(--bg-color) 90%, var(--accent-color) 10%)',
                  borderRadius: '0 4px 4px 0',
                  marginBottom: '12px',
                }}
              >
                <div style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '4px' }}>{note.text}</div>
                <div style={{ fontSize: '0.95em' }}>{note.noteText}</div>
              </div>
            ))}
        </div>

        {notesOpen && <NotePanel />}
      </div>

      {toolbarVisible && selection && <SelectionToolbar />}

      <ProgressBar
        currentPage={currentPage}
        totalPages={totalPages}
        progressPercent={progressPercent}
        chapterTitle={currentChapter?.title || ''}
        onSeek={setPage}
      />
    </div>
  );
};
