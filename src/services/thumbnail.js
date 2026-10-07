import * as pdfjsLib from "pdfjs-dist";

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/**
 * Generate a thumbnail from a specific page of a PDF file handle.
 * Returns a base64 data URL string, or null on failure.
 */
export async function generateThumbnail(fileHandle, maxWidth = 600, pageNum = 1) {
  let pdf = null;
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const targetPage = Math.min(Math.max(1, pageNum), pdf.numPages);
    const page = await pdf.getPage(targetPage);

    // Scale to fit maxWidth
    const originalViewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / originalViewport.width;
    const viewport = page.getViewport({ scale });

    // Render to offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert to data URL (JPEG 0.85 for sharp visuals with low footprint)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl;
  } catch (err) {
    console.warn("Failed to generate thumbnail:", err.message);
    return null;
  } finally {
    if (pdf) {
      try {
        pdf.destroy();
      } catch {}
    }
  }
}

/**
 * Extract small preview thumbnails for multiple initial pages of a PDF.
 * Useful for allowing the user to select which page to use as cover.
 */
export async function getPdfPagePreviews(fileHandle, maxPages = 8) {
  let pdf = null;
  const results = [];
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const count = Math.min(pdf.numPages, maxPages);

    for (let pageNum = 1; pageNum <= count; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const originalViewport = page.getViewport({ scale: 1 });
        const scale = 180 / originalViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        results.push({
          pageNum,
          dataUrl: canvas.toDataURL("image/jpeg", 0.8),
        });
      } catch (e) {
        console.warn(`Failed preview for page ${pageNum}:`, e);
      }
    }
    return { totalPages: pdf.numPages, previews: results };
  } catch (err) {
    console.warn("Failed to generate page previews:", err);
    return { totalPages: 0, previews: [] };
  } finally {
    if (pdf) {
      try {
        pdf.destroy();
      } catch {}
    }
  }
}

