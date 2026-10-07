import React, { useEffect, useState } from 'react';
import ReportViewer from '../components/ReportViewer';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalDoctors: 0, pendingCases: 0, completedCases: 0, totalPaid: 0, pendingDues: 0
  });
  const [allCases, setAllCases] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const navigate = useNavigate();

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
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview & Analytics</h1>
            <p className="mt-2 text-sm text-gray-500">
              Real-time platform statistics, case statuses, and clinical reports summary.
            </p>
          </div>
          <Link
            to="/admin-upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Upload New Case
          </Link>
        </div>

        {/* Statistics Cards */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4 tracking-tight">Platform Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-500">Active Doctors</p>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-3">{stats.totalDoctors}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-500">Pending Reports</p>
                <span className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-yellow-600 mt-3">{pendingCasesCount}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-500">Completed Reports</p>
                <span className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-green-600 mt-3">{stats.completedCases}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-500">Pending Dues</p>
                <span className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-red-500 mt-3">₹{stats.pendingDues}</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-500">Total Paid</p>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-extrabold text-indigo-600 mt-3">₹{stats.totalPaid}</p>
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
              
              <div className="bg-gray-200 px-6 py-4 border-t flex justify-end">
                <button 
                  onClick={() => {
                    window.print();
                  }}
                  className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 font-semibold shadow mr-4"
                >
                  Print Report
                </button>
                <button onClick={() => setSelectedReport(null)} className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-700 font-semibold shadow">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
