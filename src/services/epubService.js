import ePub from 'epubjs';

/**
 * Extract metadata from an EPUB file handle.
 */
export async function extractEpubMetadata(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    const metadata = await book.loaded.metadata;
    
    return {
      title: metadata.title || '',
      author: metadata.creator || '',
      subject: metadata.subject || '',
      pageCount: 0, // EPUBs are reflowable, so "pages" are dynamic
    };
  } catch (err) {
    console.warn('Failed to extract EPUB metadata:', err.message);
    return { title: '', author: '', subject: '', pageCount: 0 };
  }
}

/**
 * Generate a thumbnail (cover) from an EPUB file handle.
 */
export async function generateEpubThumbnail(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    const coverUrl = await book.coverUrl();
    
    if (!coverUrl) return null;

    // Convert to data URL for easier storage in IndexedDB
    const response = await fetch(coverUrl);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Failed to generate EPUB thumbnail:', err.message);
    return null;
  }
}
