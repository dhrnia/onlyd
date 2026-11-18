import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Copy,
  Check,
  Edit2,
  Trash2,
  Tag,
  ArrowLeft,
  X,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PRESET_TAGS = ['Work', 'Friends', 'Family', 'VIP', 'Clients', 'Personal'];

export function ContactsApp() {
  const { data, addContact, updateContact, deleteContact, navigateTo, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [copiedId, setCopiedId] = useState(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    tag: 'Work',
    notes: ''
  });

  const contacts = data.contacts || [];

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set(PRESET_TAGS);
    contacts.forEach(c => {
      if (c.tag && c.tag.trim()) set.add(c.tag.trim());
    });
    return Array.from(set);
  }, [contacts]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const q = search.toLowerCase();
      const matchSearch =
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.tag || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (selectedTag !== 'all' && c.tag !== selectedTag) return false;
      return true;
    });
  }, [contacts, search, selectedTag]);

  const copyPhone = (id, phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    showToast('Phone number copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openAddModal = () => {
    setEditingContact(null);
    setForm({ name: '', phone: '', email: '', tag: 'Work', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      tag: contact.tag || 'Work',
      notes: contact.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingContact) {
      updateContact(editingContact.id, form);
    } else {
      addContact(form);
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
            Contacts
          </h1>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>New Contact</span>
        </button>
      </div>

      {/* Search & Tag Filter Pills */}
      <div className="mt-6 space-y-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            placeholder="Search by name, phone, email or tag..."
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

        {/* Tag Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setSelectedTag('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              selectedTag === 'all'
                ? 'bg-black text-white'
                : 'border border-black/10 bg-white text-black/70 hover:bg-black/5 hover:text-black'
            }`}
          >
            All Contacts ({contacts.length})
          </button>
          {allTags.map(tag => {
            const count = contacts.filter(c => c.tag === tag).length;
            if (count === 0 && selectedTag !== tag) return null;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  selectedTag === tag
                    ? 'bg-black text-white'
                    : 'border border-black/10 bg-white text-black/70 hover:bg-black/5 hover:text-black'
                }`}
              >
                {tag} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Cards Grid */}
      <div className="mt-6">
        {filteredContacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
            <Users size={32} className="mx-auto text-black/30" />
            <h3 className="mt-3 text-sm font-bold text-black">No contacts found</h3>
            <p className="mt-1">
              {search || selectedTag !== 'all' ? 'Try adjusting your search or tag filters.' : 'Add your first contact with the button above!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs hover:border-black/30 transition group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-black">{contact.name}</h3>
                      {contact.tag && (
                        <span className="mt-1 inline-block rounded-md border border-black/10 bg-[#f7f7f5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/70">
                          {contact.tag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(contact)}
                        className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                        title="Edit contact"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete contact "${contact.name}"?`)) {
                            deleteContact(contact.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                        title="Delete contact"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-4 space-y-2 text-xs">
                    {contact.phone && (
                      <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] px-3 py-2">
                        <div className="flex items-center gap-2 text-black/70 font-mono">
                          <Phone size={13} className="text-black/50" />
                          <span>{contact.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyPhone(contact.id, contact.phone)}
                            className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black"
                            title="Copy number"
                          >
                            {copiedId === contact.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                          <a
                            href={`tel:${contact.phone}`}
                            className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black"
                            title="Call"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    )}

                    {contact.email && (
                      <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#f7f7f5] px-3 py-2">
                        <div className="flex items-center gap-2 text-black/70 truncate">
                          <Mail size={13} className="text-black/50 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                        <a
                          href={`mailto:${contact.email}`}
                          className="rounded-md p-1 text-black/40 hover:bg-black/10 hover:text-black shrink-0"
                          title="Send Email"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-black/5 pt-3 text-[10px] text-black/40">
                  Updated {new Date(contact.updatedAt || contact.createdAt || Date.now()).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bruce Wayne"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. name@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Tag / Group</label>
                <input
                  type="text"
                  placeholder="e.g. Work, VIP, Family"
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
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
                  {editingContact ? 'Save Changes' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
