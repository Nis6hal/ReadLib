import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, BookOpen } from 'lucide-react';
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
  const { books, updateBook } = useLibrary();
  const canvasRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const renderingRef = useRef(false);
  const bookRef = useRef(null);

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
          
          // Restore last read page
          const savedPage = book.progress > 0 
            ? Math.max(1, Math.round((book.progress / 100) * pdf.numPages))
            : 1;
          setCurrentPage(savedPage);
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
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) return;

    renderingRef.current = true;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Use device pixel ratio for sharp rendering
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
    } finally {
      renderingRef.current = false;
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Save progress when page changes
  useEffect(() => {
    if (bookRef.current && totalPages > 0 && pdfDoc) {
      const progress = Math.round((currentPage / totalPages) * 100);
      const updatedBook = {
        ...bookRef.current,
        progress,
        lastRead: new Date().toISOString(),
        category: bookRef.current.category === 'Planned' ? 'Reading' : bookRef.current.category,
      };
      // Mark as completed if on last page
      if (currentPage === totalPages) {
        updatedBook.progress = 100;
        updatedBook.category = 'Completed';
      }
      updateBook(updatedBook);
    }
  }, [currentPage, totalPages]);

  const goToPrev = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const goToNext = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), [totalPages]);
  const zoomIn = () => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)));
  const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)));
  const resetZoom = () => setScale(1.2);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      }
      if (e.key === 'Escape') {
        navigate(-1);
      }
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToPrev, goToNext, navigate]);

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

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className="pdf-viewer-container">
      {/* Top toolbar */}
      <div className="pdf-toolbar glass-panel">
        <button className="btn btn-icon" onClick={() => navigate(-1)} title="Go back (Esc)">
          <ArrowLeft size={20} />
        </button>
        <span className="pdf-title">{book?.title || 'PDF Viewer'}</span>
        
        <div className="pdf-toolbar-center">
          <button className="btn btn-icon" onClick={goToPrev} disabled={currentPage <= 1} title="Previous page (←)">
            <ChevronLeft size={20} />
          </button>
          <span className="pdf-page-info">
            <input 
              type="number" 
              className="pdf-page-input" 
              value={currentPage}
              min={1}
              max={totalPages}
              onChange={e => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) setCurrentPage(val);
              }}
              id="pdf-page-number"
            />
            <span className="pdf-page-total">/ {totalPages}</span>
          </span>
          <button className="btn btn-icon" onClick={goToNext} disabled={currentPage >= totalPages} title="Next page (→)">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="pdf-toolbar-right">
          <button className="btn btn-icon" onClick={zoomOut} title="Zoom out (-)"><ZoomOut size={16} /></button>
          <span className="zoom-label">{Math.round(scale * 100)}%</span>
          <button className="btn btn-icon" onClick={zoomIn} title="Zoom in (+)"><ZoomIn size={16} /></button>
          <button className="btn btn-icon" onClick={resetZoom} title="Reset zoom"><Maximize size={16} /></button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="pdf-progress-bar">
        <div className="pdf-progress-fill" style={{ width: `${progressPercent}%` }}></div>
      </div>

      {/* Canvas area */}
      <div className="pdf-canvas-wrapper">
        <canvas ref={canvasRef} className="pdf-canvas"></canvas>
      </div>
    </div>
  );
}

export default PdfViewer;
