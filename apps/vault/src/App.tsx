import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Module = 'passwords' | 'links'
type PasswordEntry = { id: string; name: string; username: string; password: string; url: string; category: string; updatedAt: string }
type LinkEntry = { id: string; title: string; url: string; note: string; tag: string; savedAt: string }
type VaultData = { passwords: PasswordEntry[]; links: LinkEntry[] }
type PasswordDraft = Omit<PasswordEntry, 'id' | 'updatedAt'>
type LinkDraft = Omit<LinkEntry, 'id' | 'savedAt'>

const vaultKey = 'my-vault-data'
const vaultPin = '0317'
const binId = import.meta.env.VITE_JSONBIN_BIN_ID
const accessKey = import.meta.env.VITE_JSONBIN_ACCESS_KEY
const emptyPassword: PasswordDraft = { name: '', username: '', password: '', url: '', category: 'Personal' }
const emptyLink: LinkDraft = { title: '', url: '', note: '', tag: 'Read later' }
const emptyVault: VaultData = { passwords: [], links: [] }
const legacySeedIds = new Set(['demo-1', 'demo-2', 'link-1', 'link-2'])

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [module, setModule] = useState<Module>('passwords')
  const [vault, setVault] = useState<VaultData>(() => {
    const stored = localStorage.getItem(vaultKey)
    if (!stored) return emptyVault
    try {
      const parsed = JSON.parse(stored) as VaultData
      return {
        passwords: parsed.passwords.filter((entry) => !legacySeedIds.has(entry.id)),
        links: parsed.links.filter((entry) => !legacySeedIds.has(entry.id)),
      }
    } catch {
      return emptyVault
    }
  })
  const [search, setSearch] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState(binId && accessKey ? 'Ready to sync' : 'Local only')
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(emptyPassword)
  const [linkDraft, setLinkDraft] = useState<LinkDraft>(emptyLink)

  useEffect(() => localStorage.setItem(vaultKey, JSON.stringify(vault)), [vault])
  const passwordCollections = useMemo(() => ['All', ...new Set(vault.passwords.map((entry) => entry.category || 'Unsorted'))], [vault.passwords])
  const linkCollections = useMemo(() => ['All', ...new Set(vault.links.map((entry) => entry.tag || 'Unsorted'))], [vault.links])
  const filteredPasswords = useMemo(() => vault.passwords.filter((entry) => `${entry.name} ${entry.username} ${entry.category}`.toLowerCase().includes(search.toLowerCase()) && (collectionFilter === 'All' || (entry.category || 'Unsorted') === collectionFilter)), [vault.passwords, search, collectionFilter])
  const filteredLinks = useMemo(() => vault.links.filter((entry) => `${entry.title} ${entry.url} ${entry.tag} ${entry.note}`.toLowerCase().includes(search.toLowerCase()) && (collectionFilter === 'All' || (entry.tag || 'Unsorted') === collectionFilter)), [vault.links, search, collectionFilter])

  const persistVault = (nextVault: VaultData) => { setVault(nextVault); if (binId && accessKey) void sync('push', nextVault) }
  const closeForm = () => { setShowForm(false); setEditingId(null); setPasswordDraft(emptyPassword); setLinkDraft(emptyLink) }
  const openNewForm = () => { setEditingId(null); setPasswordDraft(emptyPassword); setLinkDraft(emptyLink); setShowForm(true) }
  const editPassword = (entry: PasswordEntry) => { setModule('passwords'); setEditingId(entry.id); setPasswordDraft({ name: entry.name, username: entry.username, password: entry.password, url: entry.url, category: entry.category }); setShowForm(true) }
  const editLink = (entry: LinkEntry) => { setModule('links'); setEditingId(entry.id); setLinkDraft({ title: entry.title, url: entry.url, note: entry.note, tag: entry.tag }); setShowForm(true) }
  const deletePassword = (id: string) => { if (window.confirm('Delete this password?')) persistVault({ ...vault, passwords: vault.passwords.filter((entry) => entry.id !== id) }) }
  const deleteLink = (id: string) => { if (window.confirm('Delete this saved link?')) persistVault({ ...vault, links: vault.links.filter((entry) => entry.id !== id) }) }
  const savePassword = (event: FormEvent) => { event.preventDefault(); if (!passwordDraft.name || !passwordDraft.password) return; const nextVault = editingId ? { ...vault, passwords: vault.passwords.map((entry) => entry.id === editingId ? { ...entry, ...passwordDraft, updatedAt: 'Just now' } : entry) } : { ...vault, passwords: [{ ...passwordDraft, id: crypto.randomUUID(), updatedAt: 'Just now' }, ...vault.passwords] }; persistVault(nextVault); closeForm() }
  const saveLink = (event: FormEvent) => { event.preventDefault(); if (!linkDraft.title || !linkDraft.url) return; const nextVault = editingId ? { ...vault, links: vault.links.map((entry) => entry.id === editingId ? { ...entry, ...linkDraft, savedAt: 'Just now' } : entry) } : { ...vault, links: [{ ...linkDraft, id: crypto.randomUUID(), savedAt: 'Just now' }, ...vault.links] }; persistVault(nextVault); closeForm() }
  async function sync(direction: 'push' | 'pull', payload = vault) {
    if (!binId || !accessKey) { setSyncStatus('Sync unavailable'); return }
    setSyncStatus(direction === 'push' ? 'Pushing...' : 'Pulling...')
    try {
      const endpoint = `https://api.jsonbin.io/v3/b/${binId}${direction === 'pull' ? '/latest' : ''}`
      const response = await fetch(endpoint, { method: direction === 'push' ? 'PUT' : 'GET', headers: { 'X-Access-Key': accessKey, ...(direction === 'push' ? { 'Content-Type': 'application/json', 'X-Bin-Versioning': 'false' } : {}) }, ...(direction === 'push' ? { body: JSON.stringify(payload) } : {}) })
      if (!response.ok) throw new Error('Sync failed')
      if (direction === 'pull') {
        const result = await response.json()
        const incoming = result.record as VaultData
        if (incoming?.passwords && incoming?.links) {
          if (incoming.passwords.length === 0 && incoming.links.length === 0 && (vault.passwords.length > 0 || vault.links.length > 0)) void sync('push', vault)
          else setVault(incoming)
        }
      }
      setSyncStatus(direction === 'push' ? 'Synced just now' : 'Pulled just now')
    } catch { setSyncStatus('Could not sync') }
  }

  const unlock = (event: FormEvent) => {
    event.preventDefault()
    if (pin === vaultPin) {
      setIsUnlocked(true)
      setPinError(false)
      setPin('')
      if (binId && accessKey) void sync('pull')
      return
    }
    setPinError(true)
    setPin('')
  }

  if (!isUnlocked) return <main className="lock-screen"><section className="lock-panel"><div className="brand lock-brand"><span className="brand-mark">D</span><span>D Vault</span></div><div className="lock-icon">✦</div><div className="eyebrow">Private shelf</div><h1>Enter your PIN</h1><form onSubmit={unlock}><label className="pin-field"><span className="sr-only">PIN</span><input autoFocus inputMode="numeric" maxLength={4} pattern="[0-9]{4}" type="password" value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, '')); setPinError(false) }} placeholder="••••" aria-invalid={pinError} /></label>{pinError && <p className="pin-error" role="alert">That PIN is not correct.</p>}<button className="primary-button full-width" type="submit">Unlock vault</button></form></section></main>

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">D</span><span>D Vault</span></div>
      <div className="eyebrow">Your private shelf</div>
      <nav className="module-nav" aria-label="Vault modules">
        <button className={module === 'passwords' ? 'active' : ''} onClick={() => { setModule('passwords'); setSearch(''); setCollectionFilter('All') }}><span>✦</span> Passwords <b>{vault.passwords.length}</b></button>
        <button className={module === 'links' ? 'active' : ''} onClick={() => { setModule('links'); setSearch(''); setCollectionFilter('All') }}><span>↗</span> Saved links <b>{vault.links.length}</b></button>
      </nav>
      <div className="sidebar-foot"><div className="sync-orbit"><span>↻</span></div><div><strong>{syncStatus}</strong><small>{binId && accessKey ? 'JSONBin connection' : 'Add .env values to sync'}</small></div><button className="icon-button" title="Pull from JSONBin" onClick={() => sync('pull')}>↥</button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">D Vault <span>/</span> {module === 'passwords' ? 'Passwords' : 'Saved links'}</div><div className="top-actions"><button className="ghost-button" title="Push vault to JSONBin" onClick={() => sync('push')}>↥ Sync</button><button className="primary-button" onClick={openNewForm}>＋ Add {module === 'passwords' ? 'password' : 'link'}</button></div></header>
      <section className="page-heading"><div><div className="eyebrow">{module === 'passwords' ? 'Credentials, kept close' : 'Things worth coming back to'}</div><h1>{module === 'passwords' ? 'Passwords' : 'Saved links'}</h1><p>{module === 'passwords' ? 'A quiet place for the keys to your digital life.' : 'A considered collection of the good stuff you found.'}</p></div><div className="heading-count"><strong>{module === 'passwords' ? vault.passwords.length : vault.links.length}</strong><span>items</span></div></section>
      <div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${module}...`} /></label><span className="result-count">{module === 'passwords' ? filteredPasswords.length : filteredLinks.length} shown</span></div>
      <div className="collection-bar" aria-label="Collections"><span className="collection-label">Collections</span>{(module === 'passwords' ? passwordCollections : linkCollections).map((collection) => <button key={collection} className={collectionFilter === collection ? 'selected' : ''} onClick={() => setCollectionFilter(collection)}>{collection}</button>)}</div>
      {module === 'passwords' ? <div className="entry-list">{filteredPasswords.map((entry) => <article className="entry-row" key={entry.id}><div className="entry-symbol">{entry.name.slice(0, 1).toUpperCase()}</div><div className="entry-main"><h2>{entry.name}</h2><span>{entry.username || 'No username'}</span></div><div className="entry-meta"><span className="tag">{entry.category}</span><small>Updated {entry.updatedAt}</small></div><div className="entry-secret"><code>{revealed === entry.id ? entry.password : '••••••••••••'}</code><button className="text-button" onClick={() => setRevealed(revealed === entry.id ? null : entry.id)}>{revealed === entry.id ? 'Hide' : 'Reveal'}</button></div><div className="entry-actions"><button className="row-action" title="Open website" onClick={() => window.open(entry.url, '_blank')}>↗</button><button className="row-action" title="Edit password" onClick={() => editPassword(entry)}>✎</button><button className="row-action danger-action" title="Delete password" onClick={() => deletePassword(entry.id)}>×</button></div></article>)}{filteredPasswords.length === 0 && <EmptyState kind="passwords" onAdd={openNewForm} />}</div> : <div className="link-grid">{filteredLinks.map((entry) => <article className="link-card" key={entry.id}><div className="link-card-top"><span className="link-favicon">↗</span><span className="tag">{entry.tag}</span><div className="entry-actions"><button className="row-action" title="Open link" onClick={() => window.open(entry.url, '_blank')}>↗</button><button className="row-action" title="Edit link" onClick={() => editLink(entry)}>✎</button><button className="row-action danger-action" title="Delete link" onClick={() => deleteLink(entry.id)}>×</button></div></div><h2>{entry.title}</h2><a href={entry.url} target="_blank" rel="noreferrer">{entry.url.replace(/^https?:\/\//, '')}</a>{entry.note && <p>{entry.note}</p>}<footer>Saved {entry.savedAt}</footer></article>)}{filteredLinks.length === 0 && <EmptyState kind="links" onAdd={openNewForm} />}</div>}
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}><form className="modal" onSubmit={module === 'passwords' ? savePassword : saveLink}><div className="modal-header"><div><div className="eyebrow">{editingId ? 'Edit entry' : 'New entry'}</div><h2>{editingId ? 'Edit' : 'Add'} {module === 'passwords' ? 'password' : 'saved link'}</h2></div><button type="button" className="close-button" onClick={closeForm}>×</button></div>{module === 'passwords' ? <><Field label="Name" value={passwordDraft.name} onChange={(value) => setPasswordDraft({ ...passwordDraft, name: value })} placeholder="e.g. Linear" /><Field label="Username" value={passwordDraft.username} onChange={(value) => setPasswordDraft({ ...passwordDraft, username: value })} placeholder="you@example.com" /><Field label="Password" value={passwordDraft.password} onChange={(value) => setPasswordDraft({ ...passwordDraft, password: value })} placeholder="Your strongest one" type="password" /><Field label="Website" value={passwordDraft.url} onChange={(value) => setPasswordDraft({ ...passwordDraft, url: value })} placeholder="https://" /><Field label="Category" value={passwordDraft.category} onChange={(value) => setPasswordDraft({ ...passwordDraft, category: value })} placeholder="Personal, Work, Finance..." /></> : <><Field label="Title" value={linkDraft.title} onChange={(value) => setLinkDraft({ ...linkDraft, title: value })} placeholder="A useful thing" /><Field label="URL" value={linkDraft.url} onChange={(value) => setLinkDraft({ ...linkDraft, url: value })} placeholder="https://" /><Field label="Note" value={linkDraft.note} onChange={(value) => setLinkDraft({ ...linkDraft, note: value })} placeholder="Why you saved it" /><Field label="Tag" value={linkDraft.tag} onChange={(value) => setLinkDraft({ ...linkDraft, tag: value })} placeholder="Read later" /></>}<button className="primary-button full-width" type="submit">{editingId ? 'Save changes' : 'Save to D Vault'}</button></form></div>}
  </div>
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) { return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label> }
function EmptyState({ kind, onAdd }: { kind: Module; onAdd: () => void }) { return <div className="empty-state"><span>{kind === 'passwords' ? '✦' : '↗'}</span><h2>No {kind} found</h2><p>Start building your collection.</p><button className="secondary-button" onClick={onAdd}>Add your first {kind === 'passwords' ? 'password' : 'link'}</button></div> }

export default App