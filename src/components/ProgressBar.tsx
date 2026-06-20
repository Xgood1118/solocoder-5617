import React, { useState, useRef, useCallback, useMemo } from 'react';

interface ProgressBarProps {
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  chapterTitle: string;
  onSeek: (page: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentPage,
  totalPages,
  progressPercent,
  chapterTitle,
  onSeek,
}) => {
  const [hovered, setHovered] = useState(false);
  const [dragPreview, setDragPreview] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  const displayPercent = useMemo(
    () => (dragPreview !== null ? Math.round((dragPreview / Math.max(1, totalPages)) * 100) : progressPercent),
    [dragPreview, progressPercent, totalPages]
  );

  const displayPage = useMemo(
    () => (dragPreview !== null ? dragPreview : currentPage),
    [dragPreview, currentPage]
  );

  const handlePositionFromEvent = useCallback(
    (clientX: number): number => {
      if (!barRef.current) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hovered || !barRef.current) return;
      const position = handlePositionFromEvent(e.clientX);
      setHoverPercent(position * 100);
      const page = Math.max(1, Math.round(position * Math.max(1, totalPages)));
      setDragPreview(page);
    },
    [hovered, handlePositionFromEvent, totalPages]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
      const position = handlePositionFromEvent(e.clientX);
      const page = Math.max(1, Math.round(position * Math.max(1, totalPages)));
      setDragPreview(page);

      const handleGlobalMove = (ev: MouseEvent) => {
        const pos = handlePositionFromEvent(ev.clientX);
        const p = Math.max(1, Math.round(pos * Math.max(1, totalPages)));
        setDragPreview(p);
      };

      const handleGlobalUp = (ev: MouseEvent) => {
        const pos = handlePositionFromEvent(ev.clientX);
        const p = Math.max(1, Math.round(pos * Math.max(1, totalPages)));
        onSeek(p);
        setIsDragging(false);
        setDragPreview(null);
        document.removeEventListener('mousemove', handleGlobalMove);
        document.removeEventListener('mouseup', handleGlobalUp);
      };

      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('mouseup', handleGlobalUp);
    },
    [handlePositionFromEvent, onSeek, totalPages]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      setIsDragging(true);
      const touch = e.touches[0];
      const position = handlePositionFromEvent(touch.clientX);
      const page = Math.max(1, Math.round(position * Math.max(1, totalPages)));
      setDragPreview(page);
    },
    [handlePositionFromEvent, totalPages]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const position = handlePositionFromEvent(touch.clientX);
      const page = Math.max(1, Math.round(position * Math.max(1, totalPages)));
      setDragPreview(page);
    },
    [isDragging, handlePositionFromEvent, totalPages]
  );

  const handleTouchEnd = useCallback(() => {
    if (dragPreview !== null) {
      onSeek(dragPreview);
    }
    setIsDragging(false);
    setDragPreview(null);
  }, [dragPreview, onSeek]);

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: hovered || isDragging
      ? 'color-mix(in srgb, var(--bg-color) 92%, var(--border-color) 8%)'
      : 'var(--bg-color)',
    borderTop: `1px solid var(--border-color)`,
    zIndex: 90,
    padding: hovered || isDragging ? '12px 24px 8px' : '6px 24px',
    transition: 'all 0.25s ease',
  };

  const trackStyle: React.CSSProperties = {
    position: 'relative',
    height: hovered || isDragging ? '8px' : '4px',
    backgroundColor: 'color-mix(in srgb, var(--bg-color) 80%, var(--text-color) 20%)',
    borderRadius: '4px',
    cursor: 'pointer',
    overflow: 'visible',
    transition: 'height 0.25s ease',
  };

  const filledStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${displayPercent}%`,
    background: 'linear-gradient(90deg, var(--accent-color), color-mix(in srgb, var(--accent-color) 70%, #66ccff 30%))',
    borderRadius: '4px',
    transition: isDragging ? 'none' : 'width 0.3s ease',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    left: `calc(${displayPercent}% - 8px)`,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    backgroundColor: '#fff',
    border: '2px solid var(--accent-color)',
    borderRadius: '50%',
    boxShadow: hovered || isDragging ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.1)',
    opacity: hovered || isDragging ? 1 : 0,
    transition: 'opacity 0.25s ease, transform 0.15s ease',
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${hoverPercent !== null ? hoverPercent : displayPercent}%`,
    bottom: '100%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    padding: '6px 12px',
    backgroundColor: 'var(--text-color)',
    color: 'var(--bg-color)',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    opacity: hovered || isDragging ? 1 : 0,
    pointerEvents: 'none',
    transition: 'opacity 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };

  const infoStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hovered || isDragging ? '8px' : '0',
    fontSize: '12px',
    opacity: 0.75,
    height: hovered || isDragging ? 'auto' : '0',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
  };

  return (
    <div
      style={barStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) {
          setHovered(false);
          setHoverPercent(null);
          setDragPreview(null);
        }
      }}
    >
      {chapterTitle && (hovered || isDragging) && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '11px',
            opacity: 0.6,
            marginBottom: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          📑 {chapterTitle}
        </div>
      )}

      <div
        ref={barRef}
        style={trackStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={filledStyle} />
        <div style={thumbStyle} />
        <div style={tooltipStyle}>
          第 {displayPage} / {totalPages || 0} 页 · {displayPercent}%
        </div>
      </div>

      <div style={infoStyle}>
        <span>
          第 <strong style={{ color: 'var(--accent-color)' }}>{displayPage}</strong> 页 / 共{' '}
          {totalPages || 0} 页
        </span>
        <span>
          阅读进度 <strong style={{ color: 'var(--accent-color)' }}>{displayPercent}%</strong>
        </span>
      </div>
    </div>
  );
};
