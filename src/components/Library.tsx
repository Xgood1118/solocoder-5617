import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useBookStore, useNoteStore } from '../stores';
import type { Book, BookStatus, LibraryExportData } from '../types';
import { parseBook, FILE_SIZE_LIMIT } from '../parsers';
import { BookCard } from './BookCard';
import { DropZone } from './DropZone';
import { ImportModal } from './ImportModal';

type SortKey = 'lastRead' | 'createdAt' | 'progress' | 'rating' | 'title';
type ViewMode = 'grid' | 'list';

const STATUS_FILTERS: Array<{ key: BookStatus | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'reading', label: '在读' },
  { key: 'finished', label: '已读' },
  { key: 'want', label: '想读' },
];

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'lastRead', label: '最近阅读' },
  { key: 'createdAt', label: '添加时间' },
  { key: 'progress', label: '进度' },
  { key: 'rating', label: '评分' },
  { key: 'title', label: '标题' },
];

function validateFile(file: File): string | null {
  if (file.size > FILE_SIZE_LIMIT) {
    return `文件「${file.name}」大小超过限制（${(FILE_SIZE_LIMIT / 1024 / 1024).toFixed(0)}MB）`;
  }
  return null;
}

export function Library() {
  const {
    books,
    addBook,
    setCurrentBook,
    setSearchQuery,
    setFilterStatus,
    setActiveTag,
    loadBooks,
    updateProgress,
    exportLibrary,
    importLibrary,
    removeBook,
    setStatus,
    setRating,
    searchQuery,
    filterStatus,
    activeTag,
  } = useBookStore();

  const { exportNotes } = useNoteStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('lastRead');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragOver(false);
      }
      const rect = document.body.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setIsDragOver(false);
      }
    };
    const onDrop = () => {
      setIsDragOver(false);
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setImporting(true);

      let successCount = 0;
      const errors: string[] = [];

      for (const file of files) {
        const sizeError = validateFile(file);
        if (sizeError) {
          errors.push(sizeError);
          continue;
        }

        try {
          const book = await parseBook(file, file.name);
          await addBook(book);
          successCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`「${file.name}」: ${msg}`);
        }
      }

      setImporting(false);

      if (successCount > 0) {
        showToast('success', `成功导入 ${successCount} 本书${errors.length > 0 ? `，${errors.length} 个失败` : ''}`);
      }
      if (errors.length > 0 && successCount === 0) {
        showToast('error', errors[0]);
      } else if (errors.length > 0) {
        console.warn('导入部分失败:', errors);
      }
    },
    [addBook, showToast]
  );

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    e.target.value = '';
  };

  const handleUrlImport = useCallback(
    async (url: string) => {
      setImporting(true);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const filename = url.split('/').pop()?.split('?')[0] || 'book';
        const book = await parseBook(buffer, filename);
        await addBook(book);
        showToast('success', `成功导入《${book.title}》`);
      } finally {
        setImporting(false);
      }
    },
    [addBook, showToast]
  );

  const handleFileDrop = useCallback(
    (files: File[]) => {
      processFiles(files);
    },
    [processFiles]
  );

  const handleOpenBook = useCallback(
    (book: Book) => {
      setCurrentBook(book.id);
      if (book.totalPages > 0) {
        void updateProgress(
          book.id,
          book.progress.chapterId,
          book.progress.position,
          book.progress.page || 1,
          book.totalPages
        );
      }
    },
    [setCurrentBook, updateProgress]
  );

  const handleExportLibrary = useCallback(async () => {
    try {
      const data = await exportLibrary();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `library-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', '书架导出成功');
    } catch {
      showToast('error', '导出失败');
    }
  }, [exportLibrary, showToast]);

  const handleImportLibrary = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result as string) as LibraryExportData;
          await importLibrary(data);
          showToast('success', '书架导入成功');
        } catch {
          showToast('error', '导入失败，文件格式不正确');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importLibrary, showToast]
  );

  const handleExportNotes = useCallback(async () => {
    try {
      const allNotes: string[] = [];
      for (const book of books) {
        const notes = await exportNotes(book.id);
        if (notes) allNotes.push(notes);
      }
      if (allNotes.length === 0) {
        showToast('info', '暂无可导出的笔记');
        return;
      }
      const content = allNotes.join('\n\n---\n\n');
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notes-export-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', '笔记导出成功');
    } catch {
      showToast('error', '笔记导出失败');
    }
  }, [books, exportNotes, showToast]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const book of books) {
      for (const tag of book.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((b) => b.status === filterStatus);
    }

    if (activeTag) {
      result = result.filter((b) => b.tags.includes(activeTag));
    }

    result.sort((a, b) => {
      switch (sortKey) {
        case 'lastRead':
          return (b.progress?.updatedAt || b.updatedAt) - (a.progress?.updatedAt || a.updatedAt);
        case 'createdAt':
          return b.createdAt - a.createdAt;
        case 'progress': {
          const pa = a.progress.totalPages > 0 ? a.progress.page / a.progress.totalPages : 0;
          const pb = b.progress.totalPages > 0 ? b.progress.page / b.progress.totalPages : 0;
          return pb - pa;
        }
        case 'rating':
          return b.rating - a.rating;
        case 'title':
          return a.title.localeCompare(b.title, 'zh-CN');
        default:
          return 0;
      }
    });

    return result;
  }, [books, searchQuery, filterStatus, activeTag, sortKey]);

  return (
    <div className="library">
      <header className="library-header">
        <div className="library-header-left">
          <div className="library-logo">📚</div>
          <h1 className="library-title">我的书架</h1>
        </div>

        <div className="library-header-right">
          <div className="library-import-buttons">
            <label className="btn btn-primary import-file-label">
              📁 选择文件
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".epub,.mobi,.azw,.azw3,.pdf,.txt,.md,.markdown"
                className="hidden-file-input"
                onChange={handleSelectFiles}
                disabled={importing}
              />
            </label>
            <button
              className="btn btn-secondary"
              onClick={() => setImportModalOpen(true)}
              disabled={importing}
            >
              🔗 URL 导入
            </button>
          </div>

          <div className="library-io-buttons">
            <div className="io-dropdown-wrap">
              <button className="btn btn-ghost">📤 导出 ▾</button>
              <div className="io-dropdown">
                <button className="dropdown-item" onClick={handleExportLibrary}>
                  📚 导出书架
                </button>
                <button className="dropdown-item" onClick={handleExportNotes}>
                  📝 导出笔记
                </button>
              </div>
            </div>

            <label className="btn btn-ghost import-library-label">
              📥 导入书架
              <input
                type="file"
                accept=".json"
                className="hidden-file-input"
                onChange={handleImportLibrary}
              />
            </label>
          </div>
        </div>
      </header>

      <div className="library-toolbar">
        <div className="toolbar-group toolbar-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索书名或作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        <div className="toolbar-group">
          <div className="filter-group">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-btn ${filterStatus === f.key ? 'active' : ''}`}
                onClick={() => setFilterStatus(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="toolbar-group toolbar-tags">
            <span className="toolbar-label">标签:</span>
            <div className="tag-filter-group">
              <button
                className={`tag-filter-btn ${activeTag === null ? 'active' : ''}`}
                onClick={() => setActiveTag(null)}
              >
                全部
              </button>
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${activeTag === tag ? 'active' : ''}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="toolbar-group toolbar-right">
          <div className="sort-wrap">
            <span className="toolbar-label">排序:</span>
            <select
              className="sort-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="网格视图"
            >
              ⊞
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className="library-content">
        {filteredBooks.length === 0 ? (
          <div className="library-empty">
            <div className="empty-icon">📭</div>
            <h2 className="empty-title">
              {books.length === 0 ? '书架空空如也' : '没有匹配的书籍'}
            </h2>
            <p className="empty-hint">
              {books.length === 0
                ? '导入你的第一本书吧！支持 EPUB、MOBI、PDF、TXT、Markdown 格式'
                : '试试调整搜索条件或筛选器'}
            </p>
            {books.length === 0 && (
              <div className="empty-actions">
                <label className="btn btn-primary btn-large import-file-label">
                  📁 选择文件导入
                  <input
                    type="file"
                    multiple
                    accept=".epub,.mobi,.azw,.azw3,.pdf,.txt,.md,.markdown"
                    className="hidden-file-input"
                    onChange={handleSelectFiles}
                  />
                </label>
                <button
                  className="btn btn-secondary btn-large"
                  onClick={() => setImportModalOpen(true)}
                >
                  🔗 从 URL 导入
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`books-container ${
              viewMode === 'grid' ? 'books-grid' : 'books-list'
            }`}
          >
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                viewMode={viewMode}
                onOpen={handleOpenBook}
                onDelete={removeBook}
                onStatusChange={setStatus}
                onRatingChange={setRating}
              />
            ))}
          </div>
        )}
      </div>

      <DropZone onDrop={handleFileDrop} visible={isDragOver} />
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onConfirm={handleUrlImport}
      />

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {importing && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <div className="loading-text">正在导入...</div>
        </div>
      )}
    </div>
  );
}
