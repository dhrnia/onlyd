import React, { useState, useMemo } from 'react';
import {
  Gift,
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  ArrowLeft,
  X,
  IndianRupee,
  Sparkles,
  LockOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'low', label: 'Low Priority' }
];

export function WishlistApp() {
  const {
    data,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    toggleWishlistPurchased,
    addWishlistCategory,
    navigateTo
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'pending' | 'purchased'
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    price: '',
    category: 'Tech',
    priority: 'high',
    url: '',
    notes: ''
  });

  const items = data.wishlist?.items || [];
  const categories = data.wishlist?.categories || ['Tech', 'Workstation', 'Books', 'Lifestyle', 'Fashion', 'Other'];

  // Summary Metrics
  const pendingItems = items.filter(i => !i.purchased);
  const purchasedItems = items.filter(i => i.purchased);
  const totalValue = pendingItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  const fulfilledValue = purchasedItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

  const formatINR = (val) => {
    return '₹' + (Number(val) || 0).toLocaleString('en-IN');
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const q = search.toLowerCase();
      const match =
        (i.title || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q);
      if (!match) return false;

      if (selectedStatus === 'pending' && i.purchased) return false;
      if (selectedStatus === 'purchased' && !i.purchased) return false;

      if (selectedPriority !== 'all' && i.priority !== selectedPriority) return false;
      if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;

      return true;
    });
  }, [items, search, selectedStatus, selectedPriority, selectedCategory]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm({
      title: '',
      price: '',
      category: categories[0] || 'Tech',
      priority: 'high',
      url: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      price: item.price || '',
      category: item.category || 'Tech',
      priority: item.priority || 'high',
      url: item.url || '',
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    if (editingItem) {
      updateWishlistItem(editingItem.id, form);
    } else {
      addWishlistItem(form);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
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
            Wishlist
          </h1>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Wish</span>
        </button>
      </div>

      {/* Snapshot Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-black/50">Total Wishlist Value (Pending)</div>
          <div className="mt-2 text-2xl font-extrabold text-black">{formatINR(totalValue)}</div>
          <div className="mt-1 text-[11px] text-black/50">{pendingItems.length} items awaiting purchase</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-black/50">Fulfilled Purchases</div>
          <div className="mt-2 text-2xl font-extrabold text-black">{purchasedItems.length} items</div>
          <div className="mt-1 text-[11px] text-black/50">Totaling {formatINR(fulfilledValue)} acquired</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold text-black/50">High Priority Targets</div>
          <div className="mt-2 text-2xl font-extrabold text-black">
            {pendingItems.filter(i => i.priority === 'high').length} items
          </div>
          <div className="mt-1 text-[11px] text-black/50">Immediate purchase focus</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search wishlist items, stores or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-white py-2 pl-10 pr-4 text-xs text-black placeholder:text-black/40 focus:border-black focus:outline-none shadow-xs"
            />
          </div>

          {/* Status Switcher Tabs */}
          <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedStatus === 'all'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedStatus === 'pending'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              onClick={() => setSelectedStatus('purchased')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                selectedStatus === 'purchased'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              Purchased ({purchasedItems.length})
            </button>
          </div>
        </div>

        {/* Priority & Category Sub-Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-black text-[11px] uppercase tracking-wider">Priority:</span>
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setSelectedPriority(p.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedPriority === p.value
                  ? 'bg-black/10 text-black font-semibold'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              {p.label}
            </button>
          ))}

          <span className="ml-3 font-semibold text-black text-[11px] uppercase tracking-wider">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-medium text-black focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Wishlist Items Grid */}
      <div className="mt-6">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
            <Gift size={32} className="mx-auto text-black/30" />
            <h3 className="mt-3 text-sm font-bold text-black">No wishlist items found</h3>
            <p className="mt-1">
              {search || selectedStatus !== 'all' || selectedPriority !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Your wishlist is empty. Add your dreams and goals above!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map(item => {
              const isPurchased = item.purchased;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition group ${
                    isPurchased
                      ? 'border-black/5 bg-[#f7f7f5]/80 opacity-75'
                      : 'border-black/10 bg-white hover:border-black/30'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleWishlistPurchased(item.id)}
                          className="text-black/40 hover:text-black transition"
                          title={isPurchased ? 'Mark as pending' : 'Mark as purchased'}
                        >
                          {isPurchased ? (
                            <CheckCircle2 size={18} className="text-black" />
                          ) : (
                            <Circle size={18} />
                          )}
                        </button>
                        <span className="rounded-md border border-black/10 bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/70">
                          {item.category || 'General'}
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            item.priority === 'high'
                              ? 'bg-black text-white'
                              : item.priority === 'medium'
                              ? 'border border-black text-black'
                              : 'text-black/50'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${item.title}"?`)) {
                              deleteWishlistItem(item.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className={`mt-3 text-base font-bold text-black ${isPurchased ? 'line-through text-black/60' : ''}`}>
                      {item.title}
                    </h3>

                    <div className="mt-2 text-lg font-extrabold text-black">
                      {formatINR(item.price)}
                    </div>

                    {item.notes && (
                      <p className="mt-2 text-xs text-black/60 line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    {item.url && (
                      <a
                        href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-black/60 hover:text-black"
                      >
                        <span>View Store Page</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>

                  <div className="mt-4 border-t border-black/5 pt-3 flex items-center justify-between text-[10px] text-black/40">
                    <span>{isPurchased ? 'Purchased' : 'Pending'}</span>
                    <span>{new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingItem ? 'Edit Wishlist Item' : 'New Wishlist Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony Headphones, Herman Miller Chair"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Tech, Books, Workstation"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Store / Product URL</label>
                <input
                  type="url"
                  placeholder="https://amazon.in/..."
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Notes / Why do you want this?</label>
                <textarea
                  rows={2}
                  placeholder="Specific specs, reasons or motivation..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {editingItem ? 'Save Changes' : 'Add to Wishlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
