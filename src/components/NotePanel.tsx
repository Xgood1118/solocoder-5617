import React, { useState, useMemo } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import { useNoteStore } from '../stores/useNoteStore';
import type { Note } from '../types';

export const NotePanel: React.FC = () => {
  const { books, currentBookId } = useBookStore();
  const { currentPage, setPage, notesOpen, toggleNotes } = useReaderStore();
  const { notes, selection, createNote, updateNote, deleteNote } = useNoteStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);

  const currentBook = useMemo(
    () => books.find((b) => b.id === currentBookId),
    [books, currentBookId]
  );

  const bookNotes = useMemo(() => {
    if (!currentBookId) return [];
    return notes.filter((n) => n.bookId === currentBookId);
  }, [notes, currentBookId]);

  const notesByChapter = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    bookNotes.forEach((note) => {
      if (!grouped[note.chapterId]) {
        grouped[note.chapterId] = [];
      }
      grouped[note.chapterId].push(note);
    });
    Object.keys(grouped).forEach((chapterId) => {
      grouped[chapterId].sort((a, b) => a.page - b.page);
    });
    return grouped;
  }, [bookNotes]);

  const getChapterTitle = (chapterId: string): string => {
    const chapter = currentBook?.chapters.find((c) => c.id === chapterId);
    return chapter?.title || '未知章节';
  };

  const handleJumpToNote = (note: Note) => {
    setPage(note.page);
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.noteText || '');
  };

  const handleSaveEdit = (note: Note) => {
    updateNote(note.id, { noteText: editContent });
    setEditingId(null);
    setEditContent('');
  };

  const handleCreateNote = () => {
    if (!currentBookId || !newNoteText.trim()) return;
    createNote({
      bookId: currentBookId,
      chapterId: selection?.chapterId || currentBook?.chapters[0]?.id || '',
      text: selection?.text || '',
      noteText: newNoteText.trim(),
      startOffset: 0,
      endOffset: 0,
      page: currentPage,
    });
    setNewNoteText('');
    setShowNewNote(false);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isInline = !notesOpen;

  const containerStyle: React.CSSProperties = {
    width: isInline ? '100%' : '320px',
    height: isInline ? 'auto' : '100%',
    backgroundColor: 'var(--bg-color)',
    borderLeft: isInline ? 'none' : '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: isInline ? '80vh' : 'none',
  };

  return (
    <div style={containerStyle}>
      {isInline && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-color)' }}>
            📝 笔记 ({bookNotes.length})
          </div>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-color)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px 8px',
            }}
            onClick={toggleNotes}
          >
            ✕
          </button>
        </div>
      )}

      <div
        style={{
          padding: isInline ? '12px 16px' : '8px 0',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {selection && !showNewNote ? (
          <button
            onClick={() => setShowNewNote(true)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'color-mix(in srgb, var(--bg-color) 85%, var(--accent-color) 15%)',
              border: '1px dashed var(--accent-color)',
              borderRadius: '6px',
              color: 'var(--accent-color)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + 基于选中文本新建笔记
          </button>
        ) : showNewNote ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selection && (
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'color-mix(in srgb, var(--bg-color) 92%, var(--highlight-yellow) 8%)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  lineHeight: 1.4,
                  borderLeft: '3px solid #e6d06c',
                }}
              >
                {selection.text}
              </div>
            )}
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="输入笔记内容..."
              style={{
                padding: '8px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '80px',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNewNote(false);
                  setNewNoteText('');
                }}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newNoteText.trim()}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: 'var(--accent-color)',
                  color: '#fff',
                  cursor: !newNoteText.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  opacity: !newNoteText.trim() ? 0.5 : 1,
                }}
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewNote(true)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'transparent',
              border: '1px dashed var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              cursor: 'pointer',
              fontSize: '13px',
              opacity: 0.7,
            }}
          >
            + 新建笔记
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {bookNotes.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
            <div style={{ fontSize: '13px' }}>暂无笔记</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>选中文本可创建笔记</div>
          </div>
        ) : (
          Object.entries(notesByChapter).map(([chapterId, chapterNotes]) => (
            <div key={chapterId} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  padding: '6px 16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent-color)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: 0.9,
                }}
              >
                {getChapterTitle(chapterId)}
              </div>
              {chapterNotes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    margin: '0 12px 8px',
                    padding: '10px 12px',
                    backgroundColor:
                      note.type === 'highlight' && note.color
                        ? `var(--highlight-${note.color})`
                        : 'color-mix(in srgb, var(--bg-color) 94%, var(--accent-color) 6%)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {note.text && (
                    <div
                      onClick={() => handleJumpToNote(note)}
                      style={{
                        fontSize: '12px',
                        lineHeight: 1.5,
                        marginBottom: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-color)',
                      }}
                    >
                      <strong style={{ opacity: 0.8 }}>引用：</strong>
                      {note.text.length > 80 ? note.text.slice(0, 80) + '...' : note.text}
                    </div>
                  )}
                  {editingId === note.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: '1px solid var(--accent-color)',
                          borderRadius: '4px',
                          backgroundColor: 'var(--bg-color)',
                          color: 'var(--text-color)',
                          fontSize: '12px',
                          resize: 'vertical',
                          minHeight: '60px',
                          fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
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
                          onClick={() => handleSaveEdit(note)}
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
                    <>
                      {note.noteText && (
                        <div
                          style={{
                            fontSize: '13px',
                            lineHeight: 1.5,
                            color: 'var(--text-color)',
                            marginBottom: '6px',
                          }}
                        >
                          {note.noteText}
                        </div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px',
                          opacity: 0.6,
                          marginTop: '4px',
                        }}
                      >
                        <span
                          onClick={() => handleJumpToNote(note)}
                          style={{ cursor: 'pointer' }}
                        >
                          第 {note.page} 页 · {formatDate(note.createdAt)}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {note.type === 'note' && (
                            <button
                              onClick={() => handleStartEdit(note)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '2px 4px',
                                opacity: 0.7,
                              }}
                              title="编辑"
                            >
                              ✏️
                            </button>
                          )}
                          <button
                            onClick={() => deleteNote(note.id)}
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
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
