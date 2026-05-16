import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, BookOpen, Layout, Scroll, Sun, Moon, Coffee, Timer, StickyNote, X as CloseIcon, Search, Menu } from 'lucide-react';
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
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDimensions, setPageDimensions] = useState({ width: 600, height: 800 });
  const [scale, setScale] = useState(window.innerWidth < 768 ? 0.8 : 1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('single'); // 'single' or 'vertical'
  const [readerTheme, setReaderTheme] = useState('light'); // 'light', 'sepia', 'night'
  const [pageInput, setPageInput] = useState('1');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [outline, setOutline] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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
          
          const outlineData = await pdf.getOutline();
          setOutline(outlineData || []);
          
          // Get first page dimensions for placeholders
          const firstPage = await pdf.getPage(1);
          const vp = firstPage.getViewport({ scale: 1 });
          setPageDimensions({ width: vp.width, height: vp.height });
          
          // Restore last read page
          const savedPage = book.progress > 0 
            ? Math.max(1, Math.round((book.progress / 100) * pdf.numPages))
            : 1;
          setCurrentPage(savedPage);
          setPageInput(savedPage.toString());
          lastLoggedPage.current = savedPage;
          setLoading(false);
          
          // Get Outline (TOC)
          try {
            const pdfOutline = await pdf.getOutline();
            setOutline(pdfOutline || []);
          } catch (e) {
            console.warn('Could not fetch PDF outline');
          }

          // Auto-fit to width on mobile
          if (window.innerWidth < 768) {
            setTimeout(fitToWidth, 300);
          }
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
  const renderPage = useCallback(async (pageNum, canvas, isList = false, textLayerDiv = null) => {
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

      // Render text layer
      if (textLayerDiv) {
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.left = canvas.offsetLeft + 'px';
        textLayerDiv.style.top = canvas.offsetTop + 'px';
        
        const textContent = await page.getTextContent();
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: viewport,
        });
        await textLayer.render();
      }
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (viewMode === 'single' && !loading && pdfDoc) {
      renderPage(currentPage, canvasRef.current, false, textLayerRef.current);
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

  const isJumping = useRef(false);
  const jumpTimeout = useRef(null);

  const jumpToPage = useCallback((pageNum, behavior = 'smooth') => {
    const validPage = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(validPage);
    setPageInput(validPage.toString());
    
    if (viewMode === 'vertical' && containerRef.current) {
      const target = containerRef.current.querySelector(`.pdf-page-item[data-page="${validPage}"]`);
      if (target) {
        isJumping.current = true;
        if (jumpTimeout.current) clearTimeout(jumpTimeout.current);
        
        target.scrollIntoView({ behavior, block: 'start' });
        
        // Resume observer after scroll finishes
        jumpTimeout.current = setTimeout(() => {
          isJumping.current = false;
        }, behavior === 'smooth' ? 800 : 50);
      }
    }
  }, [totalPages, viewMode]);

  // Scroll to current page when switching to vertical mode
  useEffect(() => {
    if (viewMode === 'vertical' && pdfDoc) {
      // Use instant scroll on mode switch to avoid "starting at 3" bug
      setTimeout(() => jumpToPage(currentPage, 'auto'), 50);
    }
  }, [viewMode, pdfDoc]);

  const handleCanvasClick = (e) => {
    if (viewMode !== 'single') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    if (ratio < 0.3) goToPrev();
    else if (ratio > 0.7) goToNext();
  };

  const goToPrev = useCallback(() => {
    const prev = Math.max(1, currentPage - 1);
    if (prev !== currentPage) jumpToPage(prev);
  }, [currentPage, jumpToPage]);

  const goToNext = useCallback(() => {
    const next = Math.min(totalPages, currentPage + 1);
    if (next !== currentPage) jumpToPage(next);
  }, [currentPage, totalPages, jumpToPage]);

  const zoomIn = useCallback(() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1))), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1))), []);
  
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query || query.length < 3 || !pdfDoc) {
      setSearchResults([]);
      return;
    }
    
    // Use a small delay to prevent UI freezing on every keystroke
    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(async () => {
      const results = [];
      const limit = Math.min(totalPages, 150); // Search up to 150 pages
      for (let i = 1; i <= limit; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push({ 
            page: i, 
            snippet: text.toLowerCase().split(query.toLowerCase())[0].slice(-30) + 
                     query + 
                     text.toLowerCase().split(query.toLowerCase())[1].slice(0, 30)
          });
          if (results.length > 15) break; 
        }
      }
      setSearchResults(results);
    }, 400);
  };


  const fitToWidth = useCallback(async () => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const vp = page.getViewport({ scale: 1 });
      const container = document.querySelector('.pdf-content-area');
      if (container) {
        // Use a smaller padding on mobile to truly fill the screen
        const padding = window.innerWidth < 768 ? 4 : 40;
        const containerWidth = container.clientWidth - padding;
        const newScale = containerWidth / vp.width;
        setScale(+newScale.toFixed(2));
      }
    } catch (err) {
      console.warn('Fit to width failed:', err);
    }
  }, [pdfDoc, currentPage]);

  const resetZoom = useCallback(() => setScale(1.2), []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };


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
            goToPrev();
            break;
          }
          case 'ArrowRight': {
            e.preventDefault();
            goToNext();
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
  }, [goToPrev, goToNext, navigate, viewMode, zoomIn, zoomOut]);

  // Vertical Scroll Observer
  useEffect(() => {
    if (viewMode !== 'vertical' || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isJumping.current) return;
        
        // Find the entry that is most visible
        const visibleEntry = entries.find(entry => entry.isIntersecting && entry.intersectionRatio > 0.5);
        
        if (visibleEntry) {
          const pageNum = parseInt(visibleEntry.target.getAttribute('data-page'));
          if (pageNum && pageNum !== currentPage) {
            setCurrentPage(pageNum);
            setPageInput(pageNum.toString());
          }
        }
      },
      { threshold: [0.5, 0.7, 0.9] }
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
      <div className="reader-main-toolbar">
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
              onChange={e => setPageInput(e.target.value)}
              onBlur={() => {
                const val = parseInt(pageInput);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  jumpToPage(val);
                } else {
                  setPageInput(currentPage.toString());
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
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
          <button className="btn btn-icon" onClick={goToNext} disabled={currentPage >= totalPages} title="Next page (→)"><ChevronRight size={20} /></button>
        </div>

        <div className="pdf-toolbar-right">
          <div className="toolbar-group">
            <button className={`btn btn-icon ${showTOC ? 'active' : ''}`} onClick={() => { setShowTOC(!showTOC); setShowSearch(false); setShowNotes(false); }} title="Table of Contents"><Menu size={18} /></button>
            <button className={`btn btn-icon ${showSearch ? 'active' : ''}`} onClick={() => { setShowSearch(!showSearch); setShowTOC(false); setShowNotes(false); }} title="Search"><Search size={18} /></button>
          </div>
          <div className="toolbar-divider"></div>
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
          <span className="zoom-label" onClick={fitToWidth} style={{ cursor: 'pointer' }} title="Fit to width">
            {Math.round(scale * 100)}%
          </span>
          <button className="btn btn-icon" onClick={zoomIn} title="Zoom in (+)"><ZoomIn size={16} /></button>
          <button className="btn btn-icon" onClick={fitToWidth} title="Fit to Width"><Maximize size={16} /></button>
          <div className="toolbar-divider"></div>
          <button
            className={`btn btn-icon ${showNotes ? 'active' : ''}`}
            onClick={() => {
              setShowNotes(!showNotes);
              setShowTOC(false);
              setShowSearch(false);
            }}
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
        {/* Side Panels */}
        <div className={`pdf-side-panel toc-panel ${showTOC ? 'open' : ''}`}>
          <div className="panel-header">
            <h3>Table of Contents</h3>
            <button className="btn-icon" onClick={() => setShowTOC(false)}><CloseIcon size={18} /></button>
          </div>
          <div className="panel-content">
            {outline.length > 0 ? (
              <ul className="toc-list">
                {outline.map((item, i) => (
                  <li key={i} onClick={async () => {
                    if (item.dest) {
                      const pageIndex = await pdfDoc.getPageIndex(item.dest[0]);
                      jumpToPage(pageIndex + 1);
                      setShowTOC(false);
                    }
                  }}>
                    {item.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-msg">No bookmarks found.</p>
            )}
          </div>
        </div>

        <div className={`pdf-side-panel search-panel ${showSearch ? 'open' : ''}`}>
          <div className="panel-header">
            <h3>Search</h3>
            <button className="btn-icon" onClick={() => setShowSearch(false)}><CloseIcon size={18} /></button>
          </div>
          <div className="panel-content">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Find in document..." 
                value={searchQuery}
                onChange={handleSearch}
                autoFocus
              />
            </div>
            <div className="search-results">
              {searchResults.map((res, i) => (
                <div key={i} className="search-result-item" onClick={() => { jumpToPage(res.page); setShowSearch(false); }}>
                  <div className="res-page">Page {res.page}</div>
                  <div className="res-snippet">...{res.snippet}...</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`pdf-side-panel notes-panel ${showNotes ? 'open' : ''}`}>
          <div className="panel-header">
            <h3><StickyNote size={16} /> Notes</h3>
            <button className="btn-icon" onClick={async () => {
              if (book) await updateBook({ ...book, notes: notesText });
              setNotesSaved(true);
              setShowNotes(false);
            }}>
              <CloseIcon size={18} />
            </button>
          </div>
          <div className="panel-content">
            <textarea
              className="notes-panel-textarea"
              placeholder="Jot down your thoughts..."
              value={notesText}
              onChange={e => { setNotesText(e.target.value); setNotesSaved(false); }}
              onBlur={async () => {
                if (book) await updateBook({ ...book, notes: notesText });
                setNotesSaved(true);
              }}
            />
          </div>
          <div className="panel-footer">
            <span className="notes-save-status">{notesSaved ? '✓ Saved' : 'Unsaved...'}</span>
          </div>
        </div>

        {viewMode === 'single' ? (
          <div className="pdf-canvas-wrapper single-view" onClick={handleCanvasClick}>
            <div className="pdf-page-container">
              <canvas ref={canvasRef} className="pdf-canvas"></canvas>
              <div ref={textLayerRef} className="text-layer"></div>
            </div>
          </div>
        ) : (
          <div className="pdf-vertical-container" ref={containerRef}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <PdfPageItem 
                key={pageNum} 
                pageNum={pageNum} 
                renderPage={renderPage} 
                scale={scale} 
                dimensions={pageDimensions}
              />
            ))}
          </div>
        )}


      </div>
    </div>
  );
}

function PdfPageItem({ pageNum, renderPage, scale, dimensions }) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  // Calculate placeholder height based on scale and original dimensions
  const placeholderHeight = dimensions ? dimensions.height * scale : 800;
  const placeholderWidth = dimensions ? dimensions.width * scale : 600;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.05 });

    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && canvasRef.current) {
      renderPage(pageNum, canvasRef.current, true, textLayerRef.current);
    }
  }, [isVisible, pageNum, scale, renderPage]);

  return (
    <div 
      className="pdf-page-item" 
      data-page={pageNum}
      style={{ 
        minHeight: `${placeholderHeight}px`,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      <div className="pdf-page-container" style={{ position: 'relative' }}>
        <canvas 
          ref={canvasRef} 
          className="pdf-canvas"
          style={{ 
            width: isVisible ? undefined : `${placeholderWidth}px`,
            height: isVisible ? undefined : `${placeholderHeight}px`,
            visibility: isVisible ? 'visible' : 'hidden'
          }}
        ></canvas>
        <div ref={textLayerRef} className="text-layer"></div>
      </div>
      <div className="page-number-hint">{pageNum}</div>
    </div>
  );
}


export default PdfViewer;
