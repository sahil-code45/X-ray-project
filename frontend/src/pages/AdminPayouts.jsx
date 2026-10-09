import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import { API_BASE_URL } from '../config';

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState([]);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;
  const navigate = useNavigate();

  const fetchPayouts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/payouts/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayouts(res.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      } else {
        setMessage('Failed to load payouts.');
      }
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  // Global platform metrics
  const totalPending = payouts.reduce((sum, p) => p.status === 'pending' ? sum + Number(p.amount) : sum, 0);
  const totalPaid = payouts.reduce((sum, p) => p.status === 'paid' ? sum + Number(p.amount) : sum, 0);

  // Group payouts by doctor so each doctor appears only once
  const doctorGroupMap = {};
  payouts.forEach(p => {
    const docId = p.doctorId || (p.doctor ? p.doctor.id : 'unknown');
    if (!doctorGroupMap[docId]) {
      doctorGroupMap[docId] = {
        doctorId: docId,
        doctor: p.doctor,
        payouts: [],
        totalAmount: 0,
        pendingCount: 0,
        paidCount: 0,
        pendingAmount: 0,
        paidAmount: 0
      };
    }

    const group = doctorGroupMap[docId];
    group.payouts.push(p);
    const amt = Number(p.amount) || 0;
    group.totalAmount += amt;

    if (p.status === 'pending') {
      group.pendingCount += 1;
      group.pendingAmount += amt;
    } else if (p.status === 'paid') {
      group.paidCount += 1;
      group.paidAmount += amt;
    }
  });

  const doctorGroups = Object.values(doctorGroupMap);

  // Filter doctor groups
  const filteredDoctorGroups = doctorGroups.filter(g => {
    const docName = g.doctor?.doctorProfile?.name || '';
    const docEmail = g.doctor?.email || '';
    const matchesSearch = 
      docName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      docEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(g.doctorId).includes(searchTerm);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return g.pendingCount > 0;
    if (statusFilter === 'paid') return g.pendingCount === 0;
    return true;
  });

  const totalPages = Math.ceil(filteredDoctorGroups.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedDoctorGroups = filteredDoctorGroups.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Admin Sub-Navbar */}
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        {/* Page Header & Overall Summary Cards */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Doctor Settlements</h1>
            <p className="mt-2 text-sm text-gray-500">
              Aggregated doctor payout accounts. Click on any doctor to view their individual settlement items.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="bg-white border border-gray-200 text-gray-800 px-5 py-3 rounded-xl shadow-sm min-w-[130px]">
              <span className="block text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Paid</span>
              <span className="font-extrabold text-2xl text-green-600">₹{totalPaid}</span>
            </div>
            <div className="bg-white border border-gray-200 text-gray-800 px-5 py-3 rounded-xl shadow-sm min-w-[130px]">
              <span className="block text-xs text-gray-500 font-semibold uppercase tracking-wider">Pending Dues</span>
              <span className="font-extrabold text-2xl text-amber-600">₹{totalPending}</span>
            </div>
            <div className="bg-white border border-gray-200 text-gray-800 px-5 py-3 rounded-xl shadow-sm min-w-[130px]">
              <span className="block text-xs text-gray-500 font-semibold uppercase tracking-wider">Active Doctors</span>
              <span className="font-extrabold text-2xl text-indigo-600">{doctorGroups.length}</span>
            </div>
          </div>
        </div>

        {message && (
          <div className="p-4 rounded-md text-sm font-medium shadow-sm border-l-4 bg-red-50 text-red-700 border-red-500">
            {message}
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                statusFilter === 'all' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Doctors ({doctorGroups.length})
            </button>
            <button
              onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                statusFilter === 'pending' 
                  ? 'bg-amber-600 text-white shadow-sm' 
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              With Pending Dues ({doctorGroups.filter(g => g.pendingCount > 0).length})
            </button>
            <button
              onClick={() => { setStatusFilter('paid'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                statusFilter === 'paid' 
                  ? 'bg-green-600 text-white shadow-sm' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              Fully Settled ({doctorGroups.filter(g => g.pendingCount === 0).length})
            </button>
          </div>

          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search doctor by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Grouped Doctors Table */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 mb-12">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cases Count
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Total Earned
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Pending Dues
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDoctorGroups.map(group => {
                  const docDisplayName = group.doctor?.doctorProfile?.name || group.doctor?.email?.split('@')[0] || `Doctor #${group.doctorId}`;
                  const docEmail = group.doctor?.email || `Doc ID: ${group.doctorId}`;

                  return (
                    <tr key={group.doctorId} className="hover:bg-indigo-50/40 transition-colors">
                      {/* Doctor Details */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white font-bold flex items-center justify-center shadow-sm">
                            {docDisplayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{docDisplayName}</div>
                            <div className="text-xs text-gray-500">{docEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Total Cases */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold">
                          {group.payouts.length} {group.payouts.length === 1 ? 'Case' : 'Cases'}
                        </span>
                      </td>

                      {/* Total Earned */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-extrabold text-gray-900">₹{group.totalAmount.toFixed(2)}</div>
                      </td>

                      {/* Paid */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-green-600">₹{group.paidAmount.toFixed(2)}</div>
                        <div className="text-xs text-gray-400 font-medium">({group.paidCount} paid)</div>
                      </td>

                      {/* Pending Dues */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className={`text-sm font-bold ${group.pendingAmount > 0 ? 'text-amber-600 font-extrabold' : 'text-gray-400'}`}>
                          ₹{group.pendingAmount.toFixed(2)}
                        </div>
                      </td>

                      {/* Status Column with Pending Count */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        {group.pendingCount > 0 ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm animate-pulse">
                            <span className="w-2 h-2 mr-1.5 bg-amber-500 rounded-full"></span>
                            {group.pendingCount} Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                            <svg className="w-3.5 h-3.5 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            All Settled (0 Pending)
                          </span>
                        )}
                      </td>

                      {/* Action - View List Option Route to Detail */}
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/admin-payouts/${group.doctorId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition text-xs"
                        >
                          View List
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filteredDoctorGroups.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-lg font-bold text-gray-800">No Doctor Settlements Found</p>
                      <p className="text-sm text-gray-500 mt-1">No doctor payouts match your current search/filter.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - 8 doctor settlements per page */}
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredDoctorGroups.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-gray-900">{Math.min(startIndex + PAGE_SIZE, filteredDoctorGroups.length)}</span> of <span className="font-bold text-gray-900">{filteredDoctorGroups.length}</span> doctors
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
      </div>
    </div>
  );
}
