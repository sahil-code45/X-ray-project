import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';

export default function DoctorOpenPool() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const navigate = useNavigate();

  const fetchAvailableCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/cases/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(res.data.availableCases || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      } else {
        toast.error('Failed to load available cases.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableCases();
  }, []);

  const handleClaim = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/api/cases/claim/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Case claimed successfully! Redirecting to workspace...');
      navigate(`/doctor/workspace/${res.data.caseId}`);
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Conflict: Another doctor just claimed this case!');
        fetchAvailableCases();
      } else {
        toast.error('Failed to claim case.');
      }
    }
  };

  const handleDownload = async (id) => {
    try {
      setIsDownloading(true);
      setDownloadProgress('0 MB');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/cases/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(`${percentCompleted}%`);
          } else {
            const loadedMB = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
            setDownloadProgress(`${loadedMB} MB`);
          }
        }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `case_${id}_report.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Failed to download report.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const filteredCases = (cases || []).filter(c => {
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Open Pool Requests</h1>
            <span className="bg-cyan-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-sm">
              {cases.length} Available
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Unclaimed X-Ray diagnostic cases available for immediate examination. Claim a case to open diagnosis workspace.
          </p>
        </div>

        <Link
          to="/doctor"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Search Toolbar */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-gray-700">
          <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-bold text-sm">Search Cases</span>
          {searchQuery && (
            <span className="text-xs bg-cyan-100 text-cyan-800 font-semibold px-2 py-0.5 rounded-full">
              {filteredCases.length} found
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by Patient Name, ID, Age, Symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm transition"
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

      {/* Table */}
      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Details</th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Study Notes / Symptoms</th>
              <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Uploaded Date</th>
              <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCases.map(c => (
              <tr key={c.id} className="hover:bg-cyan-50/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{c.patientName}</span>
                    {c.patientId && (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded">
                        {c.patientId}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{c.patientAge} Yrs / {c.patientGender}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-md line-clamp-2">{c.studyNotes}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleDownload(c.id)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition text-xs transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Report
                    </button>
                    <button
                      onClick={() => handleClaim(c.id)}
                      className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition text-xs transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                      Create Report
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCases.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-gray-500 bg-gray-50">
                  <div className="max-w-sm mx-auto space-y-2">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto text-xl">
                      📂
                    </div>
                    {searchQuery ? (
                      <div>
                        <p className="font-bold text-gray-800">No cases match "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-xs text-cyan-600 hover:underline font-bold"
                        >
                          Clear Search
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-gray-800">No available cases in open pool</p>
                        <p className="text-xs text-gray-400">All current patient cases have been claimed by radiologists.</p>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isDownloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center flex flex-col items-center gap-4 w-80">
            <svg className="animate-spin h-10 w-10 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div>
              <p className="text-gray-900 font-bold text-lg">Downloading Report...</p>
              <p className="text-gray-500 font-semibold text-sm mt-1">{downloadProgress}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

