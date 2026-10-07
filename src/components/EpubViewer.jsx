import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  BookmarkPlus,
  Trash2,
  X,
} from "lucide-react";
import ePub from "epubjs";
import { useLibrary } from "../context/LibraryContext";
import { verifyPermission } from "../services/db";
import "./EpubViewer.css";

function EpubViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { findBookById, updateBook, loading: libraryLoading } = useLibrary();
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readerTheme, setReaderTheme] = useState("light");
  const [fontSize, setFontSize] = useState(100);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [fontFamily, setFontFamily] = useState("inter");

  const bookData = findBookById(id);
  const bookDataRef = useRef(bookData);

  // Keep ref updated with latest book state
  useEffect(() => {
    bookDataRef.current = bookData;
  }, [bookData]);

  const missingBookError =
    !libraryLoading && (!bookData || !bookData.fileHandle)
      ? "Book not found or file handle unavailable."
      : null;

  const applyTheme = useCallback(
    (theme) => {
      if (!renditionRef.current) return;
      const themes = renditionRef.current.themes;
      const bgColor =
        theme === "night"
          ? "#0f172a"
          : theme === "sepia"
            ? "#f4ecd8"
            : "#ffffff";
      const textColor = theme === "night" ? "#cbd5e1" : "#334155";
      const fonts = {
        inter: "'Inter', sans-serif",
        serif: "Georgia, 'Times New Roman', serif",
        mono: "'JetBrains Mono', 'Fira Code', monospace",
        system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      };
      themes.register(theme, {
        body: {
          background: `${bgColor} !important`,
          color: `${textColor} !important`,
          "font-family": `${fonts[fontFamily] || fonts.inter} !important`,
        },
      });
      themes.select(theme);
      setReaderTheme(theme);
    },
    [fontFamily],
  );

  useEffect(() => {
    if (libraryLoading) return;
    const currentBookSnapshot = findBookById(id);
    if (!currentBookSnapshot?.fileHandle) return;

    let cancelled = false;

    async function loadEpub() {
      try {
        const hasPermission = await verifyPermission(
          currentBookSnapshot.fileHandle,
        );
        if (!hasPermission) {
          setError("Permission denied. Please grant access in Settings.");
          setLoading(false);
          return;
        }

        const file = await currentBookSnapshot.fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const epub = ePub(arrayBuffer);
        bookRef.current = epub;

        if (cancelled) return;

        const rendition = epub.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          manager: "default",
        });
        renditionRef.current = rendition;

        // Restore last read location if available
        const display = rendition.display(currentBookSnapshot.lastLocation);

        display.then(() => {
          if (!cancelled) {
            applyTheme(readerTheme);
            setLoading(false);
          }
        });

        rendition.on("relocated", (loc) => {
          if (!cancelled) {
            const progress = loc.start.percentage * 100;
            const currentBookData = bookDataRef.current;
            if (currentBookData) {
              updateBook({
                ...currentBookData,
                progress,
                lastLocation: loc.start.cfi,
                lastRead: new Date().toISOString(),
                category:
                  currentBookData.category === "Planned"
                    ? "Reading"
                    : currentBookData.category,
              });
            }
          }
        });
      } catch (err) {
        console.error("Error loading EPUB:", err);
        if (!cancelled) {
          setError(
            "Failed to load EPUB. It might be corrupted or in an unsupported format.",
          );
          setLoading(false);
        }
      }
    }

    loadEpub();

    return () => {
      cancelled = true;
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [id, findBookById, applyTheme, readerTheme, updateBook, libraryLoading]);

  const changeFontSize = (delta) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    setFontSize(newSize);
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const addBookmark = () => {
    if (!renditionRef.current || !bookData) return;
    const loc = renditionRef.current.location;
    if (!loc) return;
    const cfi = loc.start.cfi;
    const label = `Page ${loc.start.display}`;
    const newBookmark = {
      id: `bm-${Date.now()}`,
      cfi,
      label: prompt("Bookmark name:", label) || label,
      createdAt: new Date().toISOString(),
    };
    const updatedBook = {
      ...bookData,
      bookmarks: [...(bookData.bookmarks || []), newBookmark],
    };
    updateBook(updatedBook);
  };

  const jumpToBookmark = (cfi) => {
    if (renditionRef.current) {
      renditionRef.current.display(cfi);
      setShowBookmarks(false);
    }
  };

  const deleteBookmark = (bookmarkId) => {
    if (!bookData) return;
    const updatedBook = {
      ...bookData,
      bookmarks: (bookData.bookmarks || []).filter(
        (bm) => bm.id !== bookmarkId,
      ),
    };
    updateBook(updatedBook);
  };

  if (missingBookError)
    return (
      <div className="epub-viewer-error">
        <h3>Error</h3>
        <p>{missingBookError}</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );

  if (libraryLoading || loading)
    return (
      <div className="epub-viewer-loading">
        <div className="spinner"></div>
        <p>
          {libraryLoading
            ? "Loading library database..."
            : "Opening your book..."}
        </p>
      </div>
    );

  if (error)
    return (
      <div className="epub-viewer-error">
        <h3>Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );

  return (
    <div className={`epub-viewer-container reader-theme-${readerTheme}`}>
      <div className="epub-toolbar glass-panel">
        <div className="epub-toolbar-left">
          <button className="btn btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <span className="epub-title">{bookData?.title}</span>
        </div>

        <div className="epub-toolbar-right">
          <div className="toolbar-group">
            <button
              className="btn btn-icon"
              onClick={() => changeFontSize(-10)}
            >
              -
            </button>
            <span className="font-size-label">{fontSize}%</span>
            <button className="btn btn-icon" onClick={() => changeFontSize(10)}>
              +
            </button>
          </div>
          <div className="toolbar-divider"></div>
          <div className="toolbar-group">
            <button
              className={`btn btn-icon ${readerTheme === "light" ? "active" : ""}`}
              onClick={() => applyTheme("light")}
            >
              <Sun size={18} />
            </button>
            <button
              className={`btn btn-icon ${readerTheme === "sepia" ? "active" : ""}`}
              onClick={() => applyTheme("sepia")}
            >
              <Coffee size={18} />
            </button>
            <button
              className={`btn btn-icon ${readerTheme === "night" ? "active" : ""}`}
              onClick={() => applyTheme("night")}
            >
              <Moon size={18} />
            </button>
          </div>
          <div className="toolbar-divider"></div>
          <select
            className="font-select"
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              if (renditionRef.current) {
                applyTheme(readerTheme);
              }
            }}
          >
            <option value="inter">Inter</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
            <option value="system">System</option>
          </select>
          <div className="toolbar-divider"></div>
          <button
            className="btn btn-icon"
            onClick={addBookmark}
            title="Add Bookmark"
          >
            <BookmarkPlus size={18} />
          </button>
          <button
            className="btn btn-icon"
            onClick={() => setShowBookmarks(!showBookmarks)}
            title="Bookmarks"
          >
            <Bookmark size={18} />
          </button>
          <div className="toolbar-divider"></div>
          <button
            className="btn btn-icon"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            <Maximize size={18} />
          </button>
        </div>
      </div>

      <div className="epub-viewer-main" ref={viewerRef}></div>

      <button
        className="nav-btn nav-btn-left"
        onClick={() => renditionRef.current?.prev()}
        title="Previous Page"
      >
        <ChevronLeft size={32} />
      </button>
      <button
        className="nav-btn nav-btn-right"
        onClick={() => renditionRef.current?.next()}
        title="Next Page"
      >
        <ChevronRight size={32} />
      </button>
      {showBookmarks && (
        <div className="bookmarks-panel">
          <div className="bookmarks-panel-header">
            <h3>Bookmarks</h3>
            <button
              className="btn btn-icon"
              onClick={() => setShowBookmarks(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="bookmarks-list">
            {(bookData?.bookmarks || []).length === 0 ? (
              <p className="bookmarks-empty">
                No bookmarks yet. Add one from the toolbar!
              </p>
            ) : (
              (bookData?.bookmarks || []).map((bm) => (
                <div key={bm.id} className="bookmark-item">
                  <div
                    className="bookmark-info"
                    onClick={() => jumpToBookmark(bm.cfi)}
                  >
                    <Bookmark size={14} />
                    <span className="bookmark-label">{bm.label}</span>
                  </div>
                  <button
                    className="btn btn-icon btn-icon-sm"
                    onClick={() => deleteBookmark(bm.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EpubViewer;
