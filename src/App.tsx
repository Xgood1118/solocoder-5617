import { useEffect, useRef } from 'react';
import { useBookStore, useReaderStore } from './stores';
import { Library } from './components/Library';
import { Reader } from './components/Reader';
import './App.css';

function App() {
  const { currentBookId, books, addReadingTime, loadBooks } = useBookStore();
  const { settings, loadSettings } = useReaderStore();

  const readingTimerRef = useRef<number | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void loadBooks();
    void loadSettings();
  }, [loadBooks, loadSettings]);

  useEffect(() => {
    readingTimerRef.current = window.setInterval(() => {
      if (currentBookId) {
        void addReadingTime(currentBookId, 5);
      }
    }, 5000);

    return () => {
      if (readingTimerRef.current !== null) {
        clearInterval(readingTimerRef.current);
        readingTimerRef.current = null;
      }
    };
  }, [currentBookId, addReadingTime]);

  useEffect(() => {
    syncTimerRef.current = window.setInterval(() => {
      if (currentBookId) {
        const currentBook = books.find((b) => b.id === currentBookId);
        if (currentBook) {
          localStorage.setItem(
            `cloud_sync_${currentBookId}`,
            JSON.stringify({
              bookId: currentBookId,
              progress: currentBook.progress,
              updatedAt: Date.now(),
            })
          );
        }
      }
    }, 30000);

    return () => {
      if (syncTimerRef.current !== null) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [currentBookId, books]);

  const themeClass = `theme-${settings.theme === 'night' ? 'navy' : settings.theme}`;

  return (
    <div className={`app ${themeClass}`}>
      {currentBookId ? <Reader /> : <Library />}
    </div>
  );
}

export default App;
