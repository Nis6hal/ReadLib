import { useParams } from "react-router-dom";
import PdfViewer from "./PdfViewer";
import EpubViewer from "./EpubViewer";
import { useLibrary } from "../context/LibraryContext";

/**
 * Universal Reader component that chooses the appropriate viewer
 * based on the file extension.
 */
function Reader() {
  const { id } = useParams();
  const { findBookById } = useLibrary();

  const book = findBookById(id);

  if (!book) {
    return <div className="p-10 text-center">Book not found in library.</div>;
  }

  const isEpub = book.id.toLowerCase().endsWith(".epub");

  if (isEpub) {
    return <EpubViewer />;
  }

  return <PdfViewer />;
}

export default Reader;
