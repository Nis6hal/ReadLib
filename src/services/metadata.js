import * as pdfjsLib from "pdfjs-dist";

// Worker is already set up by thumbnail.js, but set it here too for safety
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
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
    const rawTitle = info.Title || "";
    const rawAuthor = info.Author || "";
    const subject = info.Subject || "";
    const pageCount = pdf.numPages || 0;

    pdf.destroy();

    let title = cleanString(rawTitle);
    let author = cleanString(rawAuthor);

    if (!author && title.includes(" - ")) {
      const parts = title.split(" - ");
      if (parts.length >= 2) {
        // Assume first part is Title, second is Author (most common).
        // If it's the other way around, user can edit it.
        title = parts.slice(0, -1).join(" - ").trim();
        author = parts[parts.length - 1].trim();
      }
    }

    return {
      title,
      author,
      subject: cleanString(subject),
      pageCount,
    };
  } catch (err) {
    console.warn("Failed to extract PDF metadata:", err.message);
    return { title: "", author: "", subject: "", pageCount: 0 };
  }
}

/**
 * Clean a metadata string — trim, remove null chars, and validate it's meaningful.
 */
function cleanString(str) {
  if (!str || typeof str !== "string") return "";

  // Remove null bytes, control chars, and excessive whitespace
  const cleaned = Array.from(str)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  // Skip if it looks like a file path, UUID, or garbage data
  if (cleaned.length > 200) return "";
  if (/^[0-9a-f-]{36}$/i.test(cleaned)) return ""; // UUID
  if (/^(\/|[A-Z]:\\)/.test(cleaned)) return ""; // File path
  if (/^Microsoft|^Adobe|^LaTeX/i.test(cleaned)) return ""; // Producer, not author

  return cleaned;
}
