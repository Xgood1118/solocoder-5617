import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBookStore } from '../stores/useBookStore';
import { useReaderStore } from '../stores/useReaderStore';
import type { Chapter } from '../types';

interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  text: string;
  startIndex: number;
  page: number;
}

export const SearchPanel: React.FC = () => {
  const { books, currentBookId } = useBookStore();
  const { setPage } = useReaderStore();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const currentBook = useMemo(
    () => books.find((b) => b.id === currentBookId),
    [books, currentBookId]
  );

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim() || !currentBook) return [];
    setSearching(true);
    const results: SearchResult[] = [];
    const searchTerm = debouncedQuery.toLowerCase();

    currentBook.chapters.forEach((chapter: Chapter) => {
      const content = chapter.content || '';
      const plainText = content.replace(/<[^>]+>/g, '');
      let index = plainText.toLowerCase().indexOf(searchTerm);
      while (index !== -1 && results.length < 50) {
        const contextStart = Math.max(0, index - 20);
        const contextEnd = Math.min(plainText.length, index + searchTerm.length + 20);
        const context = (contextStart > 0 ? '...' : '') +
          plainText.slice(contextStart, contextEnd) +
          (contextEnd < plainText.length ? '...' : '');

        results.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          text: context,
          startIndex: index,
          page: chapter.startPage,
        });

        index = plainText.toLowerCase().indexOf(searchTerm, index + 1);
      }
    });

    setTimeout(() => setSearching(false), 0);
    return results;
  }, [debouncedQuery, currentBook]);

  const highlightMatch = (text: string, term: string): React.ReactNode => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            backgroundColor: 'var(--highlight-yellow)',
            padding: '1px 2px',
            borderRadius: '2px',
            fontWeight: 600,
          }}
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  const handleJumpToResult = (result: SearchResult) => {
    setPage(result.page);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '14px',
              opacity: 0.5,
            }}
          >
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索书籍内容..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 34px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'color-mix(in srgb, var(--bg-color) 96%, var(--text-color) 4%)',
              color: 'var(--text-color)',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: 0.5,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ✕
            </button>
          )}
        </div>
        {debouncedQuery && (
          <div
            style={{
              marginTop: '8px',
              fontSize: '11px',
              opacity: 0.6,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {searching ? '搜索中...' : `找到 ${searchResults.length} 个结果`}
            </span>
            {searchResults.length >= 50 && <span>(仅显示前 50 条)</span>}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {!debouncedQuery.trim() ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '13px' }}>输入关键词搜索</div>
          </div>
        ) : !searching && searchResults.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '13px' }}>未找到匹配内容</div>
          </div>
        ) : (
          searchResults.map((result, index) => (
            <div
              key={`${result.chapterId}-${result.startIndex}-${index}`}
              onClick={() => handleJumpToResult(result)}
              style={{
                padding: '12px',
                margin: '0 8px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                border: '1px solid var(--border-color)',
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor =
                  'color-mix(in srgb, var(--bg-color) 92%, var(--accent-color) 8%)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--accent-color)',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>📑 {result.chapterTitle}</span>
                <span style={{ opacity: 0.7 }}>第 {result.page} 页</span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  lineHeight: 1.6,
                  color: 'var(--text-color)',
                  wordBreak: 'break-word',
                }}
              >
                {highlightMatch(result.text, debouncedQuery)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
