import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Clapperboard,
  Tv,
  Heart,
  Plus,
  Search,
  FolderPlus,
  Trash2,
  Edit2,
  Star,
  Check,
  X,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const MEDIA_TYPES = [
  { value: 'all', label: 'All Media' },
  { value: 'Book', label: 'Books', icon: BookOpen },
  { value: 'Movie', label: 'Movies', icon: Clapperboard },
  { value: 'Series', label: 'TV Shows', icon: Tv },
  { value: 'Anime', label: 'Anime', icon: Sparkles },
  { value: 'Manga', label: 'Manga', icon: BookOpen },
  { value: 'Article', label: 'Articles', icon: BookOpen }
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'in-progress', label: 'In Progress / Reading / Watching' },
  { value: 'queue', label: 'Queue / Yet to Read / Watch' },
  { value: 'completed', label: 'Completed' }
];

// Options for Reading Mode
const READING_TYPES = ['Book', 'Manga', 'Article'];
const READING_STATUSES = [
  { value: 'Currently Reading', label: 'Currently Reading' },
  { value: 'Yet to Read', label: 'Yet to Read' },
  { value: 'Completed', label: 'Completed' }
];

// Options for Watching Mode
const WATCHING_TYPES = ['Movie', 'Series', 'Anime'];
const WATCHING_STATUSES = [
  { value: 'Currently Watch', label: 'Currently Watch' },
  { value: 'Yet to Watch', label: 'Yet to Watch' },
  { value: 'Completed', label: 'Completed' }
];

export function ShelfApp() {
  const { data, addShelfItem, updateShelfItem, deleteShelfItem, toggleShelfFavorite, addShelfCollection, navigateTo } = useApp();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Form Mode: 'reading' | 'watching'
  const [formMode, setFormMode] = useState('reading');
  // Custom type typing mode
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');

  // Form State
  const [form, setForm] = useState({
    title: '',
    creator: '',
    type: 'Book',
    status: 'Currently Reading',
    genre: '',
    rating: 5,
    notes: '',
    coverUrl: '',
    collectionIds: []
  });

  const items = data.shelf?.items || [];
  const genres = data.shelf?.genres || [];
  const collections = data.shelf?.collections || [];

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        (item.title || '').toLowerCase().includes(q) ||
        (item.creator || '').toLowerCase().includes(q) ||
        (item.genre || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q);
      if (!matchSearch) return false;

      // Type
      if (selectedType !== 'all') {
        const itemType = (item.type || '').toLowerCase();
        const targetType = selectedType.toLowerCase();
        if (itemType !== targetType && !(targetType === 'series' && itemType === 'show')) {
          return false;
        }
      }

      // Status
      const statusLower = (item.status || '').toLowerCase();
      if (selectedStatus === 'in-progress') {
        if (!statusLower.includes('currently')) return false;
      } else if (selectedStatus === 'queue') {
        if (!statusLower.includes('yet')) return false;
      } else if (selectedStatus === 'completed') {
        if (!statusLower.includes('completed')) return false;
      }

      // Genre
      if (selectedGenre !== 'all' && item.genre !== selectedGenre) return false;

      // Collection
      if (selectedCollection !== 'all') {
        if (!item.collectionIds?.includes(selectedCollection)) return false;
      }

      // Favorite
      if (showFavoritesOnly && !item.favorite) return false;

      return true;
    });
  }, [items, search, selectedType, selectedStatus, selectedGenre, selectedCollection, showFavoritesOnly]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormMode('reading');
    setIsCustomType(false);
    setCustomTypeInput('');
    setForm({
      title: '',
      creator: '',
      type: 'Book',
      status: 'Currently Reading',
      genre: genres[0] || 'Fiction',
      rating: 5,
      notes: '',
      coverUrl: '',
      collectionIds: []
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    // Detect if reading or watching
    const itemType = item.type || 'Book';
    const isWatch = WATCHING_TYPES.some(t => t.toLowerCase() === itemType.toLowerCase()) || itemType.toLowerCase() === 'show';
    const mode = isWatch ? 'watching' : 'reading';
    setFormMode(mode);

    // Check if custom type
    const standardList = mode === 'reading' ? READING_TYPES : WATCHING_TYPES;
    const isStandard = standardList.some(t => t.toLowerCase() === itemType.toLowerCase());

    if (!isStandard) {
      setIsCustomType(true);
      setCustomTypeInput(itemType);
    } else {
      setIsCustomType(false);
      setCustomTypeInput('');
    }

    setForm({
      title: item.title || '',
      creator: item.creator || '',
      type: itemType,
      status: item.status || (mode === 'reading' ? 'Currently Reading' : 'Currently Watch'),
      genre: item.genre || '',
      rating: item.rating || 5,
      notes: item.notes || '',
      coverUrl: item.coverUrl || '',
      collectionIds: item.collectionIds || []
    });
    setIsModalOpen(true);
  };

  // Switch between Reading and Watching in modal
  const handleModeChange = (newMode) => {
    setFormMode(newMode);
    setIsCustomType(false);
    setCustomTypeInput('');
    if (newMode === 'reading') {
      setForm(prev => ({
        ...prev,
        type: 'Book',
        status: 'Currently Reading'
      }));
    } else {
      setForm(prev => ({
        ...prev,
        type: 'Movie',
        status: 'Currently Watch'
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const finalType = isCustomType ? (customTypeInput.trim() || (formMode === 'reading' ? 'Book' : 'Movie')) : form.type;
    const payload = {
      ...form,
      type: finalType
    };

    if (editingItem) {
      updateShelfItem(editingItem.id, payload);
    } else {
      addShelfItem(payload);
    }
    setIsModalOpen(false);
  };

  const handleCreateCollection = (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    addShelfCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCollectionModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-black/10 pb-6">
        <div>
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 hover:text-black mb-2 transition"
          >
            <ArrowLeft size={13} />
            <span>Back to Home</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            My Shelf
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollectionModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-black/5 transition shadow-xs"
          >
            <FolderPlus size={14} />
            <span>New Collection</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-xs"
          >
            <Plus size={14} />
            <span>Add to Shelf</span>
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search by title, creator, genre or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white py-2 pl-10 pr-4 text-xs text-black placeholder:text-black/40 focus:border-black focus:outline-none shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              showFavoritesOnly
                ? 'border-black bg-black text-white'
                : 'border-black/10 bg-white text-black hover:bg-black/5'
            }`}
          >
            <Heart size={14} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
            <span>Favorites</span>
          </button>
        </div>

        {/* Media Type Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {MEDIA_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedType === t.value
                  ? 'bg-black text-white'
                  : 'border border-black/10 bg-white text-black/70 hover:bg-black/5 hover:text-black'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sub-Filters: Status & Collections */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/70">
          <span className="font-semibold text-black text-[11px] uppercase tracking-wider">Status:</span>
          {STATUS_FILTERS.map(sf => (
            <button
              key={sf.value}
              onClick={() => setSelectedStatus(sf.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedStatus === sf.value
                  ? 'bg-black/10 text-black font-semibold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              {sf.label}
            </button>
          ))}

          {collections.length > 0 && (
            <>
              <span className="ml-2 font-semibold text-black text-[11px] uppercase tracking-wider">Collection:</span>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-medium text-black focus:outline-none"
              >
                <option value="all">All Collections</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Grid of Shelf Items */}
      <div className="mt-6">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center">
            <BookOpen size={32} className="mx-auto text-black/30" />
            <h3 className="mt-3 text-sm font-bold text-black">No media items found</h3>
            <p className="mt-1 text-xs text-black/50">
              {search || selectedType !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Your shelf is empty. Add your favorite books, movies or TV series!'}
            </p>
            <button
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
            >
              <Plus size={14} />
              <span>Add Your First Item</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(item => {
              const statusStr = (item.status || '').toLowerCase();
              const isProgress = statusStr.includes('currently');
              const isCompleted = statusStr.includes('completed');

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs hover:border-black/30 transition group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block rounded-md border border-black/10 bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/70">
                          {item.type}
                        </span>
                        {item.genre && (
                          <span className="ml-1.5 text-[11px] font-medium text-black/50">
                            • {item.genre}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleShelfFavorite(item.id)}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Toggle favorite"
                        >
                          <Heart
                            size={14}
                            className={item.favorite ? 'text-black fill-black' : ''}
                          />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Edit item"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${item.title}" from shelf?`)) {
                              deleteShelfItem(item.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Delete item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-black group-hover:text-black">
                      {item.title}
                    </h3>
                    <div className="text-xs font-semibold text-black/60">
                      {item.creator ? `by ${item.creator}` : 'Unknown creator'}
                    </div>

                    {item.notes && (
                      <p className="mt-2.5 text-xs text-black/70 italic line-clamp-2">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-black/5 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      {/* Rating Stars */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= (item.rating || 5) ? 'text-black fill-black' : 'text-black/20'}
                          />
                        ))}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          isProgress
                            ? 'bg-black text-white'
                            : isCompleted
                            ? 'bg-black/10 text-black'
                            : 'border border-black/15 text-black/60'
                        }`}
                      >
                        {item.status || 'Queue'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/10 pb-4">
              <h2 className="text-base font-bold text-black">
                {editingItem ? 'Edit Media Entry' : 'Add to Shelf'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Reading vs Watching Toggle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                  Category Mode
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-[#f7f7f5] p-1">
                  <button
                    type="button"
                    onClick={() => handleModeChange('reading')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                      formMode === 'reading'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-black/60 hover:text-black'
                    }`}
                  >
                    <BookOpen size={14} />
                    <span>Reading</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('watching')}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                      formMode === 'watching'
                        ? 'bg-black text-white shadow-xs'
                        : 'text-black/60 hover:text-black'
                    }`}
                  >
                    <Clapperboard size={14} />
                    <span>Watching</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-black mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder={formMode === 'reading' ? 'e.g. Atomic Habits, Berserk' : 'e.g. Inception, Breaking Bad'}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              {/* Type Selection with Preset Pills + Custom Typing */}
              <div>
                <label className="block text-xs font-bold text-black mb-1">
                  {formMode === 'reading' ? 'Reading Type' : 'Watching Type'}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(formMode === 'reading' ? READING_TYPES : WATCHING_TYPES).map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setIsCustomType(false);
                        setForm({ ...form, type: t });
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        !isCustomType && form.type.toLowerCase() === t.toLowerCase()
                          ? 'bg-black text-white'
                          : 'border border-black/15 bg-white text-black/70 hover:bg-black/5'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomType(true);
                      if (!customTypeInput) setCustomTypeInput('');
                    }}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isCustomType
                        ? 'bg-black text-white'
                        : 'border border-dashed border-black/30 bg-white text-black/70 hover:bg-black/5'
                    }`}
                  >
                    + Custom / Type it
                  </button>
                </div>

                {isCustomType && (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={formMode === 'reading' ? 'Type custom type (e.g. Novella, Essay, Research Paper)' : 'Type custom type (e.g. Documentary, Miniseries, Short Film)'}
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    className="w-full rounded-xl border border-black/20 bg-[#f7f7f5] p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                )}
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-bold text-black mb-1">Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(formMode === 'reading' ? READING_STATUSES : WATCHING_STATUSES).map(s => (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setForm({ ...form, status: s.value })}
                      className={`rounded-xl py-2 px-1 text-center text-xs font-semibold transition ${
                        form.status === s.value
                          ? 'bg-black text-white shadow-xs'
                          : 'border border-black/15 bg-white text-black/70 hover:bg-black/5'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator & Genre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">
                    {formMode === 'reading' ? 'Author / Writer' : 'Director / Studio'}
                  </label>
                  <input
                    type="text"
                    placeholder={formMode === 'reading' ? 'e.g. James Clear' : 'e.g. Christopher Nolan'}
                    value={form.creator}
                    onChange={(e) => setForm({ ...form, creator: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Genre</label>
                  <input
                    type="text"
                    placeholder="e.g. Sci-Fi, Self-Improvement"
                    value={form.genre}
                    onChange={(e) => setForm({ ...form, genre: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-black mb-1">Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setForm({ ...form, rating: star })}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        size={20}
                        className={star <= form.rating ? 'text-black fill-black' : 'text-black/20'}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-black">{form.rating} / 5</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-black mb-1">Personal Notes / Review</label>
                <textarea
                  rows={2}
                  placeholder="Key thoughts, quotes, takeaways..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-black/15 bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collection Modal */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">Create New Collection</h3>
              <button
                onClick={() => setIsCollectionModalOpen(false)}
                className="text-black/40 hover:text-black"
              >
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreateCollection} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masterpieces, 2026 Must-Read"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
