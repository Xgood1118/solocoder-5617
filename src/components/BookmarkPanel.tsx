import React, { useState, useMemo } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import { useNoteStore } from '../stores/useNoteStore';
import type { Bookmark } from '../types';

export const BookmarkPanel: React.FC = () => {
  const { books, currentBookId } = useBookStore();
  const { setPage, currentPage } = useReaderStore();
  const { bookmarks, createBookmark, deleteBookmark } = useNoteStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');

  const currentBook = useMemo(
    () => books.find((b) => b.id === currentBookId),
    [books, currentBookId]
  );

  const bookBookmarks = useMemo(() => {
    if (!currentBookId) return [];
    return bookmarks
      .filter((b) => b.bookId === currentBookId)
      .sort((a, b) => a.page - b.page);
  }, [bookmarks, currentBookId]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleJumpToBookmark = (bookmark: Bookmark) => {
    setPage(bookmark.page);
  };

  const handleAddCurrent = () => {
    if (!currentBookId || !currentBook) return;
    const existing = bookBookmarks.find((b) => b.page === currentPage);
    if (existing) return;
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
  };

  const isCurrentPageBookmarked = useMemo(() => {
    return bookBookmarks.some((b) => b.page === currentPage);
  }, [bookBookmarks, currentPage]);

  const handleStartEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditNote(bookmark.note || '');
  };

  const handleSaveEdit = (bookmark: Bookmark) => {
    deleteBookmark(bookmark.id);
    createBookmark({
      bookId: bookmark.bookId,
      chapterId: bookmark.chapterId,
      chapterTitle: bookmark.chapterTitle,
      page: bookmark.page,
      position: bookmark.position,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
    setEditNote('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '8px 12px 12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <button
          onClick={handleAddCurrent}
          disabled={isCurrentPageBookmarked}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: isCurrentPageBookmarked
              ? 'var(--border-color)'
              : 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)',
            border: isCurrentPageBookmarked
              ? '1px solid var(--border-color)'
              : '1px solid var(--accent-color)',
            borderRadius: '6px',
            color: isCurrentPageBookmarked ? 'var(--text-color)' : 'var(--accent-color)',
            cursor: isCurrentPageBookmarked ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            opacity: isCurrentPageBookmarked ? 0.6 : 1,
          }}
        >
          {isCurrentPageBookmarked ? '✓ 已添加书签' : `🔖 添加当前页 (第 ${currentPage} 页)`}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {bookBookmarks.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔖</div>
            <div style={{ fontSize: '13px' }}>暂无书签</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              点击上方按钮添加当前页
            </div>
          </div>
        ) : (
          bookBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              style={{
                margin: '0 12px 8px',
                padding: '12px',
                backgroundColor:
                  bookmark.page === currentPage
                    ? 'color-mix(in srgb, var(--bg-color) 88%, var(--accent-color) 12%)'
                    : 'color-mix(in srgb, var(--bg-color) 95%, var(--border-color) 5%)',
                borderRadius: '6px',
                border:
                  bookmark.page === currentPage
                    ? '1px solid color-mix(in srgb, var(--accent-color) 50%, transparent)'
                    : '1px solid var(--border-color)',
                transition: 'all 0.2s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <div
                  onClick={() => handleJumpToBookmark(bookmark)}
                  style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--accent-color)',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📑 {bookmark.chapterTitle || '未知章节'}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => handleStartEdit(bookmark)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      opacity: 0.7,
                    }}
                    title="编辑备注"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '2px 4px',
                      opacity: 0.7,
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {editingId === bookmark.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="添加备注..."
                    style={{
                      padding: '6px 8px',
                      border: '1px solid var(--accent-color)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-color)',
                      color: 'var(--text-color)',
                      fontSize: '12px',
                      resize: 'vertical',
                      minHeight: '50px',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditNote('');
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-color)',
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSaveEdit(bookmark)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: 'var(--accent-color)',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                bookmark.note && (
                  <div
                    style={{
                      fontSize: '12px',
                      lineHeight: 1.5,
                      color: 'var(--text-color)',
                      backgroundColor: 'color-mix(in srgb, var(--bg-color) 70%, var(--highlight-yellow) 30%)',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      marginBottom: '6px',
                    }}
                  >
                    {bookmark.note}
                  </div>
                )
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  opacity: 0.6,
                  marginTop: '4px',
                }}
              >
                <span>第 {bookmark.page} 页</span>
                <span>{formatDate(bookmark.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
