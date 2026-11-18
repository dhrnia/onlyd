import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  X,
  ExternalLink,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const STATUSES = ['Applied', 'Interviewing', 'Offered', 'Rejected'];

const SOURCE_SUGGESTIONS = ['LinkedIn', 'Career Page', 'Indeed', 'Wellfound', 'Referral', 'Email', 'Other'];

export function JobsApp() {
  const { data, addJobApplication, updateJobApplication, deleteJobApplication, navigateTo } = useApp();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [form, setForm] = useState({
    company: '',
    role: '',
    source: 'LinkedIn',
    roundsReached: 'Applied',
    status: 'Applied',
    notes: '',
    appliedDate: new Date().toISOString().slice(0, 10)
  });

  const jobs = data.jobs || [];

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const q = search.toLowerCase();
      const match =
        (j.company || '').toLowerCase().includes(q) ||
        (j.role || '').toLowerCase().includes(q) ||
        (j.source || '').toLowerCase().includes(q) ||
        (j.roundsReached || '').toLowerCase().includes(q) ||
        (j.notes || '').toLowerCase().includes(q);
      if (!match) return false;
      if (selectedStatus !== 'all' && j.status !== selectedStatus) return false;
      return true;
    });
  }, [jobs, search, selectedStatus]);

  const openAddModal = () => {
    setEditingJob(null);
    setForm({
      company: '',
      role: '',
      source: 'LinkedIn',
      roundsReached: 'Applied',
      status: 'Applied',
      notes: '',
      appliedDate: new Date().toISOString().slice(0, 10)
    });
    setIsModalOpen(true);
  };

  const openEditModal = (job) => {
    setEditingJob(job);
    setForm({
      company: job.company || '',
      role: job.role || '',
      source: job.source || 'LinkedIn',
      roundsReached: job.roundsReached || 'Applied',
      status: job.status || 'Applied',
      notes: job.notes || '',
      appliedDate: job.appliedDate || new Date().toISOString().slice(0, 10)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;

    if (editingJob) {
      updateJobApplication(editingJob.id, form);
    } else {
      addJobApplication(form);
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
            Job Applications
          </h1>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Application</span>
        </button>
      </div>

      {/* Snapshot Counts */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50">Total Applications</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">{jobs.length}</div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50">Interviewing</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {jobs.filter(j => j.status === 'Interviewing').length}
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50">Offers</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {jobs.filter(j => j.status === 'Offered').length}
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-black/50">Rejected</div>
          <div className="mt-1.5 text-2xl font-extrabold text-black">
            {jobs.filter(j => j.status === 'Rejected').length}
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              type="text"
              placeholder="Search by company, role, source, rounds..."
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

          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-black/10 bg-white p-1 shadow-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === 'all'
                  ? 'bg-black text-white'
                  : 'text-black/60 hover:bg-black/5 hover:text-black'
              }`}
            >
              All ({jobs.length})
            </button>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedStatus === s
                    ? 'bg-black text-white'
                    : 'text-black/60 hover:bg-black/5 hover:text-black'
                }`}
              >
                {s} ({jobs.filter(j => j.status === s).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Job Applications */}
      <div className="mt-6">
        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-xs text-black/50">
            <Briefcase size={32} className="mx-auto text-black/30" />
            <h3 className="mt-3 text-sm font-bold text-black">No job applications found</h3>
            <p className="mt-1">
              {search || selectedStatus !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Track your career journey by adding your first job application above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map(job => {
              const isOffered = job.status === 'Offered';
              const isInterviewing = job.status === 'Interviewing';
              const isRejected = job.status === 'Rejected';

              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-xs hover:border-black/30 transition group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-base text-black tracking-tight">
                            {job.company}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-black/70 mt-0.5">
                          {job.role}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(job)}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete application for ${job.company}?`)) {
                              deleteJobApplication(job.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-black transition"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="mt-4 space-y-2 rounded-xl border border-black/5 bg-[#f7f7f5] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-black/50">Source</span>
                        <span className="font-semibold text-black">{job.source || 'Direct'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-black/50">Rounds Reached</span>
                        <span className="font-semibold text-black">{job.roundsReached || 'Initial'}</span>
                      </div>
                    </div>

                    {job.notes && (
                      <p className="mt-3 text-xs text-black/60 italic line-clamp-3">
                        "{job.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-black/5 pt-3 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-black/40">
                      Applied {new Date(job.appliedDate || job.createdAt || Date.now()).toLocaleDateString('en-IN')}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isOffered
                          ? 'bg-black text-white shadow-xs'
                          : isInterviewing
                          ? 'border border-black text-black font-extrabold'
                          : isRejected
                          ? 'bg-black/10 text-black/60'
                          : 'border border-black/15 text-black/70'
                      }`}
                    >
                      {job.status}
                    </span>
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
          <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="text-sm font-bold text-black">
                {editingJob ? 'Edit Application' : 'Add Job Application'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-black/40 hover:text-black">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-black mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Stripe, Razorpay"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Engineer, Product Designer"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Source</label>
                <input
                  type="text"
                  placeholder="e.g. LinkedIn, Career Page, Referral"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {SOURCE_SUGGESTIONS.slice(0, 4).map(src => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setForm({ ...form, source: src })}
                      className="rounded-lg border border-black/10 bg-[#f7f7f5] px-2 py-0.5 text-[10px] text-black/70 hover:bg-black/10"
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-black mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black mb-1">Date</label>
                  <input
                    type="date"
                    value={form.appliedDate}
                    onChange={(e) => setForm({ ...form, appliedDate: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Rounds Reached</label>
                <input
                  type="text"
                  placeholder="e.g. Resume Screen, Tech Round 1, System Design, HR"
                  value={form.roundsReached}
                  onChange={(e) => setForm({ ...form, roundsReached: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Recruiter contacts, salary discussed, interview impressions..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-black/15 bg-white p-2.5 text-xs text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
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
                  {editingJob ? 'Save Changes' : 'Save Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
