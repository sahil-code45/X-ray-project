import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReportViewer from '../components/ReportViewer';
import { downloadReportPdf, openReportPdfInNewTab } from '../utils/downloadPdf';

export default function DoctorCompletedReports() {
  const [completedCases, setCompletedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const navigate = useNavigate();

  const handleDownloadPdf = async () => {
    if (!selectedReport) return;
    try {
      setDownloading(true);
      await downloadReportPdf(selectedReport);
    } catch (err) {
      console.error('Download PDF error:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!selectedReport) return;
    try {
      setDownloading(true);
      await openReportPdfInNewTab(selectedReport);
    } catch (err) {
      console.error('Open PDF error:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const fetchCompletedReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/cases/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompletedCases(res.data.completedCases || []);
    } catch (err) {
      console.error('Failed to load completed reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedReports();
  }, []);

  // Filter cases based on search query
  const filteredCases = completedCases.filter((c) => {
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

  const handleEditRedirect = (caseId) => {
    setSelectedReport(null);
    navigate(`/doctor/workspace/${caseId}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 min-h-[85vh] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Completed Reports</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {completedCases.length} Total
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Log of all patient X-rays diagnosed and reported by you. View and edit diagnostic reports anytime.
          </p>
        </div>

        <button
          onClick={fetchCompletedReports}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          title="Refresh list"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2 text-gray-700">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-bold text-sm">Search Reports</span>
          {searchQuery && (
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
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
            className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
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
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Details</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Study Notes</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reported Date</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Report Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-.2s]"></div>
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-.4s]"></div>
                      <span className="text-sm font-semibold ml-2 text-gray-500">Loading reports...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCases.length > 0 ? (
                paginatedCases.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{c.patientName}</span>
                        {c.patientId && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded">
                            {c.patientId}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{c.patientAge} Yrs / {c.patientGender}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 max-w-md line-clamp-2">{c.studyNotes || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(c.updatedAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {c.report ? (
                          <>
                            <button
                              onClick={() => setSelectedReport(c)}
                              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 transition shadow-sm flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Report
                            </button>

                            <button
                              onClick={() => handleEditRedirect(c.id)}
                              className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-200 transition shadow-sm flex items-center gap-1"
                              title="Edit Report"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No report filed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                    {searchQuery ? (
                      <div>
                        <p className="font-semibold text-gray-700">No completed reports matched "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-xs text-blue-600 hover:underline font-bold"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-semibold text-gray-700">No completed reports found</p>
                        <p className="text-xs text-gray-400 mt-1">Claim open cases from the sidebar and submit diagnosis from workspace.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (Limit 8) */}
        {totalItems > 0 && (
          <div className="bg-white px-4 py-3 border border-gray-200 border-t-0 rounded-b-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="text-xs text-gray-600 font-medium">
              Showing <span className="font-bold text-gray-900">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-gray-900">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
              <span className="font-bold text-gray-900">{totalItems}</span> reports
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report View Modal with Edit Button */}
      {selectedReport && selectedReport.report && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col relative">
            {/* Top Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-800 text-base">Diagnostic Report Details</span>
                {selectedReport.patientId && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                    {selectedReport.patientId}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="bg-white rounded-full p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-200 transition"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-0 overflow-y-auto flex-1 bg-gray-100">
              <ReportViewer reportData={selectedReport} />
            </div>

            {/* Modal Footer with Edit Option */}
            <div className="bg-gray-200 px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleEditRedirect(selectedReport.id)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2 transition transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Report
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloading ? 'Processing...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleOpenPdf}
                  disabled={downloading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  title="Open PDF directly in browser"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Browser
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
                {/* <button
                  onClick={() => setSelectedReport(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-5 py-2 rounded-lg font-semibold text-sm shadow transition cursor-pointer"
                >
                  Close
                </button> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

