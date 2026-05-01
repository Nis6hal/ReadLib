import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAllBooks, saveBook, deleteBook as deleteBookDB, getSetting, setSetting, verifyPermission } from '../services/db';

const LibraryContext = createContext();

export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [dirHandle, setDirHandle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const storedTheme = await getSetting('theme');
        if (storedTheme) {
          setTheme(storedTheme);
          document.documentElement.setAttribute('data-theme', storedTheme);
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
      // User cancelled the picker - not an error
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
        const id = entry.name; // Using filename as simple ID
        if (!existingIds.has(id)) {
          const newBook = {
            id,
            title: entry.name
              .replace('.pdf', '')
              .replace(/[-_]/g, ' ')      // Replace dashes/underscores with spaces
              .replace(/\s+/g, ' ')         // Collapse multiple spaces
              .trim(),
            author: 'Unknown Author',
            fileHandle: entry,
            category: 'Planned',
            progress: 0,
            lastRead: null,
            addedAt: new Date().toISOString(),
          };
          await saveBook(newBook);
          newBooks.push(newBook);
        }
      }
    }
    setBooks(newBooks);
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
      stats,
      selectDirectory,
      scanDirectory,
      updateBook,
      deleteBook,
      toggleTheme
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
