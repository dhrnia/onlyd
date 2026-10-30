import React, { useState, useMemo } from 'react';
import {
  KeyRound,
  Link2,
  Search,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit2,
  Trash2,
  ExternalLink,
  ArrowLeft,
  X,
  LockOpen,
  Mail,
  User
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function VaultApp() {
  const {
    data,
    addPassword,
    updatePassword,
    deletePassword,
    addLink,
    updateLink,
    deleteLink,
    navigateTo,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('passwords'); // 'passwords' | 'links'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Reveal password map { id: boolean }
  const [revealedIds, setRevealedIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [editingPwd, setEditingPwd] = useState(null);
  const [pwdForm, setPwdForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    url: '',
    category: 'Personal',
    notes: ''
  });

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    tag: 'Development',
    note: ''
  });

  const passwords = data.vault?.passwords || [];
  const links = data.vault?.links || [];

  // Categories
  const pwdCategories = useMemo(() => {
    return ['all', ...new Set(passwords.map(p => p.category || 'Personal'))];
  }, [passwords]);

  const linkTags = useMemo(() => {
    return ['all', ...new Set(links.map(l => l.tag || 'General'))];
  }, [links]);

  // Filtered lists
  const filteredPasswords = useMemo(() => {
    return passwords.filter(p => {
      const q = search.toLowerCase();
      const match =
        (p.name || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.url || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
      if (!match) return false;
      if (selectedCategory !== 'all' && (p.category || 'Personal') !== selectedCategory) return false;
      return true;
    });
  }, [passwords, search, selectedCategory]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      const q = search.toLowerCase();
      const match =
        (l.title || '').toLowerCase().includes(q) ||
        (l.url || '').toLowerCase().includes(q) ||
        (l.tag || '').toLowerCase().includes(q) ||
        (l.note || '').toLowerCase().includes(q);
      if (!match) return false;
      if (selectedCategory !== 'all' && (l.tag || 'General') !== selectedCategory) return false;
      return true;
    });
  }, [links, search, selectedCategory]);

  const toggleReveal = (id) => {
    setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (id, text, label = 'Copied') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`${label} copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAddPwd = () => {
    setEditingPwd(null);
    setPwdForm({ name: '', username: '', email: '', password: '', url: '', category: 'Personal', notes: '' });
    setIsPwdModalOpen(true);
  };

  const openEditPwd = (p) => {
    setEditingPwd(p);
    setPwdForm({
      name: p.name || '',
      username: p.username || '',
      email: p.email || '',
      password: p.password || '',
      url: p.url || '',
      category: p.category || 'Personal',
      notes: p.notes || ''
    });
    setIsPwdModalOpen(true);
  };

  const handlePwdSubmit = (e) => {
    e.preventDefault();
    if (!pwdForm.name || !pwdForm.password) return;
    if (editingPwd) {
      updatePassword(editingPwd.id, pwdForm);
    } else {
      addPassword(pwdForm);
    }
    setIsPwdModalOpen(false);
  };

  const openAddLink = () => {
    setEditingLink(null);
    setLinkForm({ title: '', url: '', tag: 'Development', note: '' });
    setIsLinkModalOpen(true);
  };

  const openEditLink = (l) => {
    setEditingLink(l);
    setLinkForm({
      title: l.title || '',
      url: l.url || '',
      tag: l.tag || 'Development',
      note: l.note || ''
    });
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    if (!linkForm.title || !linkForm.url) return;
    if (editingLink) {
      updateLink(editingLink.id, linkForm);
    } else {
      addLink(linkForm);
    }
    setIsLinkModalOpen(false);
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
            Vault
          </h1>
        </div>

        {/* Tab & Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-xs">
            <button
              onClick={() => { setActiveTab('passwords'); setSelectedCategory('all'); }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'passwords'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              🔑 Passwords ({passwords.length})
            </button>
            <button
              onClick={() => { setActiveTab('links'); setSelectedCategory('all'); }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'links'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              🔗 Saved Links ({links.length})
            </button>
          </div>

          <button
            onClick={activeTab === 'passwords' ? openAddPwd : openAddLink}
            className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs"
          >
            <Plus size={14} />
            <span>{activeTab === 'passwords' ? 'Add Password' : 'Add Link'}</span>
          </button>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="mt-6 space-y-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            placeholder={activeTab === 'passwords' ? 'Search passwords, usernames, emails, websites...' : 'Search links & tags...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white py-2 pl-10 pr-4 text-xs text-black placeholder:text-black/40 focus:border-black focus:outline-none shadow-xs"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(activeTab === 'passwords' ? pwdCategories : linkTags).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition ${
                selectedCategory === cat
                  ? 'bg-black text-white'
                  : 'border border-black/10 bg-white text-black/70 hover:bg-black/5 hover:text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="mt-6">
        {/* TAB 1: PASSWORDS */}
        {activeTab === 'passwords' && (
          filteredPasswords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
              <KeyRound size={32} className="mx-auto text-black/30" />
              <h3 className="mt-3 text-sm font-bold text-black">No passwords found</h3>
              <p className="mt-1">Add your credentials securely with the button above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPasswords.map(p => {
                const isRevealed = revealedIds[p.id];
                return (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs hover:border-black/30 transition group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-black">{p.name}</h3>
                          {p.category && (
                            <span className="mt-1 inline-block rounded-md border border-black/10 bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/70">
                              {p.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPwd(p)}
                            className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete password for "${p.name}"?`)) {
                                deletePassword(p.id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="mt-4 space-y-2 text-xs">
                        {/* Username */}
                        {p.username && (
                          <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] px-3 py-2">
                            <div className="flex items-center gap-2 truncate">
                              <User size={13} className="text-black/40 shrink-0" />
                              <span className="font-mono text-black/80 truncate">{p.username}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`u_${p.id}`, p.username, 'Username')}
                              className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black ml-2 shrink-0"
                              title="Copy username"
                            >
                              {copiedId === `u_${p.id}` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}

                        {/* Email */}
                        {p.email && (
                          <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] px-3 py-2">
                            <div className="flex items-center gap-2 truncate">
                              <Mail size={13} className="text-black/40 shrink-0" />
                              <span className="font-mono text-black/80 truncate">{p.email}</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(`e_${p.id}`, p.email, 'Email')}
                              className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black ml-2 shrink-0"
                              title="Copy email"
                            >
                              {copiedId === `e_${p.id}` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}

                        {/* Password */}
                        <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] px-3 py-2">
                          <span className="font-mono text-black font-semibold tracking-wider">
                            {isRevealed ? p.password : '••••••••••••'}
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => toggleReveal(p.id)}
                              className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black"
                              title={isRevealed ? 'Hide' : 'Reveal'}
                            >
                              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(`p_${p.id}`, p.password, 'Password')}
                              className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black"
                              title="Copy password"
                            >
                              {copiedId === `p_${p.id}` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>

                        {/* URL */}
                        {p.url && (
                          <div className="flex items-center justify-between text-[11px] text-black/50 pt-1">
                            <span className="truncate">{p.url.replace(/^https?:\/\//, '')}</span>
                            <a
                              href={p.url.startsWith('http') ? p.url : `https://${p.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-black/60 hover:text-black ml-1 inline-flex items-center gap-0.5"
                            >
                              <span>Open</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-black/5 pt-3 text-[10px] text-black/40">
                      Updated {new Date(p.updatedAt || Date.now()).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* TAB 2: SAVED LINKS */}
        {activeTab === 'links' && (
          filteredLinks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
              <Link2 size={32} className="mx-auto text-black/30" />
              <h3 className="mt-3 text-sm font-bold text-black">No saved links</h3>
              <p className="mt-1">Bookmark important URLs and resources for quick access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLinks.map(l => (
                <div
                  key={l.id}
                  className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs hover:border-black/30 transition group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-black">{l.title}</h3>
                        {l.tag && (
                          <span className="mt-1 inline-block rounded-md border border-black/10 bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/70">
                            {l.tag}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditLink(l)}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete link "${l.title}"?`)) {
                              deleteLink(l.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <a
                      href={l.url.startsWith('http') ? l.url : `https://${l.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] p-3 text-xs text-black hover:border-black/20 transition"
                    >
                      <span className="truncate font-mono">{l.url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={13} className="shrink-0 text-black/50 ml-2" />
                    </a>

                    {l.note && (
                      <p className="mt-2 text-xs text-black/60 italic">
                        {l.note}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-black/5 pt-3 text-[10px] text-black/40">
                    Saved {new Date(l.savedAt || Date.now()).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* MODAL: Add/Edit Password */}
      {isPwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingPwd ? 'Edit Password' : 'Add Password'}
              </h3>
              <button onClick={() => setIsPwdModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handlePwdSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Service / Website Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, GitHub, Netflix"
                  value={pwdForm.name}
                  onChange={(e) => setPwdForm({ ...pwdForm, name: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Username</label>
                <input
                  type="text"
                  placeholder="e.g. johndoe, admin_dharania"
                  value={pwdForm.username}
                  onChange={(e) => setPwdForm({ ...pwdForm, username: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g. user@gmail.com"
                  value={pwdForm.email}
                  onChange={(e) => setPwdForm({ ...pwdForm, email: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Password *</label>
                <input
                  type="text"
                  required
                  placeholder="Password or secret token"
                  value={pwdForm.password}
                  onChange={(e) => setPwdForm({ ...pwdForm, password: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Website URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={pwdForm.url}
                  onChange={(e) => setPwdForm({ ...pwdForm, url: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Personal, Developer, Finance"
                  value={pwdForm.category}
                  onChange={(e) => setPwdForm({ ...pwdForm, category: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPwdModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {editingPwd ? 'Save Changes' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add/Edit Link */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingLink ? 'Edit Saved Link' : 'Bookmark Link'}
              </h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleLinkSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React Documentation"
                  value={linkForm.title}
                  onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={linkForm.url}
                  onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Tag</label>
                <input
                  type="text"
                  placeholder="e.g. Design, Reading, Work"
                  value={linkForm.tag}
                  onChange={(e) => setLinkForm({ ...linkForm, tag: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief context..."
                  value={linkForm.note}
                  onChange={(e) => setLinkForm({ ...linkForm, note: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-semibold text-black hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                >
                  {editingLink ? 'Save Changes' : 'Save Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
