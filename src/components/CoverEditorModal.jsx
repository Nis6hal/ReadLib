import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Upload,
  BookOpen,
  Globe,
  Check,
  RefreshCw,
  Sliders,
  Maximize2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { getPdfPagePreviews, generateThumbnail } from "../services/thumbnail";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "./Toast";
import "./CoverEditorModal.css";

const ASPECT_RATIOS = [
  { label: "Book (2:3)", value: 2 / 3, width: 280, height: 420 },
  { label: "Classic (3:4)", value: 3 / 4, width: 300, height: 400 },
  { label: "Square (1:1)", value: 1, width: 320, height: 320 },
  { label: "Original", value: "original", width: 280, height: 420 },
];

export default function CoverEditorModal({ book, onClose, onSave }) {
  const { fetchBookMetadata, regenerateCoverFromFile } = useLibrary();
  const { addToast } = useToast();

  const isPdf = !book.id.toLowerCase().endsWith(".epub");

  // Active image being edited/cropped
  const [activeImage, setActiveImage] = useState(book.cover || "");
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS[0]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Source selection tabs: 'crop', 'pages', 'online', 'upload'
  const [activeTab, setActiveTab] = useState("crop");

  // Page previews for PDF
  const [pagePreviews, setPagePreviews] = useState([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [customPage, setCustomPage] = useState("");
  const [loadingCustomPage, setLoadingCustomPage] = useState(false);

  // Online covers
  const [onlineCover, setOnlineCover] = useState(book.googleCover || null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Upload ref
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const cropBoxRef = useRef(null);

  // Load PDF page previews when switching to 'pages' tab
  useEffect(() => {
    if (activeTab === "pages" && isPdf && book.fileHandle && pagePreviews.length === 0) {
      setLoadingPreviews(true);
      getPdfPagePreviews(book.fileHandle, 10)
        .then((res) => {
          setPagePreviews(res.previews || []);
        })
        .catch((err) => {
          console.warn("Failed to load page previews", err);
        })
        .finally(() => {
          setLoadingPreviews(false);
        });
    }
  }, [activeTab, isPdf, book.fileHandle, pagePreviews.length]);

  // Handle Drag / Pan in Cropper
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  // Touch support for drag
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom with scroll wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3, Math.max(0.6, +(prev + delta).toFixed(2))));
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Switch to another image source
  const handleSelectNewImage = (newImgSrc) => {
    setActiveImage(newImgSrc);
    handleReset();
    setActiveTab("crop");
    addToast("Image loaded into cropper! ✂️", "info");
  };

  // Load custom page from PDF
  const handleLoadCustomPage = async () => {
    const pageNum = parseInt(customPage, 10);
    if (!pageNum || pageNum < 1 || !book.fileHandle) {
      addToast("Enter a valid page number", "warning");
      return;
    }
    setLoadingCustomPage(true);
    try {
      const cover = await generateThumbnail(book.fileHandle, 800, pageNum);
      if (cover) {
        handleSelectNewImage(cover);
      } else {
        addToast(`Could not load page ${pageNum}`, "error");
      }
    } catch (e) {
      addToast(`Failed to load page ${pageNum}`, "error");
    } finally {
      setLoadingCustomPage(false);
    }
  };

  // Search online Google covers
  const handleSearchOnline = async () => {
    setIsSearchingOnline(true);
    try {
      const meta = await fetchBookMetadata(book.title, book.author);
      if (meta?.cover) {
        setOnlineCover(meta.cover);
        addToast("Online cover found! 🌐", "success");
      } else {
        addToast("No online covers found for this title", "info");
      }
    } catch (e) {
      addToast("Online search failed", "error");
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Upload local file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleSelectNewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Reset to default scanned cover from file
  const handleUseScannedDefault = async () => {
    try {
      const scanned = await regenerateCoverFromFile(book, 1);
      if (scanned) {
        handleSelectNewImage(scanned);
        addToast("Restored original scanned cover! 📄", "success");
      }
    } catch {
      addToast("Failed to re-extract cover from file", "error");
    }
  };

  // Generate cropped image using Canvas
  const handleApplyCroppedCover = () => {
    if (!activeImage) return;

    const img = imageRef.current;
    const box = cropBoxRef.current;
    if (!img || !box) {
      onSave(activeImage);
      return;
    }

    const boxRect = box.getBoundingClientRect();
    const targetW = 600;
    const targetH = Math.round(targetW / (boxRect.width / boxRect.height));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);

    // Save context state for rotation & translations
    ctx.save();

    // Map screen crop-box coordinates to target output canvas
    const scaleFactor = targetW / boxRect.width;

    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate image render dimensions scaled to crop-box
    const naturalW = img.naturalWidth || 600;
    const naturalH = img.naturalHeight || 800;
    const imgAspect = naturalW / naturalH;
    const boxAspect = boxRect.width / boxRect.height;

    let baseW, baseH;
    if (imgAspect > boxAspect) {
      baseH = boxRect.height;
      baseW = baseH * imgAspect;
    } else {
      baseW = boxRect.width;
      baseH = baseW / imgAspect;
    }

    const drawW = baseW * zoom * scaleFactor;
    const drawH = baseH * zoom * scaleFactor;

    // Account for pan offset
    const drawX = -drawW / 2 + pan.x * scaleFactor;
    const drawY = -drawH / 2 + pan.y * scaleFactor;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onSave(croppedDataUrl);
    onClose();
  };

  // Use full active image directly without cropping
  const handleUseDirectly = () => {
    if (!activeImage) return;
    onSave(activeImage);
    onClose();
  };

  return createPortal(
    <div className="cover-editor-backdrop" onClick={onClose}>
      <div
        className="cover-editor-modal card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="cover-editor-header">
          <div className="cover-editor-title">
            <Crop size={20} className="text-primary" />
            <div>
              <h3>Cover Page Studio</h3>
              <p className="subtitle">Edit, crop, or choose a cover for "{book.title}"</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="cover-editor-tabs">
          <button
            className={`tab-btn ${activeTab === "crop" ? "active" : ""}`}
            onClick={() => setActiveTab("crop")}
          >
            <Crop size={15} /> Crop & Adjust
          </button>

          {isPdf && (
            <button
              className={`tab-btn ${activeTab === "pages" ? "active" : ""}`}
              onClick={() => setActiveTab("pages")}
            >
              <BookOpen size={15} /> Pick PDF Page
            </button>
          )}

          <button
            className={`tab-btn ${activeTab === "online" ? "active" : ""}`}
            onClick={() => setActiveTab("online")}
          >
            <Globe size={15} /> Online Covers
          </button>

          <button
            className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => setActiveTab("upload")}
          >
            <Upload size={15} /> Upload File
          </button>
        </div>

        {/* Modal Body */}
        <div className="cover-editor-body">
          {activeTab === "crop" && (
            <div className="crop-workspace">
              {/* Cropper Viewport */}
              <div
                className="crop-viewport"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                <div
                  ref={cropBoxRef}
                  className="crop-box"
                  style={{
                    width: `${aspectRatio.width}px`,
                    height: `${aspectRatio.height}px`,
                  }}
                >
                  {activeImage ? (
                    <img
                      ref={imageRef}
                      src={activeImage}
                      alt="Crop target"
                      className="crop-image"
                      draggable={false}
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                      }}
                    />
                  ) : (
                    <div className="crop-empty-state">No image selected</div>
                  )}
                  <div className="crop-grid">
                    <div className="grid-line horizontal h1"></div>
                    <div className="grid-line horizontal h2"></div>
                    <div className="grid-line vertical v1"></div>
                    <div className="grid-line vertical v2"></div>
                  </div>
                </div>
                <div className="crop-hint">Click & drag to position • Scroll to zoom</div>
              </div>

              {/* Cropper Toolbar */}
              <div className="crop-controls">
                {/* Aspect Ratio Presets */}
                <div className="control-group">
                  <span className="control-label">Aspect Ratio:</span>
                  <div className="btn-group">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.label}
                        className={`btn btn-sm ${aspectRatio.label === ratio.label ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => {
                          setAspectRatio(ratio);
                          handleReset();
                        }}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom & Rotation */}
                <div className="control-group">
                  <span className="control-label">Zoom ({Math.round(zoom * 100)}%):</span>
                  <div className="zoom-slider-wrap">
                    <ZoomOut size={16} onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))} />
                    <input
                      type="range"
                      min="0.6"
                      max="3"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="zoom-slider"
                    />
                    <ZoomIn size={16} onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))} />
                  </div>

                  <button className="btn btn-secondary btn-sm" onClick={handleRotate} title="Rotate 90 degrees">
                    <RotateCw size={15} /> Rotate
                  </button>

                  <button className="btn btn-secondary btn-sm" onClick={handleReset} title="Reset pan & zoom">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: PDF Pages Picker */}
          {activeTab === "pages" && (
            <div className="sources-workspace">
              <div className="sources-header">
                <h4>Select a page from your PDF to use as the cover:</h4>
                <p className="subtitle">
                  Many books have blank or title pages before the illustrated cover. Pick any page below:
                </p>
              </div>

              {loadingPreviews ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Rendering page previews from document...</p>
                </div>
              ) : (
                <div className="pdf-pages-grid">
                  {pagePreviews.map((p) => (
                    <div
                      key={p.pageNum}
                      className="pdf-page-card"
                      onClick={() => handleSelectNewImage(p.dataUrl)}
                    >
                      <div className="page-thumbnail-wrap">
                        <img src={p.dataUrl} alt={`Page ${p.pageNum}`} />
                        <span className="page-badge">Page {p.pageNum}</span>
                      </div>
                      <button className="btn btn-primary btn-sm btn-full">
                        <Crop size={13} /> Select & Crop
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Jump to specific page input */}
              <div className="custom-page-bar">
                <span>Want a specific page?</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Page #"
                  value={customPage}
                  onChange={(e) => setCustomPage(e.target.value)}
                  className="page-input"
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleLoadCustomPage}
                  disabled={loadingCustomPage}
                >
                  {loadingCustomPage ? "Loading..." : "Load Page"}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Online Google Cover */}
          {activeTab === "online" && (
            <div className="sources-workspace">
              <div className="sources-header">
                <h4>Online Book Covers</h4>
                <p className="subtitle">Search Google Books for high-resolution artwork for "{book.title}":</p>
              </div>

              <div className="online-cover-card-container">
                {onlineCover ? (
                  <div className="online-cover-preview">
                    <img src={onlineCover} alt="Online Cover" className="online-cover-img" />
                    <div className="online-cover-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSelectNewImage(onlineCover)}
                      >
                        <Crop size={16} /> Load into Cropper
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          onSave(onlineCover);
                          onClose();
                        }}
                      >
                        <Check size={16} /> Use As-Is (No Crop)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="no-online-cover">
                    <Globe size={42} className="text-muted" />
                    <p>No online cover cached yet.</p>
                    <button
                      className="btn btn-primary"
                      onClick={handleSearchOnline}
                      disabled={isSearchingOnline}
                    >
                      <RefreshCw size={16} className={isSearchingOnline ? "spinning" : ""} />
                      {isSearchingOnline ? "Searching..." : "Search Google Books for Covers"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Upload Custom File */}
          {activeTab === "upload" && (
            <div className="sources-workspace">
              <div className="sources-header">
                <h4>Upload Custom Cover Image</h4>
                <p className="subtitle">Choose any image (JPG, PNG, WebP) from your computer:</p>
              </div>

              <div
                className="dropzone-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={36} className="text-primary mb-2" />
                <p>Click to browse or drop an image file here</p>
                <span className="dropzone-sub">Supports JPG, PNG, WEBP, AVIF</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
              </div>

              {book.fileHandle && (
                <div className="restore-default-section">
                  <p>Or revert back to the document's original first page:</p>
                  <button className="btn btn-secondary btn-sm" onClick={handleUseScannedDefault}>
                    <BookOpen size={14} /> Restore Default Scanned Cover
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cover-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <div className="footer-right">
            <button className="btn btn-secondary" onClick={handleUseDirectly} title="Apply image without cropping">
              Use Full Image (No Crop)
            </button>
            <button className="btn btn-primary" onClick={handleApplyCroppedCover}>
              <Check size={16} /> Crop & Save Cover
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
