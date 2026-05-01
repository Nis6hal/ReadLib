import React, { useState, useMemo } from 'react';
import { Library as LibraryIcon, Search, FolderOpen, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import '../App.css';
import './Library.css';

function Library() {
  const { books, loading, selectDirectory, scanDirectory, dirHandle } = useLibrary();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const filters = ['All', 'Planned', 'Reading', 'Completed'];

  const filteredBooks = useMemo(() => {
    let result = books;

    // Filter by category
    if (activeFilter !== 'All') {
      result = result.filter(b => b.category === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        b =>
          b.title.toLowerCase().includes(query) ||
          b.author.toLowerCase().includes(query)
      );
    }

    return result;
  }, [books, activeFilter, searchQuery]);

  const handleRescan = async () => {
    if (dirHandle && !isScanning) {
      setIsScanning(true);
      try {
        await scanDirectory(dirHandle);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const getFilterCount = (filter) => {
    if (filter === 'All') return books.length;
    return books.filter(b => b.category === filter).length;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading library...</p>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="page-header fade-in">
        <div className="library-header-row">
          <div>
            <h1>Library</h1>
            <p className="page-subtitle">{books.length} book{books.length !== 1 ? 's' : ''} in your collection</p>
          </div>
          <div className="library-actions">
            {dirHandle && (
              <button 
                className="btn btn-secondary" 
                onClick={handleRescan} 
                title="Re-scan directory"
                disabled={isScanning}
              >
                <RefreshCw size={16} className={isScanning ? 'spin-icon' : ''} /> 
                {isScanning ? 'Scanning...' : 'Rescan'}
              </button>
            )}
            <button className="btn btn-primary" onClick={selectDirectory}>
              <FolderOpen size={16} /> {dirHandle ? 'Change Folder' : 'Add Folder'}
            </button>
          </div>
        </div>
      </div>

      {books.length > 0 && (
        <>
          {/* Search */}
          <div className="search-bar fade-in fade-in-delay-1">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="library-search"
            />
          </div>

          {/* Category Filters */}
          <div className="filter-tabs fade-in fade-in-delay-1">
            {filters.map(filter => (
              <button
                key={filter}
                className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
                id={`filter-${filter.toLowerCase()}`}
              >
                {filter}
                <span className="filter-count">{getFilterCount(filter)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Books Grid */}
      {filteredBooks.length > 0 ? (
        <div className="books-grid fade-in fade-in-delay-2">
          {filteredBooks.map(book => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="empty-state card fade-in fade-in-delay-2">
          <div className="empty-state-icon">
            <LibraryIcon size={36} color="var(--accent-primary)" />
          </div>
          {books.length === 0 ? (
            <>
              <h3>No books yet</h3>
              <p>Select a folder containing PDF files to populate your library.</p>
              <button className="btn btn-primary" onClick={selectDirectory}>
                <FolderOpen size={18} /> Select Library Folder
              </button>
            </>
          ) : (
            <>
              <h3>No matching books</h3>
              <p>Try adjusting your search or filter criteria.</p>
              <button className="btn btn-secondary" onClick={() => { setSearchQuery(''); setActiveFilter('All'); }}>
                Clear Filters
              </button>
            </>
          )}
        </div>
      )}

      {/* Results count */}
      {books.length > 0 && filteredBooks.length > 0 && (
        <div className="results-count fade-in fade-in-delay-3">
          Showing {filteredBooks.length} of {books.length} books
        </div>
      )}
    </div>
  );
}

export default Library;
