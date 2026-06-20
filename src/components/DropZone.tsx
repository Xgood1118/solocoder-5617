import { useCallback, useEffect } from 'react';
import { detectFormat } from '../parsers';

interface DropZoneProps {
  onDrop: (files: File[]) => void;
  visible: boolean;
}

const SUPPORTED_EXTENSIONS = ['epub', 'mobi', 'azw', 'azw3', 'pdf', 'txt', 'md', 'markdown'];

export function DropZone({ onDrop, visible }: DropZoneProps) {
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!e.dataTransfer) return;

      const files = Array.from(e.dataTransfer.files).filter((file) => {
        const format = detectFormat(file.name);
        return format !== 'unknown' || SUPPORTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(`.${ext}`));
      });

      if (files.length > 0) {
        onDrop(files);
      }
    },
    [onDrop]
  );

  useEffect(() => {
    if (visible) {
      window.addEventListener('dragover', handleDragOver);
      window.addEventListener('dragleave', handleDragLeave);
      window.addEventListener('drop', handleDrop);
    }

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [visible, handleDragOver, handleDragLeave, handleDrop]);

  if (!visible) return null;

  return (
    <div className="dropzone-overlay">
      <div className="dropzone-content">
        <div className="dropzone-icon">📚</div>
        <div className="dropzone-title">释放导入电子书</div>
        <div className="dropzone-hint">支持 EPUB、MOBI、PDF、TXT、Markdown 格式</div>
      </div>
    </div>
  );
}
