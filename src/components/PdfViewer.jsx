import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  BookOpen,
  Layout,
  Scroll,
  Sun,
  Moon,
  Coffee,
  Timer,
  Bookmark,
  BookmarkPlus,
  Trash2,
  X,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useLibrary } from "../context/LibraryContext";
import { verifyPermission } from "../services/db";
import "./PdfViewer.css";

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

async function fitPdfToWidth(pdf, pageNum, setScale) {
  if (!pdf) return;

  try {
    const page = await pdf.getPage(pageNum);
    const vp = page.getViewport({ scale: 1 });
    const container = document.querySelector(".pdf-content-area");
    if (container) {
      const padding = window.innerWidth < 768 ? 4 : 40;
      const containerWidth = container.clientWidth - padding;
      const newScale = containerWidth / vp.width;
      setScale(+newScale.toFixed(2));
    }
  } catch (err) {
    console.warn("Fit to width failed:", err);
  }
}

function PdfViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    findBookById,
    updateBook,
    logReadingSession,
    loading: libraryLoading,
  } = useLibrary();
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const loadingTaskRef = useRef(null);
  const lastSavedPageRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState({
    width: 600,
    height: 800,
  });
  const [scale, setScale] = useState(window.innerWidth < 500 ? 0.8 : 1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("single"); // 'single' or 'vertical'
  const [readerTheme, setReaderTheme] = useState("light"); // 'light', 'sepia', 'night'
  const [pageInput, setPageInput] = useState("1");
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [fontFamily, setFontFamily] = useState("inter");
  const bookRef = useRef(null);
  const lastLoggedPage = useRef(0);
  const touchStartX = useRef(null);

  // Reading timer
  useEffect(() => {
    const interval = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Find the book using robust helper
  const book = findBookById(id);
  const missingBookError =
    !libraryLoading && (!book || !book.fileHandle)
      ? "Book not found or file handle unavailable. Please re-select the library folder in Settings."
      : null;

  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  const fitToWidth = useCallback(() => {
    return fitPdfToWidth(pdfDocRef.current || pdfDoc, currentPage, setScale);
  }, [pdfDoc, currentPage]);

  // Clean up PDF on unmount
  useEffect(() => {
    return () => {
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {}
        loadingTaskRef.current = null;
      }
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {}
        pdfDocRef.current = null;
      }
    };
  }, []);

  // Load the PDF - only triggers when book ID / fileHandle changes or library finish loading
  useEffect(() => {
    if (libraryLoading || !book?.fileHandle) return;

    let cancelled = false;

    async function loadPdf() {
      try {
        setLoading(true);
        setError(null);

        const hasPermission = await verifyPermission(book.fileHandle);
        if (!hasPermission) {
          setError(
            "Permission denied. Please grant access to the file or re-select the library folder.",
          );
          setLoading(false);
          return;
        }

        const file = await book.fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();

        // Destroy previous pdfDoc if any
        if (pdfDocRef.current) {
          try {
            await pdfDocRef.current.destroy();
          } catch {}
          pdfDocRef.current = null;
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        loadingTaskRef.current = loadingTask;

        const pdf = await loadingTask.promise;

        if (cancelled) {
          try {
            pdf.destroy();
          } catch {}
          return;
        }

        pdfDocRef.current = pdf;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        // Get first page dimensions for placeholders
        const firstPage = await pdf.getPage(1);
        const vp = firstPage.getViewport({ scale: 1 });
        setPageDimensions({ width: vp.width, height: vp.height });

        // Restore last read page accurately from current book metadata
        const currentBook = bookRef.current || book;
        let savedPage = 1;
        if (currentBook?.lastLocation && currentBook.lastLocation.startsWith("page-")) {
          const pageNum = parseInt(currentBook.lastLocation.replace("page-", ""));
          if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pdf.numPages) {
            savedPage = pageNum;
          }
        } else if (currentBook?.progress > 0) {
          savedPage = Math.max(
            1,
            Math.round((currentBook.progress / 100) * pdf.numPages),
          );
        }

        setCurrentPage(savedPage);
        setPageInput(savedPage.toString());
        lastLoggedPage.current = savedPage;
        lastSavedPageRef.current = savedPage;
        setLoading(false);

        if (window.innerWidth < 500) {
          setTimeout(() => {
            void fitPdfToWidth(pdf, savedPage, setScale);
          }, 300);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading PDF:", err);
        setError(
          "Failed to load PDF. Try re-selecting the library folder in Settings.",
        );
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {}
        loadingTaskRef.current = null;
      }
    };
  }, [id, book?.fileHandle, libraryLoading]);

  // Render a page with cancellation support
  const renderPage = useCallback(
    async (
      pageNum,
      canvas,
      isList = false,
      textLayerDiv = null,
      renderCanvas = true,
    ) => {
      if (!pdfDoc || !canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({
          scale: isList ? scale * 0.8 : scale,
        });

        if (renderCanvas) {
          // Cancel previous render on this canvas if active
          if (canvas._renderTask) {
            try {
              canvas._renderTask.cancel();
            } catch {}
            canvas._renderTask = null;
          }

          const context = canvas.getContext("2d");
          const dpr = isList
            ? Math.min(window.devicePixelRatio || 1, 1.5)
            : window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          context.scale(dpr, dpr);

          const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
          });
          canvas._renderTask = renderTask;

          try {
            await renderTask.promise;
          } catch (renderErr) {
            if (renderErr?.name === "RenderingCancelledException") {
              return;
            }
            throw renderErr;
          } finally {
            if (canvas._renderTask === renderTask) {
              canvas._renderTask = null;
            }
          }
        }

        // Render text layer
        if (textLayerDiv) {
          textLayerDiv.innerHTML = "";
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.left = "0px";
          textLayerDiv.style.top = "0px";

          const textContent = await page.getTextContent();
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
          });
          await textLayer.render();
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
      }
    },
    [pdfDoc, scale],
  );

  useEffect(() => {
    if (viewMode === "single" && !loading && pdfDoc) {
      renderPage(currentPage, canvasRef.current, false, textLayerRef.current);
    }
  }, [pdfDoc, currentPage, scale, viewMode, loading, renderPage]);

  // Save progress and log session only when currentPage changes from saved
  useEffect(() => {
    if (
      !bookRef.current ||
      totalPages <= 0 ||
      !pdfDoc ||
      currentPage === lastSavedPageRef.current
    ) {
      return;
    }

    lastSavedPageRef.current = currentPage;
    const progress = Math.round((currentPage / totalPages) * 100);
    const updatedBook = {
      ...bookRef.current,
      progress,
      lastLocation: `page-${currentPage}`,
      lastRead: new Date().toISOString(),
      category:
        bookRef.current.category === "Planned"
          ? "Reading"
          : bookRef.current.category,
    };

    // Log reading session if we've moved forward
    if (currentPage > lastLoggedPage.current) {
      logReadingSession(currentPage - lastLoggedPage.current);
      lastLoggedPage.current = currentPage;
    }

    if (currentPage === totalPages) {
      updatedBook.progress = 100;
      updatedBook.category = "Completed";
    }
    updateBook(updatedBook);
  }, [currentPage, totalPages, pdfDoc, logReadingSession, updateBook]);

  const isJumping = useRef(false);
  const jumpTimeout = useRef(null);

  const jumpToPage = useCallback(
    (pageNum, behavior = "smooth") => {
      const validPage = Math.max(1, Math.min(totalPages, pageNum));
      setCurrentPage(validPage);
      setPageInput(validPage.toString());

      if (viewMode === "vertical" && containerRef.current) {
        const target = containerRef.current.querySelector(
          `.pdf-page-item[data-page="${validPage}"]`,
        );
        if (target) {
          isJumping.current = true;
          if (jumpTimeout.current) clearTimeout(jumpTimeout.current);

          target.scrollIntoView({ behavior, block: "start" });

          // Resume observer after scroll finishes
          jumpTimeout.current = setTimeout(
            () => {
              isJumping.current = false;
            },
            behavior === "smooth" ? 800 : 50,
          );
        }
      }
    },
    [totalPages, viewMode],
  );

  // Scroll to current page when switching to vertical mode
  useEffect(() => {
    if (viewMode === "vertical" && pdfDoc) {
      // Use instant scroll on mode switch to avoid "starting at 3" bug
      setTimeout(() => jumpToPage(currentPage, "auto"), 50);
    }
  }, [viewMode, pdfDoc, currentPage, jumpToPage]);

  const handleCanvasClick = (e) => {
    if (viewMode !== "single") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    if (ratio < 0.3) goToPrev();
    else if (ratio > 0.7) goToNext();
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || viewMode !== "single") return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    // Only trigger on significant horizontal swipe (> 50px)
    if (Math.abs(deltaX) < 50) return;
    if (deltaX > 0) goToPrev();
    else goToNext();
  };

  const goToPrev = useCallback(() => {
    const prev = Math.max(1, currentPage - 1);
    if (prev !== currentPage) jumpToPage(prev);
  }, [currentPage, jumpToPage]);

  const goToNext = useCallback(() => {
    const next = Math.min(totalPages, currentPage + 1);
    if (next !== currentPage) jumpToPage(next);
  }, [currentPage, totalPages, jumpToPage]);

  const zoomIn = useCallback(
    () => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1))),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1))),
    [],
  );

  // Keyboard navigation — mode-aware
  useEffect(() => {
    const handleKey = (e) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA"
      )
        return;

      if (viewMode === "single") {
        // Single-page mode:
        //   Left / Right  → flip pages
        //   Up / Down     → scroll the canvas wrapper
        //   Space         → next page
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            goToPrev();
            break;
          case "ArrowRight":
          case " ":
            e.preventDefault();
            goToNext();
            break;
          case "ArrowUp": {
            e.preventDefault();
            const wrapper = document.querySelector(".pdf-canvas-wrapper");
            if (wrapper) wrapper.scrollBy({ top: -120, behavior: "smooth" });
            break;
          }
          case "ArrowDown": {
            e.preventDefault();
            const wrapper = document.querySelector(".pdf-canvas-wrapper");
            if (wrapper) wrapper.scrollBy({ top: 120, behavior: "smooth" });
            break;
          }
          default:
            break;
        }
      } else {
        // Vertical scroll mode:
        //   Up / Down     → scroll document (large step)
        //   Left / Right  → jump to prev/next page anchor
        //   Space         → scroll down
        switch (e.key) {
          case "ArrowUp": {
            e.preventDefault();
            const container = document.querySelector(".pdf-vertical-container");
            if (container)
              container.scrollBy({ top: -200, behavior: "smooth" });
            break;
          }
          case "ArrowDown":
          case " ": {
            e.preventDefault();
            const container = document.querySelector(".pdf-vertical-container");
            if (container) container.scrollBy({ top: 200, behavior: "smooth" });
            break;
          }
          case "ArrowLeft": {
            e.preventDefault();
            goToPrev();
            break;
          }
          case "ArrowRight": {
            e.preventDefault();
            goToNext();
            break;
          }
          default:
            break;
        }
      }

      // Shared shortcuts regardless of mode
      if (e.key === "Escape") navigate(-1);
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goToPrev, goToNext, navigate, viewMode, zoomIn, zoomOut]);

  // Vertical Scroll Observer - Track current page closest to the top of viewport
  useEffect(() => {
    if (viewMode !== "vertical" || !containerRef.current) return;

    const container = containerRef.current;
    let frameId;

    const onScroll = () => {
      if (isJumping.current) return;

      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const items = container.querySelectorAll(".pdf-page-item");
        let closestPage = currentPage;
        let minDistance = Infinity;

        const containerTop = container.getBoundingClientRect().top;

        items.forEach((item) => {
          const rect = item.getBoundingClientRect();
          // Distance from page top to viewport top
          const distance = Math.abs(rect.top - containerTop);
          if (distance < minDistance) {
            minDistance = distance;
            const pageNum = parseInt(item.getAttribute("data-page"));
            if (pageNum) {
              closestPage = pageNum;
            }
          }
        });

        if (closestPage !== currentPage) {
          setCurrentPage(closestPage);
          setPageInput(closestPage.toString());
        }
      });
    };

    container.addEventListener("scroll", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frameId);
    };
  }, [viewMode, currentPage]);

  const addBookmark = () => {
    if (!bookRef.current) return;
    const newBookmark = {
      id: `bm-${Date.now()}`,
      page: currentPage,
      label:
        prompt("Bookmark name:", `Page ${currentPage}`) ||
        `Page ${currentPage}`,
      createdAt: new Date().toISOString(),
    };
    const updatedBook = {
      ...bookRef.current,
      bookmarks: [...(bookRef.current.bookmarks || []), newBookmark],
    };
    updateBook(updatedBook);
  };

  const jumpToBookmark = (page) => {
    jumpToPage(page);
    setShowBookmarks(false);
  };

  const deleteBookmark = (bookmarkId) => {
    if (!bookRef.current) return;
    const updatedBook = {
      ...bookRef.current,
      bookmarks: (bookRef.current.bookmarks || []).filter(
        (bm) => bm.id !== bookmarkId,
      ),
    };
    updateBook(updatedBook);
  };

  useEffect(() => {
    const container = document.querySelector(".pdf-viewer-container");
    if (container) {
      container.style.setProperty(
        "--reader-font",
        fontFamily === "inter"
          ? "'Inter', sans-serif"
          : fontFamily === "serif"
            ? "Georgia, serif"
            : fontFamily === "mono"
              ? "'JetBrains Mono', monospace"
              : "-apple-system, sans-serif",
      );
    }
  }, [fontFamily]);

  if (missingBookError) {
    return (
      <div className="pdf-viewer-container">
        <div className="pdf-error">
          <div className="pdf-error-icon">
            <BookOpen size={36} />
          </div>
          <h3>Unable to load PDF</h3>
          <p>{missingBookError}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (libraryLoading || loading) {
    return (
      <div className="pdf-viewer-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>
            {libraryLoading
              ? "Loading library database..."
              : "Opening your PDF..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-container">
        <div className="pdf-error">
          <div className="pdf-error-icon">
            <BookOpen size={36} />
          </div>
          <h3>Unable to load PDF</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const progressPercent =
    totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className={`pdf-viewer-container reader-theme-${readerTheme}`}>
      <div className="reader-main-toolbar">
        <div className="pdf-toolbar-left">
          <button
            className="btn btn-icon"
            onClick={() => navigate(-1)}
            title="Go back (Esc)"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="pdf-title">{book?.title || "PDF Viewer"}</span>
        </div>

        <div className="pdf-toolbar-center">
          <button
            className="btn btn-icon"
            onClick={goToPrev}
            disabled={currentPage <= 1}
            title="Previous page (←)"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="pdf-page-info">
            <input
              type="text"
              className="pdf-page-input"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const val = parseInt(pageInput);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  jumpToPage(val);
                } else {
                  setPageInput(currentPage.toString());
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = parseInt(pageInput);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    jumpToPage(val);
                    e.target.blur();
                  }
                }
              }}
            />
            <span className="pdf-page-total">/ {totalPages}</span>
          </span>
          <button
            className="btn btn-icon"
            onClick={goToNext}
            disabled={currentPage >= totalPages}
            title="Next page (→)"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="pdf-toolbar-right">
          <div className="toolbar-group">
            <button
              className={`btn btn-icon ${viewMode === "single" ? "active" : ""}`}
              onClick={() => setViewMode("single")}
              title="Single Page"
            >
              <Layout size={18} />
            </button>
            <button
              className={`btn btn-icon ${viewMode === "vertical" ? "active" : ""}`}
              onClick={() => setViewMode("vertical")}
              title="Vertical Scroll"
            >
              <Scroll size={18} />
            </button>
          </div>
          <div className="toolbar-divider"></div>
          <div className="toolbar-group">
            <button
              className={`btn btn-icon theme-btn-light ${readerTheme === "light" ? "active" : ""}`}
              onClick={() => setReaderTheme("light")}
              title="Light Theme"
            >
              <Sun size={18} />
            </button>
            <button
              className={`btn btn-icon theme-btn-sepia ${readerTheme === "sepia" ? "active" : ""}`}
              onClick={() => setReaderTheme("sepia")}
              title="Sepia Theme"
            >
              <Coffee size={18} />
            </button>
            <button
              className={`btn btn-icon theme-btn-night ${readerTheme === "night" ? "active" : ""}`}
              onClick={() => setReaderTheme("night")}
              title="Night Theme"
            >
              <Moon size={18} />
            </button>
          </div>
          <div className="toolbar-divider"></div>
          <button
            className="btn btn-icon"
            onClick={zoomOut}
            title="Zoom out (-)"
          >
            <ZoomOut size={16} />
          </button>
          <span
            className="zoom-label"
            onClick={fitToWidth}
            style={{ cursor: "pointer" }}
            title="Fit to width"
          >
            {Math.round(scale * 100)}%
          </span>
          <button className="btn btn-icon" onClick={zoomIn} title="Zoom in (+)">
            <ZoomIn size={16} />
          </button>
          <button
            className="btn btn-icon"
            onClick={fitToWidth}
            title="Fit to Width"
          >
            <Maximize size={16} />
          </button>
          <div className="toolbar-divider"></div>
          <select
            className="font-select"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            title="Font"
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
            <BookmarkPlus size={16} />
          </button>
          <button
            className="btn btn-icon"
            onClick={() => setShowBookmarks(!showBookmarks)}
            title="Bookmarks"
          >
            <Bookmark size={16} />
          </button>
          <div className="toolbar-divider"></div>
          <span className="reading-timer" title="Session reading time">
            <Timer size={13} /> {formatTime(sessionSeconds)}
          </span>
        </div>
      </div>

      <div className="pdf-progress-bar">
        <div
          className="pdf-progress-fill"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="pdf-content-area">
        {/* Side Panels */}

        {viewMode === "single" ? (
          <div
            className="pdf-canvas-wrapper single-view"
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="pdf-page-container">
              <canvas ref={canvasRef} className="pdf-canvas"></canvas>
              <div ref={textLayerRef} className="text-layer"></div>
            </div>
          </div>
        ) : (
          <div className="pdf-vertical-container" ref={containerRef}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <PdfPageItem
                  key={pageNum}
                  pageNum={pageNum}
                  renderPage={renderPage}
                  scale={scale}
                  dimensions={pageDimensions}
                />
              ),
            )}
          </div>
        )}
      </div>
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
            {(book?.bookmarks || []).length === 0 ? (
              <p className="bookmarks-empty">
                No bookmarks yet. Add one from the toolbar!
              </p>
            ) : (
              (book?.bookmarks || []).map((bm) => (
                <div key={bm.id} className="bookmark-item">
                  <div
                    className="bookmark-info"
                    onClick={() => jumpToBookmark(bm.page)}
                  >
                    <Bookmark size={14} />
                    <span className="bookmark-label">{bm.label}</span>
                    <span className="bookmark-page">p.{bm.page}</span>
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

function PdfPageItem({ pageNum, renderPage, scale, dimensions }) {
  const itemRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasRenderedRef = useRef(false);

  // Calculate placeholder height based on scale and original dimensions
  const placeholderHeight = dimensions ? dimensions.height * scale : 800;
  const placeholderWidth = dimensions ? dimensions.width * scale : 600;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.0, rootMargin: "500px 0px" },
    );

    if (itemRef.current) observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, []);

  // When scale changes, reset rendered state so visible pages re-render
  useEffect(() => {
    hasRenderedRef.current = false;
  }, [scale]);

  useEffect(() => {
    let canvasTimer;
    let textLayerTimer;

    if (isVisible && canvasRef.current) {
      // Skip rendering if this page was already rendered (cache hit)
      if (
        hasRenderedRef.current &&
        canvasRef.current.width > 1 &&
        canvasRef.current.height > 1
      ) {
        return;
      }

      // Debounce canvas rendering to avoid rendering pages the user just scrolls past quickly
      canvasTimer = setTimeout(async () => {
        if (!canvasRef.current) return;
        await renderPage(pageNum, canvasRef.current, true, null, true);
        hasRenderedRef.current = true;

        // Render heavy text layer with additional delay
        textLayerTimer = setTimeout(async () => {
          if (canvasRef.current && textLayerRef.current) {
            await renderPage(
              pageNum,
              canvasRef.current,
              true,
              textLayerRef.current,
              false,
            );
          }
        }, 250);
      }, 80);
    } else if (!isVisible && canvasRef.current) {
      // Free canvas backing store bitmap and text DOM to conserve RAM/VRAM
      if (canvasRef.current._renderTask) {
        try {
          canvasRef.current._renderTask.cancel();
        } catch {}
        canvasRef.current._renderTask = null;
      }
      if (canvasRef.current.width > 1 || canvasRef.current.height > 1) {
        canvasRef.current.width = 1;
        canvasRef.current.height = 1;
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, 1, 1);
      }
      hasRenderedRef.current = false;
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = "";
      }
    }

    return () => {
      if (canvasTimer) clearTimeout(canvasTimer);
      if (textLayerTimer) clearTimeout(textLayerTimer);
    };
  }, [isVisible, pageNum, scale, renderPage]);

  // Clean up canvas bitmap on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        if (canvasRef.current._renderTask) {
          try {
            canvasRef.current._renderTask.cancel();
          } catch {}
          canvasRef.current._renderTask = null;
        }
        canvasRef.current.width = 1;
        canvasRef.current.height = 1;
      }
    };
  }, []);

  return (
    <div
      ref={itemRef}
      className="pdf-page-item"
      data-page={pageNum}
      style={{
        minHeight: `${placeholderHeight}px`,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div className="pdf-page-container" style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          className="pdf-canvas"
          style={{
            width: isVisible ? undefined : `${placeholderWidth}px`,
            height: isVisible ? undefined : `${placeholderHeight}px`,
            visibility: isVisible ? "visible" : "hidden",
          }}
        ></canvas>
        <div ref={textLayerRef} className="text-layer"></div>
      </div>
      <div className="page-number-hint">{pageNum}</div>
    </div>
  );
}

export default PdfViewer;
