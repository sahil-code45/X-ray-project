import React, { useEffect, useState } from 'react';
import ReportViewer from '../components/ReportViewer';
import { downloadReportPdf, openReportPdfInNewTab } from '../utils/downloadPdf';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalDoctors: 0, approvedDoctors: 0, pendingDoctors: 0, totalCenterCases: 0, pendingCases: 0, completedCases: 0, totalPaid: 0, pendingDues: 0
  });
  const [allCases, setAllCases] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const [statsRes, casesRes] = await Promise.all([
        axios.get('http://localhost:8000/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/admin/cases', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setAllCases(casesRes.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) navigate('/login');
    }
  };

  const filteredCases = (allCases || []).filter(c => {
    const matchesSearch = 
      c.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.doctor?.doctorProfile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.studyNotes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedCases = filteredCases.slice(startIndex, startIndex + PAGE_SIZE);

  const pendingCasesCount = (stats.pendingCases !== undefined && stats.pendingCases !== null)
    ? stats.pendingCases
    : (allCases || []).filter(c => c.status !== 'completed').length;

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Admin Sub-Navbar */}
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview & Analytics</h1>
            <p className="mt-2 text-sm text-gray-500">
              Real-time platform statistics, case statuses, and clinical reports summary.
            </p>
          </div>
        </div>

        {/* Alert Banner for Pending Doctors */}
        {Number(stats.pendingDoctors) > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 sm:p-5 rounded-r-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-lg shadow-sm flex-shrink-0 mt-0.5 sm:mt-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-amber-900 flex items-center gap-2 flex-wrap">
                  <span>{stats.pendingDoctors} Doctor Registration{stats.pendingDoctors > 1 ? 's' : ''} Pending KYC Approval</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 animate-pulse">Action Required</span>
                </h3>
                <p className="text-xs text-amber-700 mt-1">
                  New doctors have submitted their KYC details and degree documents. Please review and approve their profiles.
                </p>
              </div>
            </div>
            <Link
              to="/admin-approvals"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow transition whitespace-nowrap"
            >
              Review & Approve ({stats.pendingDoctors}) &rarr;
            </Link>
          </div>
        )}

        {/* Statistics Cards */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 tracking-tight">Platform Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {/* Approved Doctors Card */}
            <Link to="/admin-doctors" className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-emerald-300 p-5 flex flex-col justify-between transition-all hover:shadow-md group">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Approved Doctors</p>
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-600 mt-3">{stats.approvedDoctors ?? stats.totalDoctors ?? 0}</p>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-3 flex items-center justify-between">
                <span>Active & Diagnosing</span>
                <span className="text-emerald-600 group-hover:translate-x-0.5 transition">&rarr;</span>
              </p>
            </Link>

            {/* Pending Doctors Card */}
            <Link to="/admin-approvals" className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col justify-between transition-all hover:shadow-md group ${Number(stats.pendingDoctors) > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-gray-100 hover:border-amber-300'}`}>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Doctors</p>
                  <span className={`p-2 rounded-lg transition ${Number(stats.pendingDoctors) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <p className="text-3xl font-extrabold text-amber-600">{stats.pendingDoctors ?? 0}</p>
                  {Number(stats.pendingDoctors) > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-md">Pending KYC</span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-amber-700 font-medium mt-3 flex items-center justify-between">
                <span>Awaiting Approval</span>
                <span className="text-amber-600 group-hover:translate-x-0.5 transition">&rarr;</span>
              </p>
            </Link>

            {/* Center Submissions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:border-purple-300 p-5 flex flex-col justify-between transition-all hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Center Submissions</p>
                  <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-3">
                  <p className="text-3xl font-extrabold text-purple-600">
                    {stats.totalCenterCases !== undefined && stats.totalCenterCases !== null ? stats.totalCenterCases : (allCases?.length || 0)}
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-md">Centers</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-3">Total patient cases</p>
            </div>

            {/* Pending Reports Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Pending Cases</p>
                  <span className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-yellow-600 mt-3">{pendingCasesCount}</p>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-3">In pool / progress</p>
            </div>

            {/* Completed Reports Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Completed Reports</p>
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-blue-600 mt-3">{stats.completedCases}</p>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-3">Finalized studies</p>
            </div>

            {/* Pending Dues Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Pending Dues</p>
                  <span className="p-2 bg-red-50 text-red-500 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-red-500 mt-3">₹{stats.pendingDues}</p>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-3">Unsettled fees</p>
            </div>

            {/* Total Paid Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Paid</p>
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-indigo-600 mt-3">₹{stats.totalPaid}</p>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-3">Settled payouts</p>
            </div>
          </div>
        </div>

        {/* Patient & Case List Section */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">All Patients & Diagnostic Cases</h2>
              <p className="text-sm text-gray-500 mt-1">Complete log of all uploaded X-Rays, assigned radiologists, and report status.</p>
            </div>
            
            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="uploaded">Open Pool</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className="bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-100 text-xs font-bold text-indigo-700">
                Total: {filteredCases.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Details</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Uploaded Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Assigned Radiologist</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Report Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCases.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{c.patientName}</span>
                        {c.patientId && (
                          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
                            {c.patientId}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{c.patientAge} Yrs / {c.patientGender}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {c.status === 'uploaded' && <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Open Pool</span>}
                      {c.status === 'in_progress' && <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>}
                      {c.status === 'completed' && <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {c.doctor ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {c.doctor.doctorProfile?.name?.charAt(0) || 'D'}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-gray-900">{c.doctor.doctorProfile?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{c.doctor.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unclaimed (Available)</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      {c.status === 'completed' && c.report ? (
                        <button 
                          onClick={() => setSelectedReport(c)}
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded shadow-sm text-sm font-bold border border-indigo-200 transition-colors"
                        >
                          View Report
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedCases.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 text-base">
                      No cases found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - 10 cases per page */}
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredCases.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-gray-900">{Math.min(startIndex + PAGE_SIZE, filteredCases.length)}</span> of <span className="font-bold text-gray-900">{filteredCases.length}</span> cases
            </div>

            <div className="inline-flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 text-sm font-semibold rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 text-sm font-bold rounded-md transition ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 text-sm font-semibold rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Report View Modal */}
        {selectedReport && selectedReport.report && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col relative">
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setSelectedReport(null)} className="bg-white rounded-full p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 shadow-md transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              <div className="p-0 overflow-y-auto flex-1 bg-gray-100">
                <ReportViewer reportData={selectedReport} />
              </div>
              
              <div className="bg-gray-200 px-6 py-4 border-t flex justify-end items-center gap-3">
                <button 
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {downloading ? 'Processing...' : 'Download PDF'}
                </button>
                <button 
                  onClick={handleOpenPdf}
                  disabled={downloading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold shadow transition flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  title="Open PDF directly in browser"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Browser
                </button>
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 font-semibold shadow transition flex items-center gap-2 text-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
                {/* <button onClick={() => setSelectedReport(null)} className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-semibold shadow transition text-sm cursor-pointer">Close</button> */}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
