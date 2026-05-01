import * as pdfjsLib from 'pdfjs-dist';

// Worker is already set up by thumbnail.js, but set it here too for safety
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Extract metadata (title, author, subject, etc.) from a PDF file handle.
 * Returns an object with { title, author, subject, pageCount } or defaults.
 */
export async function extractPdfMetadata(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const metadata = await pdf.getMetadata();
    const info = metadata?.info || {};

    // Clean and validate extracted fields
    const rawTitle = info.Title || '';
    const rawAuthor = info.Author || '';
    const subject = info.Subject || '';
    const pageCount = pdf.numPages || 0;

    pdf.destroy();

    return {
      title: cleanString(rawTitle),
      author: cleanString(rawAuthor),
      subject: cleanString(subject),
      pageCount,
    };
  } catch (err) {
    console.warn('Failed to extract PDF metadata:', err.message);
    return { title: '', author: '', subject: '', pageCount: 0 };
  }
}

/**
 * Clean a metadata string — trim, remove null chars, and validate it's meaningful.
 */
function cleanString(str) {
  if (!str || typeof str !== 'string') return '';
  
  // Remove null bytes, control chars, and excessive whitespace
  const cleaned = str
    .replace(/\0/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Skip if it looks like a file path, UUID, or garbage data
  if (cleaned.length > 200) return '';
  if (/^[0-9a-f-]{36}$/i.test(cleaned)) return ''; // UUID
  if (/^(\/|[A-Z]:\\)/.test(cleaned)) return '';     // File path
  if (/^Microsoft|^Adobe|^LaTeX/i.test(cleaned)) return ''; // Producer, not author

  return cleaned;
}
