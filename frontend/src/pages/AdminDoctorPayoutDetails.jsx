import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';

export default function AdminDoctorPayoutDetails() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [payouts, setPayouts] = useState([]);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [refInput, setRefInput] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchCase, setSearchCase] = useState('');

  // Pagination state - 8 per page
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  const fetchDoctorPayouts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8000/api/payouts/admin/doctor/${doctorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayouts(res.data);
      if (res.data.length > 0 && res.data[0].doctor) {
        setDoctorInfo(res.data[0].doctor);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      } else {
        setMessage('Failed to load payouts for this doctor.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorPayouts();
  }, [doctorId]);

  const handlePay = async (id) => {
    const transactionRef = refInput[id];
    if (!transactionRef || !transactionRef.trim()) {
      return alert('Please enter transaction reference (UTR / Reference Number)');
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/payouts/admin/${id}/pay`, { transactionRef }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`Payout #${id} marked as paid successfully!`);
      // Clear input
      setRefInput(prev => ({ ...prev, [id]: '' }));
      fetchDoctorPayouts();
    } catch (error) {
      setMessage('Payment update failed.');
    }
  };

  // Filtered list
  const filteredPayouts = payouts.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = 
      !searchCase ||
      String(p.id).includes(searchCase) ||
      String(p.caseId).includes(searchCase) ||
      (p.xrayCase?.patientName && p.xrayCase.patientName.toLowerCase().includes(searchCase.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredPayouts.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedPayouts = filteredPayouts.slice(startIndex, startIndex + PAGE_SIZE);

  // Totals for this doctor
  const totalPending = payouts.reduce((sum, p) => p.status === 'pending' ? sum + Number(p.amount) : sum, 0);
  const totalPaid = payouts.reduce((sum, p) => p.status === 'paid' ? sum + Number(p.amount) : sum, 0);
  const pendingCount = payouts.filter(p => p.status === 'pending').length;
  const paidCount = payouts.filter(p => p.status === 'paid').length;

  const doctorName = doctorInfo?.doctorProfile?.name || doctorInfo?.email?.split('@')[0] || `Doctor #${doctorId}`;

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Admin Sub-Navbar */}
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        {/* Navigation Breadcrumbs & Back Button */}
        <div className="flex items-center justify-between">
          <Link
            to="/admin-payouts"
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Doctor Settlements
          </Link>
          <span className="text-xs text-gray-400 font-mono">Doctor ID: #{doctorId}</span>
        </div>

        {/* Doctor Header & Metrics Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
                {doctorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{doctorName}</h1>
                <p className="text-sm text-gray-500">{doctorInfo?.email}</p>
                {doctorInfo?.doctorProfile?.phoneNumber && (
                  <p className="text-xs text-gray-400 mt-0.5">Contact: {doctorInfo.doctorProfile.phoneNumber}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl shadow-sm text-center min-w-[120px]">
                <span className="block text-xs uppercase tracking-wider text-amber-600 font-semibold">Pending Dues</span>
                <span className="font-extrabold text-xl text-amber-700">₹{totalPending}</span>
                <span className="block text-[11px] text-amber-600 font-medium">({pendingCount} cases)</span>
              </div>

              <div className="bg-green-50 border border-green-200 text-green-900 px-4 py-2.5 rounded-xl shadow-sm text-center min-w-[120px]">
                <span className="block text-xs uppercase tracking-wider text-green-600 font-semibold">Total Paid</span>
                <span className="font-extrabold text-xl text-green-700">₹{totalPaid}</span>
                <span className="block text-[11px] text-green-600 font-medium">({paidCount} cases)</span>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-xl shadow-sm text-center min-w-[120px]">
                <span className="block text-xs uppercase tracking-wider text-indigo-600 font-semibold">Total Earned</span>
                <span className="font-extrabold text-xl text-indigo-700">₹{totalPending + totalPaid}</span>
                <span className="block text-[11px] text-indigo-600 font-medium">({payouts.length} total)</span>
              </div>
            </div>
          </div>

          {/* Feedback Alert */}
          {message && (
            <div className={`mt-4 p-4 rounded-md text-sm font-medium shadow-sm border-l-4 ${
              message.includes('successfully') || message.includes('paid') 
                ? 'bg-green-50 text-green-700 border-green-500' 
                : 'bg-red-50 text-red-700 border-red-500'
            }`}>
              {message}
            </div>
          )}

          {/* Search & Filters */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'all' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({payouts.length})
              </button>
              <button
                onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'pending' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => { setStatusFilter('paid'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  statusFilter === 'paid' 
                    ? 'bg-green-600 text-white shadow-sm' 
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                Paid ({paidCount})
              </button>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by case ID or patient..."
                value={searchCase}
                onChange={(e) => { setSearchCase(e.target.value); setCurrentPage(1); }}
                className="w-full px-3.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Detailed Payouts Table */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payout ID</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Case Details</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action / Ref</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPayouts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-gray-900">
                      #{p.id}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {p.xrayCase?.patientName ? p.xrayCase.patientName : `Case #${p.caseId}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Case ID: <span className="font-mono font-medium">#{p.caseId}</span>
                        {p.xrayCase?.patientAge && ` • ${p.xrayCase.patientAge} Yrs / ${p.xrayCase.patientGender}`}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">₹{p.amount}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        p.status === 'paid' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {p.status === 'paid' ? 'PAID' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      {p.status === 'pending' ? (
                        <div className="flex items-center justify-end space-x-2">
                          <input 
                            type="text" 
                            placeholder="UTR/Ref No." 
                            value={refInput[p.id] || ''}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-36 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            onChange={(e) => setRefInput({ ...refInput, [p.id]: e.target.value })}
                          />
                          <button 
                            onClick={() => handlePay(p.id)} 
                            className="inline-flex items-center px-4 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                          >
                            Mark Paid
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 flex items-center justify-end">
                          <svg className="w-4 h-4 mr-1.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Ref: <span className="font-mono font-bold text-gray-800 ml-1">{p.transactionRef || 'N/A'}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {paginatedPayouts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                      No payouts found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - 8 items per page */}
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{filteredPayouts.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-gray-900">{Math.min(startIndex + PAGE_SIZE, filteredPayouts.length)}</span> of <span className="font-bold text-gray-900">{filteredPayouts.length}</span> settlements
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

