import { useState } from 'react';
import type { Book, BookStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { StarRating } from './StarRating';

interface BookCardProps {
  book: Book;
  viewMode: 'grid' | 'list';
  onOpen: (book: Book) => void;
  onDelete: (bookId: string) => void;
  onStatusChange: (bookId: string, status: BookStatus) => void;
  onRatingChange: (bookId: string, rating: number) => void;
}

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
];

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return new Date(timestamp).toLocaleDateString();
}

function getProgressPercent(book: Book): number {
  if (!book.progress || book.progress.totalPages === 0) return 0;
  return Math.round((book.progress.page / book.progress.totalPages) * 100);
}

function getGradientByTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PRESETS.length;
  return GRADIENT_PRESETS[index];
}

function BookCover({ book }: { book: Book }) {
  const [error, setError] = useState(false);

  if (book.cover && !error) {
    return (
      <img
        src={book.cover}
        alt={book.title}
        className="book-cover-img"
        onError={() => setError(true)}
        loading="lazy"
      />
    );
  }

  const gradient = getGradientByTitle(book.title);
  const firstChar = book.title.charAt(0) || '📖';

  return (
    <div className="book-cover-placeholder" style={{ background: gradient }}>
      <span className="book-cover-char">{firstChar}</span>
    </div>
  );
}

export function BookCard({ book, viewMode, onOpen, onDelete, onStatusChange, onRatingChange }: BookCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const progress = getProgressPercent(book);
  const lastRead = book.progress?.updatedAt || book.updatedAt;

  const handleDelete = () => {
    onDelete(book.id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  if (viewMode === 'list') {
    return (
      <div className="book-card book-card-list">
        <div className="book-card-cover-thumb" onClick={() => onOpen(book)}>
          <BookCover book={book} />
        </div>

        <div className="book-card-info">
          <div className="book-card-header-row">
            <h4 className="book-card-title" onClick={() => onOpen(book)} title={book.title}>
              {book.title}
            </h4>

            <div className="book-card-actions">
              <div className="book-card-menu-wrap">
                <button
                  className="btn-icon"
                  onClick={() => setShowMenu(!showMenu)}
                  title="更多操作"
                >
                  ⋮
                </button>
                {showMenu && (
                  <div className="book-card-menu">
                    <div className="menu-section">
                      <div className="menu-label">阅读状态</div>
                      {(['want', 'reading', 'finished'] as BookStatus[]).map((s) => (
                        <button
                          key={s}
                          className={`menu-item ${book.status === s ? 'active' : ''}`}
                          onClick={() => {
                            onStatusChange(book.id, s);
                            setShowMenu(false);
                          }}
                        >
                          <StatusBadge status={s} />
                        </button>
                      ))}
                    </div>
                    <div className="menu-section">
                      <div className="menu-label">评分</div>
                      <div className="menu-rating">
                        <StarRating
                          rating={book.rating}
                          onChange={(r) => {
                            onRatingChange(book.id, r);
                          }}
                        />
                      </div>
                    </div>
                    <div className="menu-divider" />
                    <button
                      className="menu-item menu-item-danger"
                      onClick={() => {
                        setShowDeleteConfirm(true);
                      }}
                    >
                      🗑️ 删除书籍
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {book.author && (
            <div className="book-card-author">{book.author}</div>
          )}

          <div className="book-card-meta-row">
            <StatusBadge status={book.status} />
            <StarRating rating={book.rating} readonly />
            {progress > 0 && (
              <span className="book-card-progress-text">{progress}%</span>
            )}
          </div>

          {book.tags.length > 0 && (
            <div className="book-card-tags">
              {book.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="book-tag">#{tag}</span>
              ))}
              {book.tags.length > 5 && (
                <span className="book-tag-more">+{book.tags.length - 5}</span>
              )}
            </div>
          )}

          <div className="book-card-progress">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="book-card-last-read">
              {book.readingTime > 0 ? `已读 ${Math.floor(book.readingTime / 60)}分钟` : ''}
              {' · '}
              {formatTimeAgo(lastRead)}
            </span>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-title">确认删除</div>
              <div className="confirm-message">确定要删除《{book.title}》吗？此操作不可撤销。</div>
              <div className="confirm-actions">
                <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                  取消
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="book-card book-card-grid">
      <div className="book-card-cover" onClick={() => onOpen(book)}>
        <BookCover book={book} />
        <div className="book-card-badge">
          <StatusBadge status={book.status} />
        </div>
        {progress > 0 && (
          <div className="book-card-progress-overlay">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-percent">{progress}%</span>
          </div>
        )}
      </div>

      <div className="book-card-body">
        <div className="book-card-title-row">
          <h4 className="book-card-title" title={book.title} onClick={() => onOpen(book)}>
            {book.title.length > 20 ? book.title.slice(0, 20) + '…' : book.title}
          </h4>
          <div className="book-card-menu-wrap">
            <button
              className="btn-icon btn-icon-small"
              onClick={() => setShowMenu(!showMenu)}
              title="更多操作"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="book-card-menu">
                <div className="menu-section">
                  <div className="menu-label">阅读状态</div>
                  {(['want', 'reading', 'finished'] as BookStatus[]).map((s) => (
                    <button
                      key={s}
                      className={`menu-item ${book.status === s ? 'active' : ''}`}
                      onClick={() => {
                        onStatusChange(book.id, s);
                        setShowMenu(false);
                      }}
                    >
                      <StatusBadge status={s} />
                    </button>
                  ))}
                </div>
                <div className="menu-section">
                  <div className="menu-label">评分</div>
                  <div className="menu-rating">
                    <StarRating
                      rating={book.rating}
                      onChange={(r) => {
                        onRatingChange(book.id, r);
                      }}
                    />
                  </div>
                </div>
                <div className="menu-divider" />
                <button
                  className="menu-item menu-item-danger"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                  }}
                >
                  🗑️ 删除书籍
                </button>
              </div>
            )}
          </div>
        </div>

        {book.author && (
          <div className="book-card-author" title={book.author}>
            {book.author.length > 15 ? book.author.slice(0, 15) + '…' : book.author}
          </div>
        )}

        <div className="book-card-rating-row">
          <StarRating rating={book.rating} readonly />
        </div>

        {book.tags.length > 0 && (
          <div className="book-card-tags">
            {book.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="book-tag">#{tag}</span>
            ))}
            {book.tags.length > 3 && (
              <span className="book-tag-more">+{book.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="book-card-footer">
          <span className="book-card-last-read">{formatTimeAgo(lastRead)}</span>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">确认删除</div>
            <div className="confirm-message">确定要删除《{book.title}》吗？此操作不可撤销。</div>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
