import { useState, useEffect } from 'react';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string) => Promise<void>;
}

export function ImportModal({ open, onClose, onConfirm }: ImportModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!url.trim()) {
      setError('请输入有效的 URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('URL 格式不正确');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm(url.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>从 URL 导入</h3>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <label className="form-label">电子书 URL</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://example.com/book.epub"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
          <p className="form-hint">支持 EPUB、MOBI、PDF、TXT、Markdown 格式</p>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
            {loading ? '导入中...' : '确认导入'}
          </button>
        </div>
      </div>
    </div>
  );
}
