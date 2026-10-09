import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedDegree, setSelectedDegree] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedDegree(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [approvedRes, pendingRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/approved-users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/admin/pending-users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setDoctors(approvedRes.data);
      setPendingCount(pendingRes.data?.length || 0);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      } else {
        setMessage('Failed to load doctors list.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Filter & Search
  const filteredDoctors = doctors.filter(doc => {
    const q = searchQuery.toLowerCase().trim();
    const name = doc.doctorProfile?.name?.toLowerCase() || '';
    const email = doc.email?.toLowerCase() || '';
    const phone = doc.doctorProfile?.phoneNumber || '';
    const pan = doc.doctorProfile?.panCard?.toLowerCase() || '';
    const address = doc.doctorProfile?.address?.toLowerCase() || '';

    const matchesSearch = !q || 
      name.includes(q) || 
      email.includes(q) || 
      phone.includes(q) || 
      pan.includes(q) || 
      address.includes(q);

    const matchesGender = genderFilter === 'all' || doc.doctorProfile?.gender === genderFilter;

    return matchesSearch && matchesGender;
  });

  // Sort
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.doctorProfile?.name || a.email || '';
      const nameB = b.doctorProfile?.name || b.email || '';
      return nameA.localeCompare(nameB);
    }
    if (sortBy === 'fee_high') {
      return (Number(b.doctorProfile?.reportFee) || 0) - (Number(a.doctorProfile?.reportFee) || 0);
    }
    if (sortBy === 'fee_low') {
      return (Number(a.doctorProfile?.reportFee) || 0) - (Number(b.doctorProfile?.reportFee) || 0);
    }
    // newest default
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const totalPages = Math.ceil(sortedDoctors.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedDoctors = sortedDoctors.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Admin Sub-Navbar */}
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Header & Quick Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">All Doctors Directory</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage, search, and view all verified radiologists actively diagnosing on the platform.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-emerald-200 text-gray-800 px-5 py-2.5 rounded-xl shadow-sm text-center">
              <span className="block text-xs uppercase tracking-wider text-emerald-700 font-bold">Approved Doctors</span>
              <span className="font-extrabold text-2xl text-emerald-600">{doctors.length}</span>
            </div>
            <Link
              to="/admin-approvals"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm border transition text-center ${
                pendingCount > 0 
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 font-bold' 
                  : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 font-medium'
              }`}
            >
              <div>
                <span className="block text-xs uppercase tracking-wider text-amber-700 font-semibold">Pending Approvals</span>
                <span className="font-extrabold text-xl text-amber-900 leading-none">{pendingCount}</span>
              </div>
              {pendingCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ml-1"></span>
              )}
            </Link>
          </div>
        </div>

        {message && (
          <div className="p-4 rounded-md text-sm font-medium shadow-sm border-l-4 bg-red-50 text-red-700 border-red-500">
            {message}
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search doctor name, email, phone, PAN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50/60 border border-gray-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 font-bold"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters & Sorters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white"
            >
              <option value="newest">Joined: Newest First</option>
              <option value="name">Sort by Name (A-Z)</option>
              <option value="fee_high">Fee: High to Low</option>
              <option value="fee_low">Fee: Low to High</option>
            </select>

            <div className="bg-indigo-50 px-3.5 py-2 rounded-lg border border-indigo-100 text-xs font-bold text-indigo-700">
              Found: {sortedDoctors.length}
            </div>
          </div>
        </div>

        {/* Doctors Table */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 mb-12">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor Info</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact & Address</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee & Verification</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDoctors.map(u => {
                  const docName = u.doctorProfile?.name || 'Dr. ' + (u.email?.split('@')[0] || 'Unknown');
                  const degreeFile = u.doctorProfile?.degreeFileUrl;

                  return (
                    <tr key={u.id} className="hover:bg-indigo-50/40 transition-colors">
                      {/* Doctor Info */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                            {docName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{docName}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {u.doctorProfile?.age ? `${u.doctorProfile.age} Yrs` : ''} 
                              {u.doctorProfile?.gender ? ` • ${u.doctorProfile.gender}` : ''}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                              Joined: {new Date(u.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {u.email}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center">
                          <svg className="w-3.5 h-3.5 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {u.doctorProfile?.phoneNumber || 'N/A'}
                        </div>
                        {u.doctorProfile?.address && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={u.doctorProfile.address}>
                            📍 {u.doctorProfile.address}
                          </div>
                        )}
                      </td>

                      {/* Fee & Verification */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-extrabold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-md inline-block border border-green-200 mb-1.5">
                          Fee: ₹{u.doctorProfile?.reportFee || 0} / report
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-semibold text-gray-500">PAN:</span> {u.doctorProfile?.panCard || 'N/A'}
                        </div>
                        {u.doctorProfile?.aadhaarCard && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            <span className="font-semibold text-gray-500">Aadhaar:</span> {u.doctorProfile.aadhaarCard}
                          </div>
                        )}
                        {degreeFile && (
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedDegree({
                                url: `${API_BASE_URL}/${degreeFile.replace(/\\/g, '/')}`,
                                doctorName: docName
                              })}
                              className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-100 transition shadow-sm cursor-pointer"
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Degree
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                          <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full"></span>
                          Active
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/admin-payouts/${u.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition text-xs shadow-sm"
                        >
                          Payouts
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {sortedDoctors.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {searchQuery ? (
                        <div>
                          <p className="text-base font-bold text-gray-800">No doctors found matching "{searchQuery}"</p>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs text-indigo-600 hover:underline font-bold"
                          >
                            Clear Search
                          </button>
                        </div>
                      ) : (
                        <p className="text-base font-bold text-gray-800">No active doctors registered yet.</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - 8 doctors per page */}
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{sortedDoctors.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-gray-900">{Math.min(startIndex + PAGE_SIZE, sortedDoctors.length)}</span> of <span className="font-bold text-gray-900">{sortedDoctors.length}</span> doctors
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
      {/* Degree Certificate Modal */}
      {selectedDegree && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDegree(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative border border-gray-200 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shadow-inner">
                  📜
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Medical Degree / Registration Certificate
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedDegree.doctorName}
                  </p>
                </div>
              </div>

              {/* Cross Close Button */}
              <button
                type="button"
                onClick={() => setSelectedDegree(null)}
                className="w-9 h-9 rounded-full bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center shadow-sm border border-gray-200 transition-colors focus:outline-none"
                title="Close (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-100/70 flex items-center justify-center min-h-[350px]">
              {selectedDegree.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={selectedDegree.url}
                  title="Degree Certificate Document"
                  className="w-full h-[65vh] rounded-lg border border-gray-300 bg-white shadow-inner"
                />
              ) : (
                <div className="max-w-full max-h-[65vh] flex items-center justify-center">
                  <img
                    src={selectedDegree.url}
                    alt={`Degree of ${selectedDegree.doctorName}`}
                    className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md border border-gray-200 bg-white"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <a
                href={selectedDegree.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Full Window / Download
              </a>

              <button
                type="button"
                onClick={() => setSelectedDegree(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

