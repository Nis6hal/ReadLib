import React, { useState, useMemo } from 'react';
import { Library as LibraryIcon, Search, FolderOpen, RefreshCw, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { useLibrary, GENRES } from '../context/LibraryContext';
import { useToast } from '../components/Toast';
import BookCard from '../components/BookCard';
import { BookCardSkeleton } from '../components/Skeleton';
import '../App.css';
import './Library.css';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get('genre') || 'All';
  const initialSearch = searchParams.get('search') || '';
  
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [activeCollection, setActiveCollection] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isScanning, setIsScanning] = useState(false);
  const [sortBy, setSortBy] = useState('added-desc');
  const [viewMode, setViewMode] = useState('grid');

  const genres = ['All', ...GENRES];
  const collections = [
    { id: 'All', label: 'All Books' },
    { id: 'Favorites', label: '⭐ Favorites' },
    { id: 'Must Read', label: '📚 Must Read' },
    { id: 'Finished', label: '✅ Finished' },
  ];

  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Filter by genre
    if (activeFilter !== 'All') {
      result = result.filter(b => b.genre === activeFilter);
    }

    // Filter by Collection
    if (activeCollection === 'Favorites') {
      result = result.filter(b => b.isFavorite);
    } else if (activeCollection === 'Must Read') {
      result = result.filter(b => b.category === 'Planned');
    } else if (activeCollection === 'Finished') {
      result = result.filter(b => b.category === 'Completed');
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
  }, [books, activeFilter, activeCollection, searchQuery, sortBy]);

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
    return books.filter(b => b.genre === filter).length;
  };

  return (
    <div className="library-page fade-in">
      <div className="page-header">
        <h1>{searchQuery ? `Search: ${searchQuery}` : activeFilter !== 'All' ? activeFilter : 'Library'}</h1>
        <div className="header-actions-row">
          <div className="header-stats">
            <span>{books.length} Books</span>
            <span>{dirHandle?.name || 'No folder selected'}</span>
          </div>
          <div className="header-buttons">
            <button className={`btn btn-secondary ${isScanning ? 'loading' : ''}`} onClick={handleRescan} disabled={!dirHandle}>
              <RefreshCw size={16} /> Rescan
            </button>
            <button className="btn btn-primary" onClick={selectDirectory}>
              <FolderOpen size={16} /> {dirHandle ? 'Change Folder' : 'Select Folder'}
            </button>
          </div>
        </div>
      </div>


      <div className="library-controls fade-in fade-in-delay-1">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by title or author..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-scroll">
          <div className="filter-group">
            <span className="filter-label">Collections</span>
            {collections.map(col => (
              <button 
                key={col.id} 
                className={`filter-tag ${activeCollection === col.id ? 'active' : ''}`}
                onClick={() => setActiveCollection(col.id)}
              >
                {col.label}
              </button>
            ))}
          </div>
          <div className="filter-divider"></div>
          <div className="filter-group">
            <span className="filter-label">Genres</span>
            {genres.map(genre => (
              <button 
                key={genre} 
                className={`filter-tag ${activeFilter === genre ? 'active' : ''}`}
                onClick={() => {
                  setActiveFilter(genre);
                  setSearchParams(genre === 'All' ? {} : { genre });
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="view-controls">
          <div className="sort-control">
            <ArrowUpDown size={16} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="layout-toggle">
            <button className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <LayoutGrid size={18} />
            </button>
            <button className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={`books-container ${viewMode}-view fade-in fade-in-delay-2`}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <BookCardSkeleton key={i} />)}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className={`books-container ${viewMode}-view fade-in fade-in-delay-2`}>
          {filteredBooks.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              variant={viewMode === 'list' ? 'list' : 'full'}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state fade-in fade-in-delay-2">
          <div className="empty-icon">
            <LibraryIcon size={48} />
          </div>
          <h3>No books found</h3>
          <p>Try adjusting your search or filters, or add a new folder to your library.</p>
          <button className="btn btn-primary" onClick={selectDirectory}>
            Add Folder
          </button>
        </div>
      )}
    </div>
  );
}

export default Library;
