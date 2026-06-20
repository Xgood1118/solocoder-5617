import type { BookStatus } from '../types';

interface StatusBadgeProps {
  status: BookStatus;
}

const statusConfig: Record<BookStatus, { label: string; emoji: string; className: string }> = {
  want: {
    label: '想读',
    emoji: '📖',
    className: 'status-badge-want',
  },
  reading: {
    label: '在读',
    emoji: '📝',
    className: 'status-badge-reading',
  },
  finished: {
    label: '已读',
    emoji: '✅',
    className: 'status-badge-finished',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`status-badge ${config.className}`}>
      <span className="status-badge-emoji">{config.emoji}</span>
      <span className="status-badge-label">{config.label}</span>
    </span>
  );
}
