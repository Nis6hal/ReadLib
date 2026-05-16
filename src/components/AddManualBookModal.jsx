import React, { useState } from 'react';
import { X, Save, Upload, Plus } from 'lucide-react';
import { GENRES, useLibrary } from '../context/LibraryContext';
import { useToast } from './Toast';
import './AddManualBookModal.css';

function AddManualBookModal({ onClose }) {
  const { addManualBook } = useLibrary();
  const { addToast } = useToast();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('Other');
  const [category, setCategory] = useState('Planned');
  const [cover, setCover] = useState(null);

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCover(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      addToast('Please enter a book title', 'error');
      return;
    }
    
    await addManualBook({
      title: title.trim(),
      author: author.trim() || 'Unknown Author',
      genre,
      category,
      cover
    });
    
    addToast(`"${title}" added to your collection!`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-manual-modal card glass-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
             <Plus size={20} className="accent-icon" />
             <h2>Add Book Manually</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="manual-form-row">
            <div className="manual-cover-section">
               <div className="manual-cover-preview" style={cover ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover' } : {}}>
                  {!cover && <Upload size={32} color="rgba(255,255,255,0.2)" />}
               </div>
               <label className="btn btn-secondary btn-sm cover-btn">
                 <Upload size={14} /> Upload Cover
                 <input type="file" hidden accept="image/*" onChange={handleCoverUpload} />
               </label>
            </div>

            <div className="manual-fields-section">
              <div className="form-group">
                <label>Book Title</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Atomic Habits" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Author Name</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. James Clear" 
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Genre</label>
                  <select className="input" value={genre} onChange={e => setGenre(e.target.value)}>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Initial Status</label>
                  <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Planned">Planned</option>
                    <option value="Reading">Reading</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={18} /> Save to Collection
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddManualBookModal;
