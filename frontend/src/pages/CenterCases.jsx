import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ReportViewer from '../components/ReportViewer';
import SomethingWrongModal from '../components/SomethingWrongModal';
import { downloadReportPdf, openReportPdfInNewTab } from '../utils/downloadPdf';
import { API_BASE_URL } from '../config';

export default function CenterCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [somethingWrongCase, setSomethingWrongCase] = useState(null);
  const [isSomethingWrongOpen, setIsSomethingWrongOpen] = useState(false);
  const [wrongReportText, setWrongReportText] = useState('');
  const [submittingWrongReport, setSubmittingWrongReport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

  const handleSubmitWrongReport = async () => {
    if (!wrongReportText.trim()) {
      toast.warning('Please describe the problem with this report before submitting.');
      return;
    }
    try {
      setSubmittingWrongReport(true);
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/cases/${selectedReport.id}/report-wrong-report`, {
        issueDescription: wrongReportText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Report issue submitted to doctor successfully! The case has been sent for revision.');
      setIsSomethingWrongOpen(false);
      setWrongReportText('');
      setSelectedReport(null);
      fetchCases();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit issue to doctor');
    } finally {
      setSubmittingWrongReport(false);
    }
  };

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

  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/cases/center/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(res.data || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filteredCases = cases.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      (c.patientName && c.patientName.toLowerCase().includes(q)) ||
      (c.patientId && c.patientId.toLowerCase().includes(q)) ||
      (c.studyNotes && c.studyNotes.toLowerCase().includes(q));
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'report_revision' ? c.isReportWrong : 
      (statusFilter === 'in_progress' ? (c.status === 'in_progress' && !c.isReportWrong) : c.status === statusFilter));
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE) || 1;
  const paginatedCases = filteredCases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="bg-transparent h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Diagnostic Center Portal
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Patient Cases Directory</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track radiologist diagnostic status and access finalized clinical reports.
          </p>
        </div>
        <Link
          to="/center"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Upload New Patient Case
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by Patient Name or ID..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All (${cases.length})` },
            { id: 'uploaded', label: `In Pool (${cases.filter(c => c.status === 'uploaded').length})` },
            { id: 'in_progress', label: `Diagnosing (${cases.filter(c => c.status === 'in_progress' && !c.isReportWrong).length})` },
            { id: 'report_revision', label: `Revision Requested (${cases.filter(c => c.isReportWrong).length})` },
            { id: 'something_wrong', label: `Doc Issue (${cases.filter(c => c.status === 'something_wrong').length})` },
            { id: 'completed', label: `Completed (${cases.filter(c => c.status === 'completed' && !c.isReportWrong).length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient Details</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinical Notes</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Doctor</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Report Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedCases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{c.patientName}</div>
                    <div className="text-xs text-gray-500">
                      ID: <span className="font-mono">{c.patientId || `PID-${c.id}`}</span> • {c.patientAge}y / {c.patientGender}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {c.studyNotes || 'Routine X-Ray study'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {c.doctor ? (
                      <div>
                        <div className="font-medium text-gray-900">{c.doctor.doctorProfile?.name || 'Dr. Assigned'}</div>
                        <div className="text-xs text-gray-400">{c.doctor.email}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Unassigned (In Open Pool)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {c.isReportWrong ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse mr-1.5"></span>
                        Revision Requested
                      </span>
                    ) : c.status === 'something_wrong' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5"></span>
                        Something Wrong
                      </span>
                    ) : c.status === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                        Report Ready
                      </span>
                    ) : c.status === 'in_progress' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                        Doctor Diagnosing
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                        Awaiting Doctor
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {c.isReportWrong ? (
                      <button
                        onClick={() => {
                          setSelectedReport(c);
                          setIsSomethingWrongOpen(true);
                          setWrongReportText(c.reportIssueDescription || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                        title="View report and edit revision issue"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Revision Sent (View)
                      </button>
                    ) : c.status === 'something_wrong' ? (
                      <button
                        onClick={() => setSomethingWrongCase(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Something Wrong
                      </button>
                    ) : c.status === 'completed' && c.report ? (
                      <button
                        onClick={() => {
                          setSelectedReport(c);
                          setIsSomethingWrongOpen(false);
                          setWrongReportText('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View / Print Report
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Report Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {paginatedCases.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Loading cases...' : 'No patient cases found matching your filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredCases.length)} of {filteredCases.length} cases
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between gap-4">
              <div className="min-w-0 flex-shrink-0">
                <h3 className="text-lg font-bold">Diagnostic Radiology Report</h3>
                <p className="text-xs text-gray-300">
                  Patient: {selectedReport.patientName} (ID: {selectedReport.patientId || selectedReport.id})
                </p>
              </div>
              <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
                {/* Something Wrong Checkbox/Button Option - before Download PDF */}
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-700/70 rounded text-xs font-bold transition cursor-pointer select-none whitespace-nowrap flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSomethingWrongOpen}
                    onChange={(e) => {
                      setIsSomethingWrongOpen(e.target.checked);
                      if (!e.target.checked) setWrongReportText('');
                    }}
                    className="w-3.5 h-3.5 text-red-600 rounded border-red-400 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Something Wrong
                  </span>
                </label>

                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0"
                  title="Download PDF File"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloading ? 'Processing...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleOpenPdf}
                  disabled={downloading}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap flex-shrink-0"
                  title="Open PDF directly in browser"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Browser
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setIsSomethingWrongOpen(false);
                    setWrongReportText('');
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition cursor-pointer flex-shrink-0 ml-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Expandable Problem Description Section when Something Wrong is checked */}
            {isSomethingWrongOpen && (
              <div className="bg-red-50 border-b border-red-200 p-4 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                    <span className="text-xs font-black text-red-900 uppercase tracking-wide">
                      Report Problem to Doctor / Radiologist
                    </span>
                  </div>
                  <p className="text-xs text-red-700 font-medium">
                    Describe what is wrong with this diagnostic report (e.g. incorrect findings, wrong body part reported, missing impression, spelling/patient detail mistake). The doctor will see this feedback in their workspace to modify and re-submit the corrected report.
                  </p>
                  <textarea
                    rows="3"
                    value={wrongReportText}
                    onChange={(e) => setWrongReportText(e.target.value)}
                    placeholder="Enter detailed problem description for the doctor..."
                    className="w-full p-2.5 bg-white border border-red-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-inner"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSubmitWrongReport}
                      disabled={submittingWrongReport}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {submittingWrongReport ? 'Submitting Issue...' : 'Submit Issue to Doctor'}
                    </button>
                    <button
                      onClick={() => {
                        setIsSomethingWrongOpen(false);
                        setWrongReportText('');
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <ReportViewer reportData={selectedReport} />
            </div>
          </div>
        </div>
      )}

      {/* Something Wrong Notice & Re-upload Modal */}
      {somethingWrongCase && (
        <SomethingWrongModal
          caseData={somethingWrongCase}
          onClose={() => setSomethingWrongCase(null)}
          onSuccess={fetchCases}
        />
      )}
    </div>
  );
}

