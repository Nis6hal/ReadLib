import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Book, Sparkles, BookOpen, ExternalLink, Globe, Calendar, FileText } from "lucide-react";
import { useLibrary } from "../context/LibraryContext";
import { useNavigate } from "react-router-dom";
import "./AuthorDetailModal.css";

function AuthorDetailModal({ authorName, onClose }) {
  const { books } = useLibrary();
  const navigate = useNavigate();
  const [onlineBooks, setOnlineBooks] = useState([]);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const [activeTab, setActiveTab] = useState("library");
  const [authorBio, setAuthorBio] = useState("");
  const [authorPhoto, setAuthorPhoto] = useState(null);
  const [authorDetails, setAuthorDetails] = useState(null);

  // Match books where the author field contains this author name (handles multi-author)
  const localBooks = books.filter(
    (b) =>
      b.author &&
      b.author
        .toLowerCase()
        .split(/,\s*|;\s*|\s+and\s+/)
        .some((a) => a.trim() === authorName.toLowerCase())
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchAuthorBio() {
      try {
        // Try Open Library Authors API for real bio
        const searchRes = await fetch(
          `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}&limit=3`
        );
        const searchData = await searchRes.json();

        if (cancelled) return;

        if (searchData.docs && searchData.docs.length > 0) {
          // Find the best match
          const match =
            searchData.docs.find(
              (d) => d.name?.toLowerCase() === authorName.toLowerCase()
            ) || searchData.docs[0];

          const authorKey = match.key;

          // Fetch full author record
          const authorRes = await fetch(
            `https://openlibrary.org/authors/${authorKey}.json`
          );
          const authorData = await authorRes.json();

          if (cancelled) return;

          // Extract bio
          let bio = "";
          if (authorData.bio) {
            bio =
              typeof authorData.bio === "string"
                ? authorData.bio
                : authorData.bio.value || "";
          }

          // Clean up markdown links from Open Library bio
          bio = bio.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[\r\n]+/g, " ");

          // Extract details
          const details = {};
          if (authorData.birth_date) details.born = authorData.birth_date;
          if (authorData.death_date) details.died = authorData.death_date;
          if (match.top_work) details.topWork = match.top_work;
          if (match.work_count) details.totalWorks = match.work_count;

          // Author photo
          if (authorData.photos && authorData.photos.length > 0) {
            const photoId = authorData.photos[0];
            setAuthorPhoto(
              `https://covers.openlibrary.org/a/id/${photoId}-M.jpg`
            );
          }

          if (bio) {
            setAuthorBio(bio.length > 600 ? bio.slice(0, 600) + "…" : bio);
          } else {
            setAuthorBio("");
          }
          setAuthorDetails(Object.keys(details).length > 0 ? details : null);
        }
      } catch (err) {
        console.warn("Failed to fetch author bio", err);
      }
    }

    async function fetchOnlineBooks() {
      try {
        setLoadingOnline(true);
        const query = encodeURIComponent(`inauthor:"${authorName}"`);
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=8&orderBy=relevance`
        );
        const data = await response.json();

        if (cancelled) return;

        if (data.items && data.items.length > 0) {
          const fetchedBooks = data.items.map((item) => {
            const info = item.volumeInfo;
            return {
              id: item.id,
              title: info.title,
              authors: info.authors || [authorName],
              cover:
                info.imageLinks?.thumbnail ||
                info.imageLinks?.smallThumbnail ||
                null,
              publishedDate: info.publishedDate || "Unknown",
              pageCount: info.pageCount || 0,
              description: info.description || "",
              infoLink: info.infoLink || "#",
              categories: info.categories || [],
            };
          });
          setOnlineBooks(fetchedBooks);
        }
      } catch (err) {
        console.warn("Failed to fetch author details online", err);
      } finally {
        if (!cancelled) setLoadingOnline(false);
      }
    }

    if (authorName) {
      fetchAuthorBio();
      fetchOnlineBooks();
    }

    return () => {
      cancelled = true;
    };
  }, [authorName]);

  const handleReadLocalBook = (bookId) => {
    onClose();
    navigate(`/read/${encodeURIComponent(bookId)}`);
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    authorName
  )}&background=8b5cf6&color=fff&size=128&font-size=0.33`;

  const hasBio = authorBio && authorBio.length > 0;
  const hasDetails = authorDetails && Object.keys(authorDetails).length > 0;
  const showInsights = hasBio || hasDetails;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content author-detail-modal card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn btn-icon" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="author-header">
          <div className="author-profile-info">
            <img
              src={authorPhoto || fallbackAvatar}
              alt={authorName}
              className="author-modal-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackAvatar;
              }}
            />
            <div className="author-name-wrap">
              <span className="author-tag">Featured Author</span>
              <h2>{authorName}</h2>
              <div className="author-meta-chips">
                <span className="author-stats-summary">
                  📚 {localBooks.length} book{localBooks.length !== 1 ? "s" : ""} in
                  library
                </span>
                {authorDetails?.born && (
                  <span className="author-chip">
                    <Calendar size={12} /> Born: {authorDetails.born}
                  </span>
                )}
                {authorDetails?.died && (
                  <span className="author-chip">† {authorDetails.died}</span>
                )}
                {authorDetails?.totalWorks && (
                  <span className="author-chip">
                    <FileText size={12} /> {authorDetails.totalWorks} published works
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {showInsights && (
          <div className="author-bio-section glass-panel">
            <h4 className="bio-heading">
              <Sparkles size={14} /> Author Insights
            </h4>
            {hasBio && <p className="bio-text">{authorBio}</p>}
            {hasDetails?.topWork && !hasBio && (
              <p className="bio-text">
                Best known for <em>"{authorDetails.topWork}"</em>.
              </p>
            )}
          </div>
        )}

        <div className="author-tabs">
          <button
            className={`author-tab ${activeTab === "library" ? "active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            <Book size={14} /> In Your Library ({localBooks.length})
          </button>
          <button
            className={`author-tab ${activeTab === "online" ? "active" : ""}`}
            onClick={() => setActiveTab("online")}
          >
            <Globe size={14} /> Other Books Online
          </button>
        </div>

        <div className="author-tab-content">
          {activeTab === "library" && (
            <div className="author-books-list">
              {localBooks.length > 0 ? (
                <div className="author-books-grid">
                  {localBooks.map((book) => (
                    <div
                      key={book.id}
                      className="author-book-item card"
                      onClick={() => handleReadLocalBook(book.id)}
                    >
                      <div className="author-book-cover-wrap">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="author-book-cover"
                          />
                        ) : (
                          <div className="author-book-placeholder">
                            <BookOpen size={24} />
                          </div>
                        )}
                        <div className="read-overlay">
                          <span>Read Now</span>
                        </div>
                      </div>
                      <div className="author-book-info">
                        <h4>{book.title}</h4>
                        <span
                          className={`badge badge-${book.category.toLowerCase()}`}
                        >
                          {book.category}
                        </span>
                        <div className="progress-mini">
                          <div
                            className="progress-mini-fill"
                            style={{ width: `${book.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="author-empty-books">
                  <p>You don't have any books by {authorName} imported.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "online" && (
            <div className="author-books-list">
              {loadingOnline ? (
                <div className="online-loading">
                  <div className="spinner"></div>
                  <p>Searching Google Books...</p>
                </div>
              ) : onlineBooks.length > 0 ? (
                <div className="author-books-grid online-grid">
                  {onlineBooks.map((book) => (
                    <a
                      key={book.id}
                      href={book.infoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="author-book-item card online-item"
                    >
                      <div className="author-book-cover-wrap">
                        {book.cover ? (
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="author-book-cover"
                          />
                        ) : (
                          <div className="author-book-placeholder">
                            <Globe size={24} />
                          </div>
                        )}
                        <div className="read-overlay">
                          <ExternalLink size={16} />
                          <span>View Web</span>
                        </div>
                      </div>
                      <div className="author-book-info">
                        <h4>{book.title}</h4>
                        <p className="online-pub-date">
                          Published: {book.publishedDate}
                        </p>
                        {book.description && (
                          <p className="online-book-desc">
                            {book.description.length > 120
                              ? book.description.slice(0, 120) + "…"
                              : book.description}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="author-empty-books">
                  <p>No additional books by {authorName} were found online.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AuthorDetailModal;
