import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllBooks, saveBook, deleteBook as deleteBookDB, getSetting, setSetting, verifyPermission } from '../services/db';
import { generateThumbnail } from '../services/thumbnail';
import { extractPdfMetadata } from '../services/metadata';

const LibraryContext = createContext();

export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [dirHandle, setDirHandle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [userName, setUserName] = useState('User');
  const [readingHistory, setReadingHistory] = useState({});

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
    const today = new Date().toISOString().split('T')[0];
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

  const detectGenre = (title, author) => {
    const text = (title + ' ' + author).toLowerCase();
    if (text.includes('fantasy') || text.includes('magic') || text.includes('dragon') || text.includes('wizard')) return 'Fantasy';
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
    let newBooks = [...currentBooks];

    // Scan for PDFs (shallow)
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
        const id = entry.name;
        if (!existingIds.has(id)) {
          const title = entry.name
            .replace('.pdf', '')
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
          };
          await saveBook(newBook);
          newBooks.push(newBook);
        }
      }
    }
    setBooks(newBooks);

    // Enrich books with metadata + thumbnails in background
    enrichBooks(newBooks);
  };

  // Extract metadata and generate covers for books that need it
  const enrichBooks = async (bookList) => {
    for (const book of bookList) {
      let needsUpdate = false;
      let updatedBook = { ...book };

      // Extract metadata if author is still unknown or no page count
      if ((book.author === 'Unknown Author' || !book.pageCount) && book.fileHandle) {
        try {
          const meta = await extractPdfMetadata(book.fileHandle);
          
          // Use extracted title only if current title looks like a filename
          if (meta.title && book.title === book.id.replace('.pdf', '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim()) {
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
        } catch {
          // Skip failed metadata extraction silently
        }
      }

      // Generate cover thumbnail if missing
      if (!book.cover && book.fileHandle) {
        try {
          const cover = await generateThumbnail(book.fileHandle);
          if (cover) {
            updatedBook.cover = cover;
            needsUpdate = true;
          }
        } catch {
          // Skip failed thumbnails silently
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
      stats,
      selectDirectory,
      scanDirectory,
      updateBook,
      deleteBook,
      toggleTheme,
      updateUserName,
      logReadingSession
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
