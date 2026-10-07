import { createContext, useContext, useState, useEffect, useRef } from "react";
// Google Books API key from environment (optional)
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

  const [syncKey, setSyncKey] = useState("");
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const [autoTheme, setAutoTheme] = useState(false);
  const [autoThemeLightUntil, setAutoThemeLightUntil] = useState(18);
  const [autoThemeDarkUntil, setAutoThemeDarkUntil] = useState(6);

  // Refs to avoid stale closures in intervals
  const syncWithCloudRef = useRef(null);
  const themeRef = useRef(theme);
  const toggleThemeRef = useRef(null);

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

        const storedSyncKey = await getSetting("syncKey");
        if (storedSyncKey) {
          setSyncKey(storedSyncKey);
        }

        const storedSyncEnabled = await getSetting("isSyncEnabled");
        if (storedSyncEnabled !== undefined) {
          setIsSyncEnabled(storedSyncEnabled);
        }

        const storedLastSynced = await getSetting("lastSynced");
        if (storedLastSynced) {
          setLastSynced(storedLastSynced);
        }

        const storedAutoTheme = await getSetting("autoTheme");
        if (storedAutoTheme !== undefined) {
          setAutoTheme(storedAutoTheme);
        }
        const storedAutoThemeLightUntil = await getSetting(
          "autoThemeLightUntil",
        );
        if (storedAutoThemeLightUntil !== undefined) {
          setAutoThemeLightUntil(storedAutoThemeLightUntil);
        }
        const storedAutoThemeDarkUntil = await getSetting("autoThemeDarkUntil");
        if (storedAutoThemeDarkUntil !== undefined) {
          setAutoThemeDarkUntil(storedAutoThemeDarkUntil);
        }
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const generateSyncKey = () => {
    const rand = () => Math.random().toString(36).substring(2, 8);
    return `readlib-sync-${rand()}-${rand()}`;
  };

  const uploadToCloud = async (key, currentBooks) => {
    const booksToSync = currentBooks.map(
      ({ fileHandle: _, cover: __, ...rest }) => rest,
    );
    const payload = {
      userName,
      yearlyGoal,
      readingHistory,
      books: booksToSync,
      lastUpdated: new Date().toISOString(),
    };

    const response = await fetch(
      `https://kvdb.io/readlib_sync_v1_bucket/${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to upload: ${response.statusText}`);
    }
  };

  const syncWithCloud = async (forceKey = null) => {
    const activeKey = forceKey || syncKey;
    if (!activeKey) return;

    try {
      const response = await fetch(
        `https://kvdb.io/readlib_sync_v1_bucket/${activeKey}`,
      );
      let cloudData = null;
      if (response.ok) {
        cloudData = await response.json();
      }

      const localBooks = await getAllBooks();

      if (!cloudData) {
        await uploadToCloud(activeKey, localBooks);
        const now = new Date().toISOString();
        setLastSynced(now);
        await setSetting("lastSynced", now);
        return;
      }

      if (cloudData.userName && cloudData.userName !== userName) {
        setUserName(cloudData.userName);
        await setSetting("userName", cloudData.userName);
      }
      if (cloudData.yearlyGoal && cloudData.yearlyGoal !== yearlyGoal) {
        setYearlyGoal(cloudData.yearlyGoal);
        await setSetting("yearlyGoal", cloudData.yearlyGoal);
      }

      const mergedHistory = { ...readingHistory };
      if (cloudData.readingHistory) {
        for (const [date, pages] of Object.entries(cloudData.readingHistory)) {
          mergedHistory[date] = Math.max(mergedHistory[date] || 0, pages);
        }
        setReadingHistory(mergedHistory);
        await setSetting("readingHistory", mergedHistory);
      }

      const mergedBooks = [...localBooks];
      let updatedLocalDb = false;

      if (cloudData.books && Array.isArray(cloudData.books)) {
        for (const cloudBook of cloudData.books) {
          const localMatch = mergedBooks.find((b) => b.id === cloudBook.id);
          if (localMatch) {
            const cloudDate = cloudBook.lastRead
              ? new Date(cloudBook.lastRead)
              : new Date(0);
            const localDate = localMatch.lastRead
              ? new Date(localMatch.lastRead)
              : new Date(0);

            if (
              cloudDate > localDate ||
              cloudBook.progress > localMatch.progress
            ) {
              const updatedBook = {
                ...localMatch,
                ...cloudBook,
                fileHandle: localMatch.fileHandle,
                cover: localMatch.cover || cloudBook.cover,
              };
              await saveBook(updatedBook);
              const idx = mergedBooks.findIndex((b) => b.id === cloudBook.id);
              mergedBooks[idx] = updatedBook;
              updatedLocalDb = true;
            }
          } else {
            const newBook = {
              ...cloudBook,
              fileHandle: null,
              fileMissing: true,
            };
            await saveBook(newBook);
            mergedBooks.push(newBook);
            updatedLocalDb = true;
          }
        }

        if (updatedLocalDb) {
          setBooks(mergedBooks);
        }
      }

      await uploadToCloud(activeKey, mergedBooks);
      const now = new Date().toISOString();
      setLastSynced(now);
      await setSetting("lastSynced", now);
    } catch (err) {
      console.error("Cloud sync failed:", err);
      throw err;
    }
  };

  const triggerAutoSync = async () => {
    if (isSyncEnabled && syncKey) {
      try {
        const currentBooks = await getAllBooks();
        await uploadToCloud(syncKey, currentBooks);
        const now = new Date().toISOString();
        setLastSynced(now);
        await setSetting("lastSynced", now);
      } catch (err) {
        console.warn("Auto-sync background upload failed", err);
      }
    }
  };

  const enableCloudSync = async () => {
    const key = generateSyncKey();
    setSyncKey(key);
    setIsSyncEnabled(true);
    await setSetting("syncKey", key);
    await setSetting("isSyncEnabled", true);

    try {
      const currentBooks = await getAllBooks();
      await uploadToCloud(key, currentBooks);
      const now = new Date().toISOString();
      setLastSynced(now);
      await setSetting("lastSynced", now);
    } catch (err) {
      console.warn("Failed first upload during enable:", err);
    }
  };

  const disableCloudSync = async () => {
    setIsSyncEnabled(false);
    await setSetting("isSyncEnabled", false);
  };

  const importSyncKey = async (key) => {
    if (!key || !key.trim()) return;
    const cleanKey = key.trim();
    setSyncKey(cleanKey);
    setIsSyncEnabled(true);
    await setSetting("syncKey", cleanKey);
    await setSetting("isSyncEnabled", true);
    initSync();
  };

  const logReadingSession = async (pages) => {
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local time
    const newHistory = {
      ...readingHistory,
      [today]: (readingHistory[today] || 0) + pages,
    };
    setReadingHistory(newHistory);
    await setSetting("readingHistory", newHistory);
    void triggerAutoSync();
  };

  const updateUserName = async (name) => {
    setUserName(name);
    await setSetting("userName", name);
    void triggerAutoSync();
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

  // Upgrade Google Books thumbnail URL: force HTTPS and remove page-curl effect
  const upgradeGoogleBooksImage = (url) => {
    if (!url) return null;
    return url
      .replace(/^http:\/\//, "https://") // force HTTPS
      .replace(/&edge=curl/, ""); // remove page-curl effect
  };

  // Try to get the best quality cover: zoom=0 first, validate it, fallback to zoom=1
  const getBestCoverUrl = async (url) => {
    if (!url) return null;
    const base = upgradeGoogleBooksImage(url);
    // Try zoom=0 (full res) first
    const hiRes = base.replace(/zoom=\d+/, "zoom=0");
    try {
      const res = await fetch(hiRes, { method: "HEAD" });
      // Google returns 200 even for "image not available" placeholders,
      // but those are very small (~1KB). Real covers are >5KB.
      if (res.ok && parseInt(res.headers.get("content-length") || "0") > 5000) {
        return hiRes;
      }
    } catch {}
    // Fallback: zoom=1 (thumbnail ~128px, always works)
    return base;
  };

  const fetchBookMetadata = async (title, author) => {
    try {
      const query = encodeURIComponent(
        `intitle:${title}${author && author !== "Unknown Author" ? "+inauthor:" + author : ""}`,
      );
      const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || "";
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5` +
          (apiKey ? `&key=${apiKey}` : ``),
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        // Prefer a result that actually has a cover image
        const item =
          data.items.find((v) => v.volumeInfo?.imageLinks?.thumbnail) ||
          data.items[0];
        const info = item.volumeInfo;

        // Fetch the full volume record to get higher-quality imageLinks
        let fullImageLinks = info.imageLinks || {};
        try {
          const volumeRes = await fetch(
            `https://www.googleapis.com/books/v1/volumes/${item.id}` +
              (apiKey ? `?key=${apiKey}` : ``),
          );
          const volumeData = await volumeRes.json();
          if (volumeData.volumeInfo?.imageLinks) {
            fullImageLinks = volumeData.volumeInfo.imageLinks;
          }
        } catch {}

        // Pick best available quality from full volume record
        const rawCover =
          fullImageLinks.extraLarge ||
          fullImageLinks.large ||
          fullImageLinks.medium ||
          fullImageLinks.small ||
          fullImageLinks.thumbnail ||
          fullImageLinks.smallThumbnail ||
          null;

        // Try zoom=0 with validation, fallback to zoom=1
        const cover = await getBestCoverUrl(rawCover);

        return {
          author: info.authors?.join(", ") || "",
          description: info.description || "",
          cover,
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
    let metadata = null;
    // Fallback to Open Library API (no API key required)
    try {
      const olQuery = encodeURIComponent(`${title} ${author || ""}`);
      const olResponse = await fetch(
        `https://openlibrary.org/search.json?q=${olQuery}`,
      );
      const olData = await olResponse.json();
      if (olData.docs && olData.docs.length > 0) {
        const first = olData.docs[0];
        metadata = {
          description: first.first_sentence?.value || "",
          cover: first.cover_i
            ? `https://covers.openlibrary.org/b/id/${first.cover_i}-L.jpg`
            : null,
          publisher: first.publisher?.[0] || "",
          publishedDate: first.first_publish_year || "",
          pageCount: first.number_of_pages_median || 0,
          genre: detectGenre(title, author),
        };
      }
    } catch (e) {
      console.warn("Open Library fallback failed", e);
    }
    return metadata;
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

      // 1. Generate scanned cover thumbnail FIRST as default
      if (!updatedBook.cover && book.fileHandle) {
        try {
          const isEpub = book.id.toLowerCase().endsWith(".epub");
          const scannedCover = isEpub
            ? await generateEpubThumbnail(book.fileHandle)
            : await generateThumbnail(book.fileHandle);

          if (scannedCover) {
            updatedBook.cover = scannedCover;
            updatedBook.scannedCover = scannedCover;
            needsUpdate = true;
          }
        } catch (err) {
          console.warn(`Failed to generate scanned cover for ${book.id}:`, err);
        }
      }

      // 2. Fetch external metadata (description, publisher, etc.)
      // Save Google Books cover in googleCover, but DO NOT overwrite the default scanned cover!
      if (
        book.fileHandle &&
        (!updatedBook.description || !updatedBook.publisher) &&
        (book.author === "Unknown Author" || !book.publisher)
      ) {
        try {
          const external = await fetchBookMetadata(
            updatedBook.title,
            updatedBook.author,
          );
          if (external) {
            if (!updatedBook.description && external.description)
              updatedBook.description = external.description;
            if (external.cover) {
              updatedBook.googleCover = external.cover;
              // Fallback to Google cover only if file has no scanned cover
              if (!updatedBook.cover) {
                updatedBook.cover = external.cover;
              }
            }
            if (!updatedBook.publisher && external.publisher)
              updatedBook.publisher = external.publisher;
            if (!updatedBook.publishedDate && external.publishedDate)
              updatedBook.publishedDate = external.publishedDate;
            if (!updatedBook.pageCount && external.pageCount)
              updatedBook.pageCount = external.pageCount;
            if (!updatedBook.genre && external.genre)
              updatedBook.genre = external.genre;
            needsUpdate = true;
          }
        } catch (e) {
          console.warn("External metadata fetch failed", e);
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
    void triggerAutoSync();
  };

  const regenerateCoverFromFile = async (book, pageNum = 1) => {
    if (!book || !book.fileHandle) return null;
    try {
      const isEpub = book.id.toLowerCase().endsWith(".epub");
      const cover = isEpub
        ? await generateEpubThumbnail(book.fileHandle)
        : await generateThumbnail(book.fileHandle, 600, pageNum);

      if (cover) {
        const updatedBook = {
          ...book,
          cover,
          scannedCover: cover,
          coverPage: isEpub ? 1 : pageNum,
        };
        await updateBook(updatedBook);
        return cover;
      }
    } catch (err) {
      console.warn(`Failed to regenerate cover for ${book.id}:`, err);
      throw err;
    }
    return null;
  };

  const deleteBook = async (bookId) => {
    await deleteBookDB(bookId);
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    void triggerAutoSync();
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
    void triggerAutoSync();
  };

  const backupData = async () => {
    try {
      const allBooks = await getAllBooks();
      const theme = await getSetting("theme");
      const userName = await getSetting("userName");
      const readingHistory = await getSetting("readingHistory");
      const yearlyGoal = await getSetting("yearlyGoal");
      const collections = await getSetting("collections");
      const syncKey = await getSetting("syncKey");
      const isSyncEnabled = await getSetting("isSyncEnabled");
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        books: allBooks,
        settings: {
          theme,
          userName,
          readingHistory,
          yearlyGoal,
          collections,
          syncKey,
          isSyncEnabled,
        },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      a.download = `ReadLib-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Backup failed:", err);
    }
  };

  const restoreData = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version || !data.books) {
          alert("Invalid backup file");
          return;
        }
        for (const book of data.books) {
          await saveBook(book);
        }
        if (data.settings) {
          for (const [key, value] of Object.entries(data.settings)) {
            if (value !== undefined) {
              await setSetting(key, value);
            }
          }
        }
        window.location.reload();
      } catch (err) {
        console.error("Restore failed:", err);
        alert("Failed to restore backup. Check the file and try again.");
      }
    };
    input.click();
  };

  const updateAutoTheme = async (val) => {
    setAutoTheme(val);
    await setSetting("autoTheme", val);
  };

  const updateAutoThemeSchedule = async (darkUntil, lightUntil) => {
    setAutoThemeDarkUntil(darkUntil);
    setAutoThemeLightUntil(lightUntil);
    await setSetting("autoThemeDarkUntil", darkUntil);
    await setSetting("autoThemeLightUntil", lightUntil);
  };

  const addManualBook = async (bookData) => {
    let metadata = null;
    try {
      metadata = await fetchBookMetadata(bookData.title, bookData.author);
    } catch (e) {
      console.warn("Failed to fetch manual book metadata enrichment:", e);
    }

    const newBook = {
      id: `manual-${Date.now()}`,
      title: bookData.title || "Untitled",
      author: bookData.author || "Unknown Author",
      fileHandle: null,
      category: bookData.category || "Planned",
      genre: bookData.genre || metadata?.genre || "Other",
      progress: bookData.category === "Completed" ? 100 : 0,
      lastRead:
        bookData.category === "Completed" ? new Date().toISOString() : null,
      addedAt: new Date().toISOString(),
      cover: bookData.cover || metadata?.cover || null,
      pageCount: metadata?.pageCount || 0,
      isFavorite: false,
      isManual: true,
      notes: bookData.notes || "",
      description: metadata?.description || "",
      publisher: metadata?.publisher || "",
      publishedDate: metadata?.publishedDate || "",
    };
    await saveBook(newBook);
    setBooks((prev) => [...prev, newBook]);
    void triggerAutoSync();
    return newBook;
  };

  // Keep refs up to date to avoid stale closures
  useEffect(() => {
    syncWithCloudRef.current = syncWithCloud;
  }, [syncWithCloud]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    toggleThemeRef.current = toggleTheme;
  }, [toggleTheme]);

  // Auto-sync interval (every 5 minutes) if enabled
  useEffect(() => {
    if (isSyncEnabled && syncKey) {
      const interval = setInterval(
        () => {
          if (syncWithCloudRef.current) syncWithCloudRef.current();
        },
        5 * 60 * 1000,
      );
      return () => clearInterval(interval);
    }
  }, [isSyncEnabled, syncKey]);

  // Auto-theme effect - check every minute if autoTheme is enabled
  useEffect(() => {
    if (!autoTheme) return;
    const checkTheme = () => {
      const hour = new Date().getHours();
      const isDark = hour >= autoThemeDarkUntil || hour < autoThemeLightUntil;
      const desiredTheme = isDark ? "dark" : "light";
      if (themeRef.current !== desiredTheme) {
        toggleThemeRef.current();
      }
    };
    checkTheme();
    const interval = setInterval(checkTheme, 60000);
    return () => clearInterval(interval);
  }, [autoTheme, autoThemeDarkUntil, autoThemeLightUntil]);

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
        regenerateCoverFromFile,
        syncKey,
        isSyncEnabled,
        lastSynced,
        syncWithCloud,
        enableCloudSync,
        disableCloudSync,
        importSyncKey,
        autoTheme,
        autoThemeLightUntil,
        autoThemeDarkUntil,
        backupData,
        restoreData,
        updateAutoTheme,
        updateAutoThemeSchedule,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  return useContext(LibraryContext);
}
