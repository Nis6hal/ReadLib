import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Generate a thumbnail from the first page of a PDF file handle.
 * Returns a base64 data URL string, or null on failure.
 */
export async function generateThumbnail(fileHandle, maxWidth = 200) {
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    // Scale to fit maxWidth
    const originalViewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / originalViewport.width;
    const viewport = page.getViewport({ scale });

    // Render to offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert to data URL (JPEG for smaller size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    // Cleanup
    pdf.destroy();
    
    return dataUrl;
  } catch (err) {
    console.warn('Failed to generate thumbnail:', err.message);
    return null;
  }
}
