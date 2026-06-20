import React, { useState } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import { useNoteStore } from '../stores/useNoteStore';

const HIGHLIGHT_COLORS = [
  { key: 'yellow', label: '黄色', color: 'rgba(255, 245, 157, 0.7)' },
  { key: 'green', label: '绿色', color: 'rgba(144, 238, 144, 0.7)' },
  { key: 'blue', label: '蓝色', color: 'rgba(173, 216, 230, 0.7)' },
  { key: 'pink', label: '粉色', color: 'rgba(255, 192, 203, 0.7)' },
];

const mockTranslate = (text: string): string => {
  const zhPattern = /[\u4e00-\u9fa5]/;
  if (zhPattern.test(text)) {
    const mockTranslations: Record<string, string> = {
      你好: 'Hello',
      世界: 'World',
      阅读: 'Reading',
      书籍: 'Book',
      学习: 'Learning',
      知识: 'Knowledge',
      生活: 'Life',
      时间: 'Time',
      工作: 'Work',
      快乐: 'Happy',
    };
    return mockTranslations[text] || `[EN] ${text}`;
  } else {
    const mockTranslations: Record<string, string> = {
      Hello: '你好',
      World: '世界',
      Reading: '阅读',
      Book: '书籍',
      Learning: '学习',
      Knowledge: '知识',
      Life: '生活',
      Time: '时间',
      Work: '工作',
      Happy: '快乐',
    };
    return mockTranslations[text] || `[中文] ${text}`;
  }
};

export const SelectionToolbar: React.FC = () => {
  const { currentBookId } = useBookStore();
  const { currentPage } = useReaderStore();
  const { selection, createHighlight, createNote, clearSelection, toolbarVisible } = useNoteStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showTranslate, setShowTranslate] = useState(false);
  const [translatedText, setTranslatedText] = useState('');

  if (!toolbarVisible || !selection || !selection.rect) return null;

  const handleHighlight = (colorKey: string) => {
    if (!currentBookId || !selection.text) return;
    createHighlight({
      bookId: currentBookId,
      chapterId: selection.chapterId || '',
      text: selection.text,
      color: colorKey,
      startOffset: 0,
      endOffset: selection.text.length,
      page: currentPage,
    });
    setShowColorPicker(false);
    clearSelection();
    window.getSelection()?.removeAllRanges();
  };

  const handleCreateNote = () => {
    if (!currentBookId || !selection.text) return;
    createNote({
      bookId: currentBookId,
      chapterId: selection.chapterId || '',
      text: selection.text,
      noteText: noteText.trim(),
      startOffset: 0,
      endOffset: selection.text.length,
      page: currentPage,
    });
    setShowNoteInput(false);
    setNoteText('');
    clearSelection();
    window.getSelection()?.removeAllRanges();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = selection.text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    clearSelection();
    window.getSelection()?.removeAllRanges();
  };

  const handleSearch = () => {
    clearSelection();
    window.getSelection()?.removeAllRanges();
    alert(`搜索: ${selection.text}`);
  };

  const handleTranslate = () => {
    setTranslatedText(mockTranslate(selection.text));
    setShowTranslate(true);
  };

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(16, Math.min(selection.rect.left + selection.rect.width / 2 - 160, window.innerWidth - 336)),
    top: Math.max(16, selection.rect.top - 52),
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '6px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15), 0 0 0 1px var(--border-color)',
    backdropFilter: 'blur(8px)',
  };

  const btnStyle = (active = false): React.CSSProperties => ({
    background: active
      ? 'color-mix(in srgb, var(--bg-color) 80%, var(--accent-color) 20%)'
      : 'transparent',
    border: 'none',
    color: 'var(--text-color)',
    cursor: 'pointer',
    padding: '8px 10px',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: 1,
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
  });

  return (
    <div style={toolbarStyle}>
      {showColorPicker && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15), 0 0 0 1px var(--border-color)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => handleHighlight(c.key)}
              title={c.label}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid var(--border-color)',
                backgroundColor: c.color,
                cursor: 'pointer',
                transition: 'transform 0.15s, border-color 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-color)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
              }}
            >
              ✨
            </button>
          ))}
          <button
            onClick={() => setShowColorPicker(false)}
            style={{
              ...btnStyle(),
              marginLeft: '4px',
            }}
            title="关闭"
          >
            ✕
          </button>
        </div>
      )}

      {showNoteInput && (
        <div
          style={{
            width: '280px',
            padding: '12px',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15), 0 0 0 1px var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              padding: '6px 8px',
              backgroundColor: 'var(--highlight-yellow)',
              borderRadius: '4px',
              lineHeight: 1.4,
              color: 'var(--text-color)',
              maxHeight: '60px',
              overflowY: 'auto',
            }}
          >
            {selection.text.length > 120 ? selection.text.slice(0, 120) + '...' : selection.text}
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="输入笔记内容..."
            autoFocus
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)',
              fontSize: '13px',
              resize: 'vertical',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              onClick={() => {
                setShowNoteInput(false);
                setNoteText('');
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
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
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              保存笔记
            </button>
          </div>
        </div>
      )}

      {showTranslate && (
        <div
          style={{
            maxWidth: '300px',
            padding: '12px',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15), 0 0 0 1px var(--border-color)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              color: 'var(--accent-color)',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            🌐 翻译结果
          </div>
          <div
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--text-color)',
              marginBottom: '8px',
            }}
          >
            {translatedText}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              onClick={() => {
                try {
                  navigator.clipboard.writeText(translatedText);
                } catch {}
              }}
              style={{
                padding: '4px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: 'var(--text-color)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              复制
            </button>
            <button
              onClick={() => setShowTranslate(false)}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: 'var(--accent-color)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      <div style={buttonRowStyle}>
        <button
          style={btnStyle(showColorPicker)}
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowNoteInput(false);
            setShowTranslate(false);
          }}
          title="高亮"
        >
          🖍️
        </button>
        <button
          style={btnStyle(showNoteInput)}
          onClick={() => {
            setShowNoteInput(!showNoteInput);
            setShowColorPicker(false);
            setShowTranslate(false);
          }}
          title="添加笔记"
        >
          📝
        </button>
        <div
          style={{
            width: '1px',
            height: '20px',
            backgroundColor: 'var(--border-color)',
            margin: '0 2px',
          }}
        />
        <button style={btnStyle()} onClick={handleCopy} title="复制">
          📋
        </button>
        <button style={btnStyle()} onClick={handleSearch} title="搜索">
          🔍
        </button>
        <button
          style={btnStyle(showTranslate)}
          onClick={() => {
            if (!showTranslate) handleTranslate();
            setShowTranslate(!showTranslate);
            setShowColorPicker(false);
            setShowNoteInput(false);
          }}
          title="翻译"
        >
          🌐
        </button>
        <div
          style={{
            width: '1px',
            height: '20px',
            backgroundColor: 'var(--border-color)',
            margin: '0 2px',
          }}
        />
        <button
          style={btnStyle()}
          onClick={() => {
            clearSelection();
            window.getSelection()?.removeAllRanges();
          }}
          title="关闭"
        >
          ✕
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
