import React, { useMemo } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import type { Chapter } from '../types';

export const Toc: React.FC = () => {
  const { books, currentBookId } = useBookStore();
  const { currentPage, totalPages, goToChapter } = useReaderStore();

  const currentBook = useMemo(
    () => books.find((b) => b.id === currentBookId),
    [books, currentBookId]
  );

  const getChapterProgress = (chapter: Chapter): number => {
    if (totalPages <= 0) return 0;
    const chapterEnd = chapter.pageEnd || totalPages;
    const chapterTotal = chapterEnd - chapter.startPage + 1;
    if (currentPage < chapter.startPage) return 0;
    if (currentPage > chapterEnd) return 100;
    const readInChapter = currentPage - chapter.startPage + 1;
    return Math.round((readInChapter / chapterTotal) * 100);
  };

  const isChapterActive = (chapter: Chapter): boolean => {
    const chapterEnd = chapter.pageEnd || totalPages;
    return currentPage >= chapter.startPage && currentPage <= chapterEnd;
  };

  const getChapterIndent = (title: string): number => {
    const match = title.match(/^(\s*)/);
    return match ? Math.min(match[1].length, 3) : 0;
  };

  if (!currentBook) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', opacity: 0.6 }}>
        暂无书籍数据
      </div>
    );
  }

  if (currentBook.chapters.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', opacity: 0.6 }}>
        暂无目录
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 0' }}>
      {currentBook.chapters.map((chapter) => {
        const isActive = isChapterActive(chapter);
        const progress = getChapterProgress(chapter);
        const indent = getChapterIndent(chapter.title);
        return (
          <div
            key={chapter.id}
            onClick={() => goToChapter(chapter.id)}
            style={{
              padding: '10px 16px 10px',
              paddingLeft: `${16 + indent * 16}px`,
              cursor: 'pointer',
              borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
              backgroundColor: isActive
                ? 'color-mix(in srgb, var(--bg-color) 90%, var(--accent-color) 10%)'
                : 'transparent',
              transition: 'all 0.2s',
              marginBottom: '2px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: isActive ? 'var(--accent-color)' : 'var(--text-color)',
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1.4,
                  flex: 1,
                  wordBreak: 'break-word',
                }}
              >
                {chapter.title.trim()}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  opacity: 0.5,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {chapter.startPage}
              </div>
            </div>
            {progress > 0 && progress < 100 && (
              <div
                style={{
                  marginTop: '6px',
                  height: '3px',
                  backgroundColor: 'var(--border-color)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent-color)',
                    borderRadius: '2px',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
