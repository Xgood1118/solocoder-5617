import React, { useState } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import { useNoteStore } from '../stores/useNoteStore';
import type { BookStatus } from '../types';

export const Toolbar: React.FC = () => {
  const { books, currentBookId, setCurrentBook, setStatus, setRating } = useBookStore();
  const {
    settings,
    currentPage,
    totalPages,
    toggleSidebar,
    toggleToc,
    toggleSettings,
    toggleBookmarks,
    toggleNotes,
  } = useReaderStore();
  const { bookmarks, createBookmark, deleteBookmark } = useNoteStore();
  const [showMore, setShowMore] = useState(false);

  const currentBook = books.find((b) => b.id === currentBookId);
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const isBookmarked = currentBookId
    ? bookmarks.some((b) => b.bookId === currentBookId && b.page === currentPage)
    : false;

  const handleBack = () => {
    setCurrentBook(null);
  };

  const handleBookmark = () => {
    if (!currentBookId || !currentBook) return;
    const existing = bookmarks.find(
      (b) => b.bookId === currentBookId && b.page === currentPage
    );
    if (existing) {
      deleteBookmark(existing.id);
    } else {
      const chapter = currentBook.chapters.find(
        (c) => currentPage >= c.startPage && (c.pageEnd ? currentPage <= c.pageEnd : true)
      );
      createBookmark({
        bookId: currentBookId,
        chapterId: chapter?.id || '',
        chapterTitle: chapter?.title || '',
        page: currentPage,
        position: currentPage,
      });
    }
  };

  const handleStatusChange = (status: BookStatus) => {
    if (!currentBookId) return;
    setStatus(currentBookId, status);
    setShowMore(false);
  };

  const handleRatingChange = (rating: number) => {
    if (!currentBookId) return;
    setRating(currentBookId, rating);
    setShowMore(false);
  };

  const buttonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-color)',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '16px',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  };

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  return (
    <div style={toolbarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button style={buttonStyle} onClick={handleBack} title="返回图书馆">
          ←
        </button>
        <button style={buttonStyle} onClick={toggleSidebar} title="目录">
          ☰
        </button>
        <button
          style={{
            ...buttonStyle,
            color: isBookmarked ? '#f4b400' : 'var(--text-color)',
          }}
          onClick={handleBookmark}
          title={isBookmarked ? '取消书签' : '添加书签'}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '15px',
            color: 'var(--text-color)',
            textAlign: 'center',
            maxWidth: '50vw',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {currentBook?.title || '阅读器'}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
          第 {currentPage} / {totalPages || 0} 页 · {progressPercent}%
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
        <button style={buttonStyle} onClick={toggleToc} title="搜索">
          🔍
        </button>
        <button style={buttonStyle} onClick={toggleSettings} title="设置">
          ⚙️
        </button>
        <button
          style={{
            ...buttonStyle,
            fontWeight: settings.showMarginNotes ? 700 : 400,
          }}
          onClick={toggleNotes}
          title="笔记"
        >
          📝
        </button>
        <div style={{ position: 'relative' }}>
          <button style={buttonStyle} onClick={() => setShowMore(!showMore)} title="更多">
            ⋮
          </button>
          {showMore && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                backgroundColor: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 0',
                minWidth: '180px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 200,
              }}
            >
              <div style={{ padding: '8px 16px', fontSize: '12px', opacity: 0.7 }}>
                阅读状态
              </div>
              {(['want', 'reading', 'finished'] as BookStatus[]).map((status) => (
                <div
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor:
                      currentBook?.status === status ? 'color-mix(in srgb, var(--bg-color) 80%, var(--accent-color) 20%)' : 'transparent',
                  }}
                >
                  <span>
                    {status === 'want' && '📋'}
                    {status === 'reading' && '📖'}
                    {status === 'finished' && '✅'}
                  </span>
                  <span style={{ fontSize: '14px' }}>
                    {status === 'want' ? '想读' : status === 'reading' ? '在读' : '已读'}
                  </span>
                </div>
              ))}
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'var(--border-color)',
                  margin: '8px 0',
                }}
              />
              <div style={{ padding: '8px 16px', fontSize: '12px', opacity: 0.7 }}>
                评分
              </div>
              <div style={{ padding: '8px 16px', display: 'flex', gap: '4px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => handleRatingChange(star)}
                    style={{
                      cursor: 'pointer',
                      color: (currentBook?.rating || 0) >= star ? '#f4b400' : 'var(--border-color)',
                      fontSize: '18px',
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
