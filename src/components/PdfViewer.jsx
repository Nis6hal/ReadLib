import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, BookOpen, Layout, Scroll, Sun, Moon, Coffee, Timer, StickyNote, X as CloseIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useLibrary } from '../context/LibraryContext';
import { verifyPermission } from '../services/db';
import './PdfViewer.css';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function PdfViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books, updateBook, logReadingSession } = useLibrary();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(window.innerWidth < 768 ? 0.8 : 1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'vertical'
  const [readerTheme, setReaderTheme] = useState('light'); // 'light', 'sepia', 'night'
  const [pageInput, setPageInput] = useState('1');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const renderingRef = useRef(false);
  const bookRef = useRef(null);
  const lastLoggedPage = useRef(0);

  // Reading timer
  useEffect(() => {
    const interval = setInterval(() => setSessionSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };


  // Find the book - use decodeURIComponent for encoded IDs
  const decodedId = decodeURIComponent(id);
  const book = books.find(b => b.id === decodedId || b.id === id);
  bookRef.current = book;

  // Sync notes text from book on first load
  useEffect(() => {
    if (book?.notes !== undefined && notesText === '') {
      setNotesText(book.notes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  // Load the PDF
  useEffect(() => {
    if (!book || !book.fileHandle) {
      setError('Book not found or file handle unavailable. Please re-select the library folder in Settings.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPdf() {
      try {
        const hasPermission = await verifyPermission(book.fileHandle);
        if (!hasPermission) {
          setError('Permission denied. Please grant access to the file or re-select the library folder.');
          setLoading(false);
          return;
        }

        const file = await book.fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        if (!cancelled) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          
          // Restore last read page
          const savedPage = book.progress > 0 
            ? Math.max(1, Math.round((book.progress / 100) * pdf.numPages))
            : 1;
          setCurrentPage(savedPage);
          setPageInput(savedPage.toString());
          lastLoggedPage.current = savedPage;
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (!cancelled) {
          setError('Failed to load PDF. Try re-selecting the library folder in Settings.');
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [book?.id]);

  // Render a page
  const renderPage = useCallback(async (pageNum, canvas, isList = false) => {
    if (!pdfDoc || !canvas) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: isList ? scale * 0.8 : scale });
      const context = canvas.getContext('2d');

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.scale(dpr, dpr);

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (viewMode === 'single' && !loading && pdfDoc) {
      renderPage(currentPage, canvasRef.current);
    }
  }, [pdfDoc, currentPage, scale, viewMode, loading, renderPage]);

  // Save progress and log session
  useEffect(() => {
    if (bookRef.current && totalPages > 0 && pdfDoc) {
      const progress = Math.round((currentPage / totalPages) * 100);
      setPageInput(currentPage.toString());
      const updatedBook = {
        ...bookRef.current,
        progress,
        lastRead: new Date().toISOString(),
        category: bookRef.current.category === 'Planned' ? 'Reading' : bookRef.current.category,
      };

      // Log reading session if we've moved forward
      if (currentPage > lastLoggedPage.current) {
        logReadingSession(currentPage - lastLoggedPage.current);
        lastLoggedPage.current = currentPage;
      }

      if (currentPage === totalPages) {
        updatedBook.progress = 100;
        updatedBook.category = 'Completed';
      }
      updateBook(updatedBook);
    }
  }, [currentPage, totalPages]);

  const goToPrev = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const goToNext = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), [totalPages]);
  const zoomIn = useCallback(() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1))), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1))), []);
  const resetZoom = useCallback(() => setScale(1.2), []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Helper to scroll to a specific page in vertical mode
  const scrollToPage = useCallback((pageNum) => {
    if (viewMode !== 'vertical' || !containerRef.current) return;
    const target = containerRef.current.querySelector(`.pdf-page-item[data-page="${pageNum}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [viewMode]);

  // Keyboard navigation — mode-aware
  useEffect(() => {
    const handleKey = (e) => {
      // Ignore if user is typing in an input or textarea
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      if (viewMode === 'single') {
        // Single-page mode:
        //   Left / Right  → flip pages
        //   Up / Down     → scroll the canvas wrapper
        //   Space         → next page
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            goToPrev();
            break;
          case 'ArrowRight':
          case ' ':
            e.preventDefault();
            goToNext();
            break;
          case 'ArrowUp': {
            e.preventDefault();
            const wrapper = document.querySelector('.pdf-canvas-wrapper');
            if (wrapper) wrapper.scrollBy({ top: -120, behavior: 'smooth' });
            break;
          }
          case 'ArrowDown': {
            e.preventDefault();
            const wrapper = document.querySelector('.pdf-canvas-wrapper');
            if (wrapper) wrapper.scrollBy({ top: 120, behavior: 'smooth' });
            break;
          }
          default: break;
        }
      } else {
        // Vertical scroll mode:
        //   Up / Down     → scroll document (large step)
        //   Left / Right  → jump to prev/next page anchor
        //   Space         → scroll down
        switch (e.key) {
          case 'ArrowUp': {
            e.preventDefault();
            const container = document.querySelector('.pdf-vertical-container');
            if (container) container.scrollBy({ top: -200, behavior: 'smooth' });
            break;
          }
          case 'ArrowDown':
          case ' ': {
            e.preventDefault();
            const container = document.querySelector('.pdf-vertical-container');
            if (container) container.scrollBy({ top: 200, behavior: 'smooth' });
            break;
          }
          case 'ArrowLeft': {
            e.preventDefault();
            const prevPage = Math.max(1, currentPage - 1);
            if (prevPage !== currentPage) {
              setCurrentPage(prevPage);
              scrollToPage(prevPage);
            }
            break;
          }
          case 'ArrowRight': {
            e.preventDefault();
            const nextPage = Math.min(totalPages, currentPage + 1);
            if (nextPage !== currentPage) {
              setCurrentPage(nextPage);
              scrollToPage(nextPage);
            }
            break;
          }
          default: break;
        }
      }

      // Shared shortcuts regardless of mode
      if (e.key === 'Escape') navigate(-1);
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToPrev, goToNext, navigate, viewMode, zoomIn, zoomOut, currentPage, totalPages, scrollToPage]);

  // Vertical Scroll Observer
  useEffect(() => {
    if (viewMode !== 'vertical' || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page'));
            if (pageNum) setCurrentPage(pageNum);
          }
        });
      },
      { threshold: 0.5 }
    );

    const pageElements = containerRef.current.querySelectorAll('.pdf-page-item');
    pageElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [viewMode, pdfDoc]);

  if (loading) {
    return (
      <div className="pdf-viewer-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-container">
        <div className="pdf-error">
          <div className="pdf-error-icon"><BookOpen size={36} /></div>
          <h3>Unable to load PDF</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Go Back</button>
        </div>
      </div>
    );
  }

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className={`pdf-viewer-container reader-theme-${readerTheme}`}>
      <div className="pdf-toolbar glass-panel">
        <div className="pdf-toolbar-left">
          <button className="btn btn-icon" onClick={() => navigate(-1)} title="Go back (Esc)"><ArrowLeft size={20} /></button>
          <span className="pdf-title">{book?.title || 'PDF Viewer'}</span>
        </div>
        
        <div className="pdf-toolbar-center">
          <button className="btn btn-icon" onClick={goToPrev} disabled={currentPage <= 1} title="Previous page (←)"><ChevronLeft size={20} /></button>
          <span className="pdf-page-info">
            <input 
              type="text" 
              className="pdf-page-input" 
              value={pageInput}
              onChange={e => {
                const valStr = e.target.value;
                setPageInput(valStr);
                
                const val = parseInt(valStr);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                  if (viewMode === 'vertical') {
                    const el = document.querySelector(`[data-page="${val}"]`);
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                }
              }}
              onBlur={() => {
                // Reset to current page if invalid
                if (pageInput === '' || isNaN(parseInt(pageInput))) {
                  setPageInput(currentPage.toString());
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
            />
            <span className="pdf-page-total">/ {totalPages}</span>
          </span>
          <button className="btn btn-icon" onClick={goToNext} disabled={currentPage >= totalPages} title="Next page (→)"><ChevronRight size={20} /></button>
        </div>

        <div className="pdf-toolbar-right">
          <div className="toolbar-group">
            <button className={`btn btn-icon ${viewMode === 'single' ? 'active' : ''}`} onClick={() => setViewMode('single')} title="Single Page"><Layout size={18} /></button>
            <button className={`btn btn-icon ${viewMode === 'vertical' ? 'active' : ''}`} onClick={() => setViewMode('vertical')} title="Vertical Scroll"><Scroll size={18} /></button>
          </div>
          <div className="toolbar-divider"></div>
          <div className="toolbar-group">
            <button className={`btn btn-icon theme-btn-light ${readerTheme === 'light' ? 'active' : ''}`} onClick={() => setReaderTheme('light')} title="Light Theme"><Sun size={18} /></button>
            <button className={`btn btn-icon theme-btn-sepia ${readerTheme === 'sepia' ? 'active' : ''}`} onClick={() => setReaderTheme('sepia')} title="Sepia Theme"><Coffee size={18} /></button>
            <button className={`btn btn-icon theme-btn-night ${readerTheme === 'night' ? 'active' : ''}`} onClick={() => setReaderTheme('night')} title="Night Theme"><Moon size={18} /></button>
          </div>
          <div className="toolbar-divider"></div>
          <button className="btn btn-icon" onClick={zoomOut} title="Zoom out (-)"><ZoomOut size={16} /></button>
          <span className="zoom-label">{Math.round(scale * 100)}%</span>
          <button className="btn btn-icon" onClick={zoomIn} title="Zoom in (+)"><ZoomIn size={16} /></button>
          <div className="toolbar-divider"></div>
          <button
            className={`btn btn-icon ${showNotes ? 'active' : ''}`}
            onClick={() => setShowNotes(v => !v)}
            title="Reading Notes"
          >
            <StickyNote size={18} />
          </button>
          <div className="toolbar-divider"></div>
          <span className="reading-timer" title="Session reading time"><Timer size={13} /> {formatTime(sessionSeconds)}</span>
        </div>
      </div>

      <div className="pdf-progress-bar">
        <div className="pdf-progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      <div className="pdf-content-area">
        {viewMode === 'single' ? (
          <div className="pdf-canvas-wrapper single-view">
            <canvas ref={canvasRef} className="pdf-canvas"></canvas>
          </div>
        ) : (
          <div className="pdf-vertical-container" ref={containerRef}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <PdfPageItem key={pageNum} pageNum={pageNum} renderPage={renderPage} scale={scale} />
            ))}
          </div>
        )}

        {/* Notes Side Panel */}
        <div className={`pdf-notes-panel ${showNotes ? 'open' : ''}`}>
          <div className="notes-panel-header">
            <div className="notes-panel-title"><StickyNote size={16} /> Notes</div>
            <button className="btn-icon" onClick={async () => {
              if (book) await updateBook({ ...book, notes: notesText });
              setNotesSaved(true);
              setShowNotes(false);
            }}>
              <CloseIcon size={18} />
            </button>
          </div>
          <textarea
            className="notes-panel-textarea"
            placeholder="Jot down your thoughts, quotes, or key ideas while reading..."
            value={notesText}
            onChange={e => { setNotesText(e.target.value); setNotesSaved(false); }}
            onBlur={async () => {
              if (book) await updateBook({ ...book, notes: notesText });
              setNotesSaved(true);
            }}
          />
          <div className="notes-panel-footer">
            <span className="notes-save-status">{notesSaved ? '✓ Saved' : 'Unsaved...'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfPageItem({ pageNum, renderPage, scale }) {
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.1 });

    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && canvasRef.current) {
      renderPage(pageNum, canvasRef.current, true);
    }
  }, [isVisible, pageNum, scale, renderPage]);

  return (
    <div className="pdf-page-item" data-page={pageNum}>
      <canvas ref={canvasRef} className="pdf-canvas"></canvas>
      <div className="page-number-hint">{pageNum}</div>
    </div>
  );
}


export default PdfViewer;
