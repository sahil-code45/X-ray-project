import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function DoctorPendingReports() {
  const [pendingCases, setPendingCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const navigate = useNavigate();

  const fetchPendingReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/cases/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingCases(res.data.myCases || []);
    } catch (err) {
      console.error('Failed to load pending cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReports();
  }, []);

  // Filter cases based on search query
  const filteredCases = pendingCases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.patientName?.toLowerCase().includes(q) ||
      c.patientId?.toLowerCase().includes(q) ||
      String(c.patientAge).includes(q) ||
      c.patientGender?.toLowerCase().includes(q) ||
      c.studyNotes?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  });

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination calculation
  const totalItems = filteredCases.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCases = filteredCases.slice(startIndex, startIndex + pageSize);

  const modifiedCasesCount = pendingCases.filter(c => c.isModified).length;
  const wrongReportCount = pendingCases.filter(c => c.isReportWrong).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-5">
        <div>
          <div className="flex items-center flex-wrap gap-2.5">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pending Reports</h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              {pendingCases.length} Pending
            </span>
            {wrongReportCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-extrabold px-3 py-1 rounded-full border border-red-300 flex items-center gap-1.5 shadow-sm animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                {wrongReportCount} Revision Requested
              </span>
            )}
            {modifiedCasesCount > 0 && (
              <span className="bg-rose-100 text-rose-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200">
                {modifiedCasesCount} Re-uploaded / Modify
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cases claimed by you that are awaiting clinical analysis, diagnostic impressions, and final report submission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPendingReports}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition shadow-sm"
            title="Refresh list"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          <Link
            to="/doctor/open-pool"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Claim More Cases
          </Link>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2 text-gray-700">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold text-sm">Search Pending Cases</span>
          {searchQuery && (
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full">
              {totalItems} matched
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by patient name, ID, age, gender, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-sm transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 font-bold"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-amber-50/70 border-b border-amber-100">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">Patient Details</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">Study Notes</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-amber-900 uppercase tracking-wider">Claimed / Last Active</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-amber-900 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:-.2s]"></div>
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-bounce [animation-delay:-.4s]"></div>
                      <span className="text-sm font-semibold ml-2 text-gray-500">Loading pending reports...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCases.length > 0 ? (
                paginatedCases.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{c.patientName}</span>
                        {c.patientId && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {c.patientId}
                          </span>
                        )}
                        {c.isReportWrong ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            ⚠️ Report Issue
                          </span>
                        ) : c.isModified ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            Modify
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{c.patientAge} Yrs / {c.patientGender}</div>
                      {c.isReportWrong && c.reportIssueDescription && (
                        <div className="mt-1.5 text-xs text-red-800 font-medium bg-red-50 p-1.5 rounded border border-red-200 max-w-sm">
                          <strong className="text-red-900 font-bold">Center Issue:</strong> "{c.reportIssueDescription}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 max-w-md line-clamp-2">{c.studyNotes || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="font-medium text-gray-700">{new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(c.updatedAt || c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/doctor/workspace/${c.id}`)}
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow transition transform hover:-translate-y-0.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Open Workspace</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-14 text-center text-gray-500 bg-gray-50">
                    {searchQuery ? (
                      <div>
                        <p className="font-semibold text-gray-700 text-base">No pending reports matched "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-xs text-blue-600 hover:underline font-bold"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-bold text-gray-800">No Pending Reports</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          You don't have any pending reports. All claimed cases have either been submitted or you can claim fresh cases from the open pool.
                        </p>
                        <Link
                          to="/doctor/open-pool"
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition"
                        >
                          <span>Go to Open Pool Requests</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {!loading && totalItems > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 py-2 px-1">
            <span className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-700">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-gray-700">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
              <span className="font-semibold text-gray-700">{totalItems}</span> cases
            </span>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    currentPage === 1
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100 bg-white shadow-sm'
                  }`}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      currentPage === page
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    currentPage === totalPages
                      ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100 bg-white shadow-sm'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

