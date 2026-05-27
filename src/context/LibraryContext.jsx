import { createContext, useContext, useState, useEffect } from "react";
import {
  getAllBooks,
  saveBook,
  deleteBook as deleteBookDB,
  getSetting,
  setSetting,
  verifyPermission,
} from "../services/db";
import { generateThumbnail } from "../services/thumbnail";
import { extractPdfMetadata } from "../services/metadata";
import {
  extractEpubMetadata,
  generateEpubThumbnail,
} from "../services/epubService";

export const GENRES = [
  "Self-improvement",
  "Psychology",
  "Novel",
  "Biography",
  "Sci-fi",
  "Mystery Thriller",
  "Other",
];

const LibraryContext = createContext();

export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [dirHandle, setDirHandle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [userName, setUserName] = useState("User");
  const [readingHistory, setReadingHistory] = useState({});
  const [yearlyGoal, setYearlyGoal] = useState(50);
  const [collections, setCollections] = useState([
    "Favorites",
    "Must Read",
    "To Review",
  ]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const storedTheme = await getSetting("theme");
        if (storedTheme) {
          setTheme(storedTheme);
          document.documentElement.setAttribute("data-theme", storedTheme);
        }

        const storedName = await getSetting("userName");
        if (storedName) {
          setUserName(storedName);
        }

        const history = await getSetting("readingHistory");
        if (history) {
          setReadingHistory(history);
        }

        const goal = await getSetting("yearlyGoal");
        if (goal) {
          setYearlyGoal(goal);
        }

        const handle = await getSetting("libraryDir");
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
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time
    const newHistory = {
      ...readingHistory,
      [today]: (readingHistory[today] || 0) + pages,
    };
    setReadingHistory(newHistory);
    await setSetting("readingHistory", newHistory);
  };

  const updateUserName = async (name) => {
    setUserName(name);
    await setSetting("userName", name);
  };

  const calculateStreak = () => {
    if (!readingHistory || Object.keys(readingHistory).length === 0) return 0;

    const today = new Date().toLocaleDateString("en-CA");
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString(
      "en-CA",
    );

    if (!readingHistory[today] && !readingHistory[yesterday]) return 0;

    let streak = 0;
    let checkDate = readingHistory[today]
      ? new Date(today)
      : new Date(yesterday);

    while (true) {
      const dateStr = checkDate.toLocaleDateString("en-CA");
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
    const text = (title + " " + author).toLowerCase();
    if (
      text.includes("psychology") ||
      text.includes("mind") ||
      text.includes("behavior") ||
      text.includes("mental")
    )
      return "Psychology";
    if (
      text.includes("sci-fi") ||
      text.includes("space") ||
      text.includes("robot") ||
      text.includes("alien") ||
      text.includes("future")
    )
      return "Sci-fi";
    if (
      text.includes("self-improvement") ||
      text.includes("habit") ||
      text.includes("mindset") ||
      text.includes("productivity") ||
      text.includes("guide")
    )
      return "Self-improvement";
    if (
      text.includes("biography") ||
      text.includes("memoir") ||
      text.includes("life of") ||
      text.includes("autobiography")
    )
      return "Biography";
    if (
      text.includes("mystery") ||
      text.includes("thriller") ||
      text.includes("crime") ||
      text.includes("detective") ||
      text.includes("murder")
    )
      return "Mystery Thriller";
    if (
      text.includes("novel") ||
      text.includes("fiction") ||
      text.includes("story")
    )
      return "Novel";
    return "Other";
  };

  const fetchBookMetadata = async (title, author) => {
    try {
      const query = encodeURIComponent(
        `intitle:${title}${author ? "+inauthor:" + author : ""}`,
      );
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}`,
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        return {
          description: info.description || "",
          cover:
            info.imageLinks?.thumbnail ||
            info.imageLinks?.smallThumbnail ||
            null,
          publisher: info.publisher || "",
          publishedDate: info.publishedDate || "",
          pageCount: info.pageCount || 0,
          genre: info.categories
            ? info.categories[0]
            : detectGenre(title, author),
        };
      }
    } catch (err) {
      console.warn("Failed to fetch metadata", err);
    }
    return null;
  };

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    await setSetting("theme", newTheme);
  };

  const selectDirectory = async () => {
    // Check for File System Access API support first
    if (!window.showDirectoryPicker) {
      // This API is not supported on Firefox, iOS Safari, or older Android WebViews
      alert(
        "Your browser does not support folder selection.\n\n" +
          "Please use a Chromium-based browser (Chrome, Edge, Brave, Samsung Internet) on desktop or Android.\n\n" +
          "Note: iOS Safari and Firefox do not support this feature.",
      );
      return;
    }
    try {
      const handle = await window.showDirectoryPicker();
      await setSetting("libraryDir", handle);
      setDirHandle(handle);
      await scanDirectory(handle);
    } catch (err) {
      if (err.name !== "AbortError") {
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
    const existingIds = new Set(currentBooks.map((b) => b.id));
    const foundIds = new Set();
    let newBooksList = [...currentBooks];

    // Scan for PDFs and EPUBs
    for await (const entry of handle.values()) {
      if (
        entry.kind === "file" &&
        (entry.name.toLowerCase().endsWith(".pdf") ||
          entry.name.toLowerCase().endsWith(".epub"))
      ) {
        const id = entry.name;
        foundIds.add(id);

        if (!existingIds.has(id)) {
          const title = entry.name
            .replace(/\.(pdf|epub)$/i, "")
            .replace(/[-_]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          const newBook = {
            id,
            title,
            author: "Unknown Author",
            fileHandle: entry,
            category: "Planned",
            genre: detectGenre(title, "Unknown Author"),
            progress: 0,
            lastRead: null,
            addedAt: new Date().toISOString(),
            cover: null,
            pageCount: 0,
            isFavorite: false,
          };
          await saveBook(newBook);
          newBooksList.push(newBook);
        } else {
          // If the book already exists, re-link the file handle if it was marked as missing
          const existingBook = newBooksList.find((b) => b.id === id);
          if (
            existingBook &&
            (existingBook.fileMissing || !existingBook.fileHandle)
          ) {
            existingBook.fileHandle = entry;
            existingBook.fileMissing = false;
            await saveBook(existingBook);
            newBooksList = newBooksList.map((b) =>
              b.id === id ? existingBook : b,
            );
          }
        }
      }
    }

    // Mark missing books as fileMissing: true instead of deleting them from database
    const missingBooks = currentBooks.filter(
      (b) => !b.isManual && !b.fileMissing && !foundIds.has(b.id),
    );
    for (const book of missingBooks) {
      const updated = { ...book, fileMissing: true, fileHandle: null };
      await saveBook(updated);
      newBooksList = newBooksList.map((b) => (b.id === book.id ? updated : b));
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
      if (
        (book.author === "Unknown Author" || !book.pageCount) &&
        book.fileHandle
      ) {
        try {
          const isEpub = book.id.toLowerCase().endsWith(".epub");
          const meta = isEpub
            ? await extractEpubMetadata(book.fileHandle)
            : await extractPdfMetadata(book.fileHandle);

          // Use extracted title only if current title looks like a filename
          if (
            meta.title &&
            book.title ===
              book.id
                .replace(/\.(pdf|epub)$/i, "")
                .replace(/[-_]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
          ) {
            updatedBook.title = meta.title;
          }

          if (meta.author) {
            updatedBook.author = meta.author;
          }

          if (meta.pageCount) {
            updatedBook.pageCount = meta.pageCount;
          }

          // Re-detect genre with metadata
          updatedBook.genre = detectGenre(
            updatedBook.title,
            updatedBook.author,
          );

          needsUpdate = true;
        } catch (err) {
          console.warn(`Failed to enrich metadata for ${book.id}:`, err);
        }
      }

      // Generate cover thumbnail if missing
      if (!book.cover && book.fileHandle) {
        try {
          const isEpub = book.id.toLowerCase().endsWith(".epub");
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
        setBooks((prev) =>
          prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)),
        );
      }
    }
  };

  const updateBook = async (updatedBook) => {
    await saveBook(updatedBook);
    setBooks((prev) =>
      prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)),
    );
  };

  const deleteBook = async (bookId) => {
    await deleteBookDB(bookId);
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  const findBookById = (id) => {
    if (!id) return null;
    const decodedId = decodeURIComponent(id);
    // Try exact match first
    let found = books.find((b) => b.id === id || b.id === decodedId);
    if (found) return found;

    // Try normalized match (treating '+' and ' ' as equivalent)
    const normId = id
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    const normDecodedId = decodedId
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    found = books.find((b) => {
      const normBookId = b.id
        .replace(/\+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      return normBookId === normId || normBookId === normDecodedId;
    });

    return found;
  };

  const stats = {
    total: books.length,
    planned: books.filter((b) => b.category === "Planned").length,
    reading: books.filter((b) => b.category === "Reading").length,
    completed: books.filter((b) => b.category === "Completed").length,
  };

  const updateYearlyGoal = async (goal) => {
    setYearlyGoal(goal);
    await setSetting("yearlyGoal", goal);
  };

  const addManualBook = async (bookData) => {
    const newBook = {
      id: `manual-${Date.now()}`,
      title: bookData.title || "Untitled",
      author: bookData.author || "Unknown Author",
      fileHandle: null,
      category: bookData.category || "Planned",
      genre: bookData.genre || "Other",
      progress: bookData.category === "Completed" ? 100 : 0,
      lastRead:
        bookData.category === "Completed" ? new Date().toISOString() : null,
      addedAt: new Date().toISOString(),
      cover: bookData.cover || null,
      pageCount: 0,
      isFavorite: false,
      isManual: true,
      notes: bookData.notes || "",
    };
    await saveBook(newBook);
    setBooks((prev) => [...prev, newBook]);
    return newBook;
  };

  return (
    <LibraryContext.Provider
      value={{
        books,
        dirHandle,
        loading,
        theme,
        userName,
        readingHistory,
        yearlyGoal,
        collections,
        stats,
        selectDirectory,
        scanDirectory,
        updateBook,
        deleteBook,
        toggleTheme,
        updateUserName,
        updateYearlyGoal,
        calculateStreak,
        logReadingSession,
        addManualBook,
        fetchBookMetadata,
        setCollections,
        findBookById,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
