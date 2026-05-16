import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllBooks, saveBook, deleteBook as deleteBookDB, getSetting, setSetting, verifyPermission } from '../services/db';
import { generateThumbnail } from '../services/thumbnail';
import { extractPdfMetadata } from '../services/metadata';
import { extractEpubMetadata, generateEpubThumbnail } from '../services/epubService';

export const GENRES = ['Self-improvement', 'Psychology', 'Novel', 'Biography', 'Sci-fi', 'Mystery Thriller', 'Other'];

const LibraryContext = createContext();

export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [dirHandle, setDirHandle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [userName, setUserName] = useState('User');
  const [readingHistory, setReadingHistory] = useState({});
  const [yearlyGoal, setYearlyGoal] = useState(50);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const storedTheme = await getSetting('theme');
        if (storedTheme) {
          setTheme(storedTheme);
          document.documentElement.setAttribute('data-theme', storedTheme);
        }

        const storedName = await getSetting('userName');
        if (storedName) {
          setUserName(storedName);
        }

        const history = await getSetting('readingHistory');
        if (history) {
          setReadingHistory(history);
        }

        const goal = await getSetting('yearlyGoal');
        if (goal) {
          setYearlyGoal(goal);
        }

        const handle = await getSetting('libraryDir');
        if (handle) {
          setDirHandle(handle);
        }

        const storedBooks = await getAllBooks();
        setBooks(storedBooks || []);
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const logReadingSession = async (pages) => {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
    const newHistory = {
      ...readingHistory,
      [today]: (readingHistory[today] || 0) + pages
    };
    setReadingHistory(newHistory);
    await setSetting('readingHistory', newHistory);
  };

  const updateUserName = async (name) => {
    setUserName(name);
    await setSetting('userName', name);
  };

  const updateYearlyGoal = async (goal) => {
    setYearlyGoal(goal);
    await setSetting('yearlyGoal', goal);
  };

  const calculateStreak = () => {
    if (!readingHistory || Object.keys(readingHistory).length === 0) return 0;
    
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

    if (!readingHistory[today] && !readingHistory[yesterday]) return 0;

    let streak = 0;
    let checkDate = readingHistory[today] ? new Date(today) : new Date(yesterday);
    
    while (true) {
      const dateStr = checkDate.toLocaleDateString('en-CA');
      if (readingHistory[dateStr] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const detectGenre = (title, author) => {
    const text = (title + ' ' + author).toLowerCase();
    if (text.includes('psychology') || text.includes('mind') || text.includes('behavior') || text.includes('mental')) return 'Psychology';
    if (text.includes('sci-fi') || text.includes('space') || text.includes('robot') || text.includes('alien') || text.includes('future')) return 'Sci-fi';
    if (text.includes('self-improvement') || text.includes('habit') || text.includes('mindset') || text.includes('productivity') || text.includes('guide')) return 'Self-improvement';
    if (text.includes('biography') || text.includes('memoir') || text.includes('life of') || text.includes('autobiography')) return 'Biography';
    if (text.includes('mystery') || text.includes('thriller') || text.includes('crime') || text.includes('detective') || text.includes('murder')) return 'Mystery Thriller';
    if (text.includes('novel') || text.includes('fiction') || text.includes('story')) return 'Novel';
    return 'Other';
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    await setSetting('theme', newTheme);
  };

  const selectDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await setSetting('libraryDir', handle);
      setDirHandle(handle);
      await scanDirectory(handle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Error selecting directory", err);
      }
    }
  };

  const scanDirectory = async (handle) => {
    if (!handle) return;
    
    const hasPermission = await verifyPermission(handle);
    if (!hasPermission) {
      console.warn("Permission to access directory denied.");
      return;
    }

    const currentBooks = await getAllBooks();
    const existingIds = new Set(currentBooks.map(b => b.id));
    const foundIds = new Set();
    let newBooksList = [...currentBooks];
    let addedCount = 0;

    // Scan for PDFs and EPUBs
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && (entry.name.toLowerCase().endsWith('.pdf') || entry.name.toLowerCase().endsWith('.epub'))) {
        const id = entry.name;
        foundIds.add(id);
        
        if (!existingIds.has(id)) {
          const title = entry.name
            .replace(/\.(pdf|epub)$/i, '')
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          const newBook = {
            id,
            title,
            author: 'Unknown Author',
            fileHandle: entry,
            category: 'Planned',
            genre: detectGenre(title, 'Unknown Author'),
            progress: 0,
            lastRead: null,
            addedAt: new Date().toISOString(),
            cover: null,
            pageCount: 0,
            isFavorite: false,
          };
          await saveBook(newBook);
          newBooksList.push(newBook);
          addedCount++;
        }
      }
    }

    // Identify books to remove
    const booksToRemove = currentBooks.filter(b => !foundIds.has(b.id));
    for (const book of booksToRemove) {
      await deleteBookDB(book.id);
      newBooksList = newBooksList.filter(b => b.id !== book.id);
    }

    setBooks(newBooksList);

    // Enrich only new or un-enriched books
    enrichBooks(newBooksList);
  };

  // Extract metadata and generate covers for books that need it
  const enrichBooks = async (bookList) => {
    for (const book of bookList) {
      let needsUpdate = false;
      let updatedBook = { ...book };

      // Extract metadata if author is still unknown or no page count
      if ((book.author === 'Unknown Author' || !book.pageCount) && book.fileHandle) {
        try {
          const isEpub = book.id.toLowerCase().endsWith('.epub');
          const meta = isEpub 
            ? await extractEpubMetadata(book.fileHandle)
            : await extractPdfMetadata(book.fileHandle);
          
          // Use extracted title only if current title looks like a filename
          if (meta.title && book.title === book.id.replace(/\.(pdf|epub)$/i, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()) {
            updatedBook.title = meta.title;
          }

          if (meta.author) {
            updatedBook.author = meta.author;
          }

          if (meta.pageCount) {
            updatedBook.pageCount = meta.pageCount;
          }

          // Re-detect genre with metadata
          updatedBook.genre = detectGenre(updatedBook.title, updatedBook.author);

          needsUpdate = true;
        } catch (err) {
          console.warn(`Failed to enrich metadata for ${book.id}:`, err);
        }
      }

      // Generate cover thumbnail if missing
      if (!book.cover && book.fileHandle) {
        try {
          const isEpub = book.id.toLowerCase().endsWith('.epub');
          const cover = isEpub
            ? await generateEpubThumbnail(book.fileHandle)
            : await generateThumbnail(book.fileHandle);
            
          if (cover) {
            updatedBook.cover = cover;
            needsUpdate = true;
          }
        } catch (err) {
          console.warn(`Failed to generate cover for ${book.id}:`, err);
        }
      }

      if (needsUpdate) {
        await saveBook(updatedBook);
        setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
      }
    }
  };

  const updateBook = async (updatedBook) => {
    await saveBook(updatedBook);
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const deleteBook = async (bookId) => {
    await deleteBookDB(bookId);
    setBooks(prev => prev.filter(b => b.id !== bookId));
  };

  const stats = {
    total: books.length,
    planned: books.filter(b => b.category === 'Planned').length,
    reading: books.filter(b => b.category === 'Reading').length,
    completed: books.filter(b => b.category === 'Completed').length,
  };

  return (
    <LibraryContext.Provider value={{
      books,
      dirHandle,
      loading,
      theme,
      userName,
      readingHistory,
      yearlyGoal,
      stats,
      selectDirectory,
      scanDirectory,
      updateBook,
      deleteBook,
      toggleTheme,
      updateUserName,
      updateYearlyGoal,
      calculateStreak,
      logReadingSession
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
