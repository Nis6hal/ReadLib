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
} from "lucide-react";
import ePub from "epubjs";
import { useLibrary } from "../context/LibraryContext";
import { verifyPermission } from "../services/db";
import "./EpubViewer.css";

function applyRenditionTheme(rendition, theme) {
  const themes = rendition.themes;
  const bgColor =
    theme === "night" ? "#0f172a" : theme === "sepia" ? "#f4ecd8" : "#ffffff";
  const textColor = theme === "night" ? "#cbd5e1" : "#334155";

  themes.register(theme, {
    body: {
      background: `${bgColor} !important`,
      color: `${textColor} !important`,
      "font-family": "'Inter', sans-serif !important",
    },
  });
  themes.select(theme);
}

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

  const applyTheme = useCallback((theme) => {
    if (!renditionRef.current) return;
    applyRenditionTheme(renditionRef.current, theme);
    setReaderTheme(theme);
  }, []);

  useEffect(() => {
    if (libraryLoading) return;
    const currentBookSnapshot = findBookById(id);
    if (!currentBookSnapshot?.fileHandle) return;

    let cancelled = false;

    async function loadEpub() {
      try {
        const hasPermission = await verifyPermission(currentBookSnapshot.fileHandle);
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
                  currentBookData.category === "Planned" ? "Reading" : currentBookData.category,
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
        <p>{libraryLoading ? "Loading library database..." : "Opening your book..."}</p>
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
    </div>
  );
}

export default EpubViewer;
