import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [message, setMessage] = useState('');
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

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [pendingRes, approvedRes] = await Promise.all([
        axios.get('http://localhost:8000/api/admin/pending-users', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/admin/approved-users', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setUsers(pendingRes.data);
      setApprovedUsers(approvedRes.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      } else {
        setMessage('Failed to load doctors.');
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (id, action) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:8000/api/admin/${action}/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`User ${action}d successfully!`);
      fetchData();
    } catch (error) {
      setMessage(`Failed to ${action} user.`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const totalPages = Math.ceil(approvedUsers.length / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedApprovedUsers = approvedUsers.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Admin Sub-Navbar */}
      <AdminNav />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Doctor KYC Approvals</h1>
              <p className="mt-2 text-sm text-gray-500">Review and verify doctor profiles before granting platform access.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-amber-700">Pending Approval</span>
                  <span className="font-extrabold text-xl text-amber-900 leading-none">{users.length}</span>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-emerald-700">Approved Doctors</span>
                  <span className="font-extrabold text-xl text-emerald-900 leading-none">{approvedUsers.length}</span>
                </div>
              </div>
            </div>
          </div>

        {message && (
          <div className={`p-4 mb-6 rounded-md text-sm font-medium shadow-sm border-l-4 ${message.includes('successfully') ? 'bg-green-50 text-green-700 border-green-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
            {message}
          </div>
        )}
        
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor Info</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee & Documents</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {u.doctorProfile?.name?.charAt(0) || 'D'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{u.doctorProfile?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500 capitalize">{u.role} Account</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{u.email}</div>
                      <div className="text-sm text-gray-500">{u.doctorProfile?.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600 mb-1">Fee: ₹{u.doctorProfile?.reportFee || 0}</div>
                      <div className="text-sm text-gray-900"><span className="font-medium">PAN:</span> {u.doctorProfile?.panCard}</div>
                      <div className="text-sm text-gray-900"><span className="font-medium">Aadhaar:</span> {u.doctorProfile?.aadhaarCard}</div>
                      {u.role === 'doctor' && u.doctorProfile?.degreeFileUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedDegree({
                            url: `${API_BASE_URL}/${u.doctorProfile.degreeFileUrl.replace(/\\/g, '/')}`,
                            doctorName: u.doctorProfile?.name || u.email
                          })}
                          className="mt-1 inline-flex items-center text-xs text-indigo-600 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition shadow-sm cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                          View Degree
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button onClick={() => handleAction(u.id, 'approve')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all">
                        Approve
                      </button>
                      <button onClick={() => handleAction(u.id, 'reject')} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all">
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 bg-gray-50 rounded-b-xl">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-lg font-medium text-gray-900">No pending approvals</p>
                      <p className="text-sm">All doctor registrations have been processed.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Approved Doctors Section */}
        <div className="mt-16 flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Active (Approved) Doctors</h2>
            <p className="mt-2 text-sm text-gray-500">List of all doctors currently active on the platform.</p>
          </div>
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold shadow-sm">
            Total Active: {approvedUsers.length}
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 mb-10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor Info</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee & Documents</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedApprovedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">  
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">
                          {u.doctorProfile?.name?.charAt(0) || 'D'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{u.doctorProfile?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{u.email}</div>
                      <div className="text-sm text-gray-500">{u.doctorProfile?.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-bold text-green-600 mb-1">Fee: ₹{u.doctorProfile?.reportFee || 0}</div>
                      <div className="text-sm text-gray-900"><span className="font-medium">PAN:</span> {u.doctorProfile?.panCard}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
                {approvedUsers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 bg-gray-50 rounded-b-xl">
                      <p className="text-lg font-medium text-gray-900">No active doctors</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls - 8 doctors per page */}
          <div className="bg-white px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-bold text-gray-900">{approvedUsers.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-bold text-gray-900">{Math.min(startIndex + PAGE_SIZE, approvedUsers.length)}</span> of <span className="font-bold text-gray-900">{approvedUsers.length}</span> doctors
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col relative border border-gray-200"
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
