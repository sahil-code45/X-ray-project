import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';

export default function CenterDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return navigate('/login');

      const res = await axios.get(`${API_BASE_URL}/api/cases/center/drafts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrafts(res.data || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      } else {
        toast.error('Failed to load draft cases from machine sync.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDeleteDraft = async (draftId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this machine-synced draft scan?')) return;
    try {
      setDeletingId(draftId);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/cases/draft/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Draft scan removed.');
      setDrafts(prev => prev.filter(d => d.id !== draftId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete draft');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectDraft = (draft) => {
    // Navigate to CenterUpload form with draftId
    navigate(`/center/upload?draftId=${draft.id}`);
  };

  const filteredDrafts = drafts.filter(d => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (d.patientName && d.patientName.toLowerCase().includes(q)) ||
      (d.patientId && d.patientId.toLowerCase().includes(q)) ||
      (d.testName && d.testName.toLowerCase().includes(q)) ||
      (d.studyNotes && d.studyNotes.toLowerCase().includes(q));

    const matchesModality = 
      modalityFilter === 'all' || 
      (d.modality && d.modality.toLowerCase() === modalityFilter.toLowerCase());

    return matchesSearch && matchesModality;
  });

  const mriCount = drafts.filter(d => d.modality === 'MRI').length;
  const ctCount = drafts.filter(d => d.modality === 'CT').length;

  return (
    <div className="bg-transparent h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            Machine Ingest Gateway
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Machine Ingest & Drafts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Incoming MRI & CT scans synced directly from modality console / Orthanc PACS. Click any draft to review and assign to the radiologist pool.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDrafts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg border border-gray-200 shadow-sm transition text-sm"
            title="Refresh drafts from sync gateway"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link
            to="/center/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition text-sm"
          >
            + New Manual Case
          </Link>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">Total Incoming Drafts</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{drafts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            📥
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-purple-600 tracking-wider">MRI Scans Synced</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{mriCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
            MRI
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase text-cyan-600 tracking-wider">CT Scans Synced</p>
            <p className="text-2xl font-black text-cyan-700 mt-1">{ctCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-xs">
            CT
          </div>
        </div>
      </div>

      {/* Search & Modality Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by Patient Name, ID, Study..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase text-gray-400 mr-1">Filter Modality:</span>
          {['all', 'MRI', 'CT', 'X-Ray'].map((m) => (
            <button
              key={m}
              onClick={() => setModalityFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                modalityFilter.toLowerCase() === m.toLowerCase()
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m === 'all' ? 'All' : m}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts List / Cards */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-500 text-sm">Checking machine sync drafts...</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            📡
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Draft Scans Found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
            {searchTerm || modalityFilter !== 'all'
              ? 'No draft studies match your filter criteria.'
              : 'When your MRI or CT machine sends a scan to Orthanc/Sync Gateway, it will appear here automatically for review before sending to doctors.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={fetchDrafts}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
            >
              Check Again
            </button>
            <Link
              to="/center/upload"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
            >
              Register Case Manually
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDrafts.map((draft) => {
            const isMri = draft.modality === 'MRI';
            const isCt = draft.modality === 'CT';
            const modalityBadgeClass = isMri
              ? 'bg-purple-100 text-purple-800 border-purple-200'
              : isCt
              ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
              : 'bg-blue-100 text-blue-800 border-blue-200';

            const totalSlices = draft.dicomInfo?.totalSlices;
            const scanner = draft.dicomInfo?.metadata?.scannerModel || draft.dicomInfo?.metadata?.manufacturer;

            return (
              <div
                key={draft.id}
                onClick={() => handleSelectDraft(draft)}
                className="bg-white rounded-xl border border-gray-200 hover:border-indigo-400 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Left: Patient and Study Summary */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
                    isMri ? 'bg-purple-50 text-purple-600' : isCt ? 'bg-cyan-50 text-cyan-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {draft.modality || 'SCAN'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition">
                        {draft.patientName || 'Unnamed Patient'}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${modalityBadgeClass}`}>
                        {draft.modality || 'General'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        ⚡ Machine Draft
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 font-medium">
                      {draft.testName || draft.studyNotes || 'Direct Modality Acquisition'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-1">
                      {draft.patientId && (
                        <span>
                          <strong className="text-gray-500 font-medium">ID:</strong> {draft.patientId}
                        </span>
                      )}
                      {(draft.patientAge || draft.patientGender) && (
                        <span>
                          <strong className="text-gray-500 font-medium">Demographics:</strong> {draft.patientAge ? `${draft.patientAge} Yrs` : ''} {draft.patientGender ? `(${draft.patientGender})` : ''}
                        </span>
                      )}
                      {totalSlices && (
                        <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                          📁 {totalSlices} Slices
                        </span>
                      )}
                      {scanner && (
                        <span className="text-gray-500">
                          Scanner: {scanner}
                        </span>
                      )}
                      <span>
                        Received: {new Date(draft.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  <button
                    onClick={(e) => handleDeleteDraft(draft.id, e)}
                    disabled={deletingId === draft.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete Draft"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <button
                    onClick={() => handleSelectDraft(draft)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition group-hover:scale-[1.02]"
                  >
                    <span>Review & Send to Doctor</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

