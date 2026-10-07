import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const [cases, setCases] = useState([]);
  const [claimedCases, setClaimedCases] = useState([]);
  const [earnings, setEarnings] = useState({ totalEarned: 0, pendingDues: 0 });
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filterBySearch = (list) => {
    if (!searchQuery.trim()) return list || [];
    const q = searchQuery.toLowerCase().trim();
    return (list || []).filter(c => 
      c.patientName?.toLowerCase().includes(q) ||
      c.patientId?.toLowerCase().includes(q) ||
      String(c.patientAge).includes(q) ||
      c.patientGender?.toLowerCase().includes(q) ||
      c.studyNotes?.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  };

  const filteredClaimedCases = filterBySearch(claimedCases);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [casesRes, payoutsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/cases/available', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/payouts/doctor', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setCases(casesRes.data.availableCases || []);
      setClaimedCases(casesRes.data.myCases || []);
      setTotalCompleted(casesRes.data.totalCompleted || 0);
      setEarnings({ totalEarned: payoutsRes.data.totalEarned, pendingDues: payoutsRes.data.pendingDues });

    } catch (error) {
      setMessage('Failed to load dashboard data.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleClaim = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:8000/api/cases/claim/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Case claimed successfully!');
      navigate(`/doctor/workspace/${res.data.caseId}`);
    } catch (error) {
      if (error.response?.status === 409) {
        setMessage('Conflict: Another doctor just claimed this case!');
        fetchData();
      } else {
        setMessage('Failed to claim case.');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Doctor Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Review assigned patient X-rays and generate clinical diagnostic reports.</p>
        </div>

        <Link
          to="/doctor/open-pool"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl shadow-md text-sm font-bold transition transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          <span>Open Pool Requests</span>
          <span className="bg-white text-cyan-700 text-xs font-black px-2.5 py-0.5 rounded-full shadow-inner animate-pulse">
            {cases?.length || 0}
          </span>
        </Link>
      </div>

      {message && <p className="mb-6 text-center font-bold text-blue-600 bg-blue-50 py-3 rounded-lg border border-blue-100">{message}</p>}

      {/* Colorful Stat Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Card 1: Total Patients */}
        <div className="bg-[#4BD49B] rounded-xl p-6 flex items-center shadow-lg transform hover:-translate-y-1 transition-transform duration-200">
          <div className="bg-white rounded-full h-14 w-14 flex items-center justify-center flex-shrink-0 shadow-inner">
            <svg className="w-7 h-7 text-[#4BD49B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <div className="ml-4 text-white">
            <h3 className="text-3xl font-bold">{(totalCompleted || 0) + (claimedCases?.length || 0)}</h3>
            <p className="text-sm font-medium opacity-90 mt-1">Total Patients</p>
          </div>
        </div>

        {/* Card 2: Completed Reports */}
        <div className="bg-[#0EA5E9] rounded-xl p-6 flex items-center shadow-lg transform hover:-translate-y-1 transition-transform duration-200">
          <div className="bg-white rounded-full h-14 w-14 flex items-center justify-center flex-shrink-0 shadow-inner">
            <svg className="w-7 h-7 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="ml-4 text-white">
            <h3 className="text-3xl font-bold">{totalCompleted || 0}</h3>
            <p className="text-sm font-medium opacity-90 mt-1">Completed Reports</p>
          </div>
        </div>

        {/* Card 3: Pending Reports */}
        <div className="bg-[#6B93F7] rounded-xl p-6 flex items-center shadow-lg transform hover:-translate-y-1 transition-transform duration-200">
          <div className="bg-white rounded-full h-14 w-14 flex items-center justify-center flex-shrink-0 shadow-inner">
            <svg className="w-7 h-7 text-[#6B93F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div className="ml-4 text-white">
            <h3 className="text-3xl font-bold">{claimedCases?.length || 0}</h3>
            <p className="text-sm font-medium opacity-90 mt-1">Pending Reports</p>
          </div>
        </div>

        {/* Card 4: Total Paid Fees */}
        <div className="bg-[#8F66FC] rounded-xl p-6 flex items-center shadow-lg transform hover:-translate-y-1 transition-transform duration-200">
          <div className="bg-white rounded-full h-14 w-14 flex items-center justify-center flex-shrink-0 shadow-inner">
            <svg className="w-7 h-7 text-[#8F66FC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="ml-4 text-white">
            <h3 className="text-3xl font-bold">₹{earnings.totalEarned || 0}</h3>
            <p className="text-sm font-medium opacity-90 mt-1">Total Paid Fees</p>
          </div>
        </div>

      </div>
      
      {/* Patient Search Bar Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-2 text-gray-700">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-bold text-sm">Patient Search</span>
          {searchQuery && (
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
              {filteredClaimedCases.length} active matching
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
            placeholder="Search patient by name, age, gender, symptoms..." 
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
      
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-xl font-semibold">My Active Cases (To be Reported)</h3>
        {searchQuery && (
          <span className="text-xs text-gray-500">
            Showing {filteredClaimedCases.length} of {claimedCases.length} cases
          </span>
        )}
      </div>
      <div className="bg-white shadow rounded-lg overflow-hidden border border-blue-100 mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Patient Details</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Study Notes</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-blue-800 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClaimedCases.map(c => (
              <tr key={c.id} className="hover:bg-blue-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{c.patientName}</span>
                    {c.patientId && (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {c.patientId}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{c.patientAge} Yrs / {c.patientGender}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 line-clamp-2">{c.studyNotes}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => navigate(`/doctor/workspace/${c.id}`)} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors">
                    Open Workspace
                  </button>
                </td>
              </tr>
            ))}
            {filteredClaimedCases.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                  {searchQuery ? (
                    <div>
                      <p className="font-semibold text-gray-700">No active patients found matching "{searchQuery}"</p>
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-xs text-blue-600 hover:underline font-bold"
                      >
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    'You have no active cases pending report.'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
