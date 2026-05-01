import React, { useState, useMemo } from 'react';
import { Library as LibraryIcon, Search, FolderOpen, RefreshCw, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { useToast } from '../components/Toast';
import BookCard from '../components/BookCard';
import '../App.css';
import './Library.css';

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title A→Z' },
  { value: 'title-desc', label: 'Title Z→A' },
  { value: 'added-desc', label: 'Recently Added' },
  { value: 'added-asc', label: 'Oldest First' },
  { value: 'progress-desc', label: 'Most Progress' },
  { value: 'progress-asc', label: 'Least Progress' },
  { value: 'lastread-desc', label: 'Last Read' },
];

function Library() {
  const { books, loading, selectDirectory, scanDirectory, dirHandle } = useLibrary();
  const { addToast } = useToast();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [sortBy, setSortBy] = useState('added-desc');
  const [viewMode, setViewMode] = useState('grid');

  const filters = ['All', 'Planned', 'Reading', 'Completed'];

  const filteredBooks = useMemo(() => {
    let result = [...books];

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

    // Sort
    const [field, direction] = sortBy.split('-');
    result.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'added':
          cmp = (a.addedAt || '').localeCompare(b.addedAt || '');
          break;
        case 'progress':
          cmp = (a.progress || 0) - (b.progress || 0);
          break;
        case 'lastread':
          cmp = (a.lastRead || '').localeCompare(b.lastRead || '');
          break;
        default:
          cmp = 0;
      }
      return direction === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [books, activeFilter, searchQuery, sortBy]);

  const handleRescan = async () => {
    if (dirHandle && !isScanning) {
      setIsScanning(true);
      try {
        await scanDirectory(dirHandle);
        addToast('Library rescanned successfully', 'success');
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
          {/* Search + View Controls */}
          <div className="library-controls fade-in fade-in-delay-1">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                id="library-search"
              />
            </div>

            <div className="library-view-controls">
              {/* Sort */}
              <div className="sort-select-wrapper">
                <ArrowUpDown size={14} className="sort-icon" />
                <select 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)}
                  className="sort-select"
                  id="library-sort"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Grid/List Toggle */}
              <div className="view-toggle">
                <button 
                  className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  id="view-grid"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List view"
                  id="view-list"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
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

      {/* Books Grid or List */}
      {filteredBooks.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="books-grid fade-in fade-in-delay-2">
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} viewMode="grid" />
            ))}
          </div>
        ) : (
          <div className="books-list fade-in fade-in-delay-2">
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} viewMode="list" />
            ))}
          </div>
        )
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
