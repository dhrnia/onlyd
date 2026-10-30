// ==========================================================================
// ContactCache — Fast Cross-Device Synced Contacts
// ==========================================================================

let contacts = [];
let activeTagFilter = 'ALL';
let searchQuery = '';
let syncInterval = null;
let lastSyncedTimestamp = null;
let isSyncing = false;
let pendingDeleteId = null;

// DOM Elements
const contactsGrid = document.getElementById('contactsGrid');
const emptyState = document.getElementById('emptyState');
const contactCount = document.getElementById('contactCount');
const lastSyncedTime = document.getElementById('lastSyncedTime');
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const tagFilters = document.getElementById('tagFilters');
const statusLabel = document.getElementById('statusLabel');
const syncStatusDot = document.querySelector('.status-dot');

// Action Buttons
const btnSync = document.getElementById('btnSync');
const btnOpenAddModal = document.getElementById('btnOpenAddModal');
const btnFabAdd = document.getElementById('btnFabAdd');
const btnEmptyAdd = document.getElementById('btnEmptyAdd');

// Contact Modal
const contactModal = document.getElementById('contactModal');
const contactForm = document.getElementById('contactForm');
const modalTitle = document.getElementById('modalTitle');
const contactId = document.getElementById('contactId');
const inputName = document.getElementById('inputName');
const inputEmail = document.getElementById('inputEmail');
const inputPhone = document.getElementById('inputPhone');
const inputTag = document.getElementById('inputTag');
const btnCloseContactModal = document.getElementById('btnCloseContactModal');
const btnCancelContact = document.getElementById('btnCancelContact');

// Delete Modal
const deleteModal = document.getElementById('deleteModal');
const deleteContactName = document.getElementById('deleteContactName');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');

// ==========================================================================
// Background PWA Service Worker (Silent Registration for Browser App Installation)
// ==========================================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}

// ==========================================================================
// Toast System
// ==========================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✓';
  if (type === 'error') icon = '⚠️';
  if (type === 'info') icon = 'ℹ️';
  
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 2800);
}

// ==========================================================================
// App Initialization & Multi-Sync
// ==========================================================================

async function initApp() {
  await fetchContacts(false);

  // Background auto-sync across devices (every 7 seconds)
  syncInterval = setInterval(() => {
    if (!contactModal.classList.contains('active')) {
      fetchContacts(false);
    }
  }, 7000);

  // Sync immediately when window or app tab is focused
  window.addEventListener('focus', () => fetchContacts(false));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchContacts(false);
    }
  });
}

// Fetch contacts from server
async function fetchContacts(showFeedback = false) {
  if (isSyncing) return;
  isSyncing = true;

  const syncIcon = document.querySelector('.sync-icon');
  if (syncIcon) syncIcon.classList.add('spinning');
  if (syncStatusDot) syncStatusDot.classList.add('syncing');

  try {
    const res = await fetch('/api/contacts');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.success) {
      contacts = data.contacts || [];
      lastSyncedTimestamp = new Date();
      updateSyncedTimestampText();
      renderContacts();
      renderTagFilters();

      if (statusLabel) statusLabel.textContent = 'Synced';
      if (syncStatusDot) {
        syncStatusDot.className = 'status-dot online';
      }

      if (showFeedback) {
        showToast('Contacts synced', 'success');
      }
    }
  } catch (err) {
    console.error('Sync failed:', err);
    if (statusLabel) statusLabel.textContent = 'Offline';
    if (syncStatusDot) syncStatusDot.className = 'status-dot';
  } finally {
    isSyncing = false;
    if (syncIcon) syncIcon.classList.remove('spinning');
    if (syncStatusDot) syncStatusDot.classList.remove('syncing');
  }
}

function updateSyncedTimestampText() {
  if (!lastSyncedTimestamp || !lastSyncedTime) return;
  const now = new Date();
  const diffSec = Math.floor((now - lastSyncedTimestamp) / 1000);

  if (diffSec < 10) {
    lastSyncedTime.textContent = 'Last synced: Just now';
  } else if (diffSec < 60) {
    lastSyncedTime.textContent = `Last synced: ${diffSec}s ago`;
  } else {
    const mins = Math.floor(diffSec / 60);
    lastSyncedTime.textContent = `Last synced: ${mins}m ago`;
  }
}

setInterval(updateSyncedTimestampText, 10000);

// ==========================================================================
// Rendering Contacts & Tag Chips
// ==========================================================================

const AVATAR_PALETTES = [
  'linear-gradient(135deg, #0f172a, #2563eb)',
  'linear-gradient(135deg, #1e3a8a, #3b82f6)',
  'linear-gradient(135deg, #030712, #1d4ed8)',
  'linear-gradient(135deg, #172554, #60a5fa)',
  'linear-gradient(135deg, #0b1120, #0284c7)',
  'linear-gradient(135deg, #1e40af, #38bdf8)',
  'linear-gradient(135deg, #020617, #0ea5e9)'
];

function getAvatarBackground(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getTagClass(tag) {
  if (!tag) return 'default';
  const lower = tag.toLowerCase().trim();
  if (lower.includes('work') || lower.includes('office') || lower.includes('job')) return 'work';
  if (lower.includes('fam')) return 'family';
  if (lower.includes('friend') || lower.includes('pal')) return 'friends';
  if (lower.includes('vip') || lower.includes('client') || lower.includes('lead')) return 'vip';
  return 'default';
}

function renderContacts() {
  const filtered = contacts.filter((c) => {
    // Tag filter
    if (activeTagFilter !== 'ALL') {
      if (!c.tag || c.tag.trim().toLowerCase() !== activeTagFilter.toLowerCase()) {
        return false;
      }
    }

    // Search query filter (matches name, phone, email, or tag)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inName = (c.name || '').toLowerCase().includes(q);
      const inPhone = (c.phone || '').toLowerCase().includes(q);
      const inEmail = (c.email || '').toLowerCase().includes(q);
      const inTag = (c.tag || '').toLowerCase().includes(q);
      return inName || inPhone || inEmail || inTag;
    }

    return true;
  });

  contactCount.textContent = `${filtered.length} Contact${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    contactsGrid.innerHTML = '';
    emptyState.style.display = 'block';
    if (searchQuery || activeTagFilter !== 'ALL') {
      document.getElementById('emptyTitle').textContent = 'No matching contacts';
      document.getElementById('emptySubtitle').textContent = 'Try adjusting your search query or tag filter.';
    } else {
      document.getElementById('emptyTitle').textContent = 'No Contacts Saved Yet';
      document.getElementById('emptySubtitle').textContent = 'Start by adding your first contact!';
    }
    return;
  }

  emptyState.style.display = 'none';

  // Render cards
  contactsGrid.innerHTML = filtered.map((c) => {
    const initials = getInitials(c.name);
    const bg = getAvatarBackground(c.name);
    const tagClass = getTagClass(c.tag);

    return `
      <div class="contact-card" data-id="${c.id}">
        <div>
          <div class="contact-header">
            <div class="avatar" style="background: ${bg};">${escapeHtml(initials)}</div>
            <div class="contact-info">
              <h3 class="contact-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h3>
              ${c.tag ? `<span class="tag-badge ${tagClass}">${escapeHtml(c.tag)}</span>` : ''}
            </div>
          </div>

          <div class="contact-details" style="margin-top: 1rem;">
            ${c.phone ? `
              <div class="detail-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <a href="tel:${escapeHtml(c.phone)}" title="Click to call">${escapeHtml(c.phone)}</a>
              </div>
            ` : ''}

            ${c.email ? `
              <div class="detail-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <a href="mailto:${escapeHtml(c.email)}" title="Click to email">${escapeHtml(c.email)}</a>
              </div>
            ` : ''}

            ${!c.phone && !c.email ? `
              <div class="detail-row" style="color: var(--text-dim); font-style: italic; font-size: 0.8rem;">
                No phone or email saved
              </div>
            ` : ''}
          </div>
        </div>

        <div class="contact-actions">
          ${c.phone ? `
            <a href="tel:${escapeHtml(c.phone)}" class="action-btn" title="Call">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </a>
            <button class="action-btn btn-copy" data-copy="${escapeHtml(c.phone)}" title="Copy Phone Number">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          ` : ''}

          ${c.email ? `
            <a href="mailto:${escapeHtml(c.email)}" class="action-btn" title="Send Email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </a>
          ` : ''}

          <button class="action-btn btn-edit" data-id="${c.id}" title="Edit Contact">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>

          <button class="action-btn delete-btn btn-delete" data-id="${c.id}" data-name="${escapeHtml(c.name)}" title="Delete Contact">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach event handlers to card action buttons
  contactsGrid.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  contactsGrid.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id, btn.dataset.name));
  });

  contactsGrid.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy).then(() => {
        showToast('Phone number copied to clipboard', 'success');
      });
    });
  });
}

function renderTagFilters() {
  const tagsSet = new Set();
  contacts.forEach((c) => {
    if (c.tag && c.tag.trim()) {
      tagsSet.add(c.tag.trim());
    }
  });

  const uniqueTags = Array.from(tagsSet).sort();

  let html = `<button class="tag-chip ${activeTagFilter === 'ALL' ? 'active' : ''}" data-tag="ALL">All (${contacts.length})</button>`;
  
  uniqueTags.forEach((t) => {
    const count = contacts.filter((c) => c.tag && c.tag.trim().toLowerCase() === t.toLowerCase()).length;
    html += `<button class="tag-chip ${activeTagFilter.toLowerCase() === t.toLowerCase() ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)} (${count})</button>`;
  });

  tagFilters.innerHTML = html;

  tagFilters.querySelectorAll('.tag-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTagFilter = btn.dataset.tag;
      renderTagFilters();
      renderContacts();
    });
  });
}

// ==========================================================================
// Modal Operations (Add / Edit)
// ==========================================================================

function openAddModal() {
  modalTitle.textContent = 'New Contact';
  contactId.value = '';
  contactForm.reset();
  contactModal.classList.add('active');
  inputName.focus();
}

function openEditModal(id) {
  const contact = contacts.find((c) => c.id === id);
  if (!contact) return;

  modalTitle.textContent = 'Edit Contact';
  contactId.value = contact.id;
  inputName.value = contact.name || '';
  inputEmail.value = contact.email || '';
  inputPhone.value = contact.phone || '';
  inputTag.value = contact.tag || '';

  contactModal.classList.add('active');
  inputName.focus();
}

function closeContactModal() {
  contactModal.classList.remove('active');
  contactForm.reset();
}

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nameVal = inputName.value.trim();
  if (!nameVal) {
    showToast('Name is required!', 'error');
    inputName.focus();
    return;
  }

  const payload = {
    name: nameVal,
    email: inputEmail.value.trim(),
    phone: inputPhone.value.trim(),
    tag: inputTag.value.trim()
  };

  const id = contactId.value;
  const isEdit = Boolean(id);
  const saveBtn = document.getElementById('btnSaveContact');
  const originalText = saveBtn.innerHTML;

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span>Saving...</span>';

  try {
    const url = isEdit ? `/api/contacts/${id}` : '/api/contacts';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save contact');
    }

    closeContactModal();
    showToast(isEdit ? 'Contact updated!' : 'Contact saved!', 'success');
    await fetchContacts(false);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
});

// Quick tags click handlers in modal
document.querySelectorAll('.btn-quick-tag').forEach((btn) => {
  btn.addEventListener('click', () => {
    inputTag.value = btn.dataset.tag;
  });
});

// ==========================================================================
// Delete Modal Operations
// ==========================================================================

function openDeleteModal(id, name) {
  pendingDeleteId = id;
  deleteContactName.textContent = `"${name}"`;
  deleteModal.classList.add('active');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.classList.remove('active');
}

btnConfirmDelete.addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  btnConfirmDelete.disabled = true;
  btnConfirmDelete.textContent = 'Deleting...';

  try {
    const res = await fetch(`/api/contacts/${pendingDeleteId}`, {
      method: 'DELETE'
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete contact');
    }

    closeDeleteModal();
    showToast('Contact deleted and synced', 'success');
    await fetchContacts(false);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnConfirmDelete.disabled = false;
    btnConfirmDelete.textContent = 'Delete Contact';
  }
});

// ==========================================================================
// Search & Filter Events
// ==========================================================================

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  btnClearSearch.style.display = searchQuery ? 'block' : 'none';
  renderContacts();
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  btnClearSearch.style.display = 'none';
  searchInput.focus();
  renderContacts();
});

// Event Listeners for Buttons
btnOpenAddModal.addEventListener('click', openAddModal);
if (btnFabAdd) btnFabAdd.addEventListener('click', openAddModal);
if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', openAddModal);

btnCloseContactModal.addEventListener('click', closeContactModal);
btnCancelContact.addEventListener('click', closeContactModal);

btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
btnCancelDelete.addEventListener('click', closeDeleteModal);

btnSync.addEventListener('click', () => {
  fetchContacts(true);
});

// Close modal on backdrop click
[contactModal, deleteModal].forEach((modal) => {
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
});

// Escape key closes modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeContactModal();
    closeDeleteModal();
  }
});

// Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Start
initApp();
