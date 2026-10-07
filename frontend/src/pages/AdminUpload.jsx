import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import { toast } from 'react-toastify';

export default function AdminUpload() {
  const [caseForm, setCaseForm] = useState({ patientId: '', patientName: '', patientAge: '', patientGender: 'Male', studyNotes: '' });
  const [dicomFile, setDicomFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentCases, setRecentCases] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchRecentCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/admin/cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Show top 5 most recent
      setRecentCases((res.data || []).slice(0, 5));
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchRecentCases();
  }, []);

  const handleChange = (e) => setCaseForm({ ...caseForm, [e.target.name]: e.target.value });
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setDicomFile(e.target.files[0]);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setDicomFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!dicomFile) {
      toast.warning('Please select a DICOM / study file.');
      return setMessage('Please select a DICOM / study file.');
    }
    setLoading(true);
    setMessage('');

    const data = new FormData();
    Object.keys(caseForm).forEach(key => data.append(key, caseForm[key]));
    data.append('dicomFile', dicomFile);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/cases/upload', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('X-Ray Case uploaded successfully!');
      setMessage('X-Ray Case uploaded successfully!');
      setCaseForm({ patientId: '', patientName: '', patientAge: '', patientGender: 'Male', studyNotes: '' });
      setDicomFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRecentCases();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to upload case.';
      toast.error(errMsg);
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-transparent h-full flex flex-col">
      {/* Admin Sub-Navbar */}
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Upload Data</h1>
            <p className="mt-2 text-sm text-gray-500">
              Upload DICOM studies and patient information into the platform for radiologist diagnosis.
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Go to Overview &rarr;
          </Link>
        </div>

        {/* Message Feedback */}
        {message && (
          <div className={`p-4 rounded-lg text-sm font-medium shadow-sm border-l-4 ${
            message.includes('success') 
              ? 'bg-green-50 text-green-700 border-green-500' 
              : 'bg-red-50 text-red-700 border-red-500'
          }`}>
            <div className="flex justify-between items-center">
              <span>{message}</span>
              {message.includes('success') && (
                <Link to="/admin" className="underline font-bold hover:text-green-900 ml-4">
                  View in Overview &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Upload Form Card */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-indigo-900">New Patient Case Details</h2>
              <p className="text-sm text-indigo-700 mt-1">Fill in the patient's details and attach the DICOM image/zip bundle.</p>
            </div>
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-200 text-indigo-800">
              Open Pool Distribution
            </span>
          </div>

          <div className="p-8">
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Patient ID <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="patientId"
                    placeholder="e.g. PID-1042"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
                    value={caseForm.patientId}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    name="patientName"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
                    value={caseForm.patientName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Age *</label>
                  <input
                    type="number"
                    name="patientAge"
                    required
                    placeholder="e.g. 45"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
                    value={caseForm.patientAge}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Gender *</label>
                  <select
                    name="patientGender"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition bg-white"
                    value={caseForm.patientGender}
                    onChange={handleChange}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Study Notes / Clinical Symptoms *</label>
                <textarea
                  name="studyNotes"
                  required
                  rows="3"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
                  placeholder="Clinical history, reason for examination, suspected pathology..."
                  value={caseForm.studyNotes}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">DICOM / Study File * (.dcm, .zip, .pdf)</label>
                <div
                  className={`mt-1 flex flex-col justify-center items-center px-6 pt-6 pb-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' 
                      : 'border-gray-300 hover:border-indigo-400 bg-gray-50/70 hover:bg-gray-50'
                  }`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-2 text-center">
                    <div className="mx-auto h-14 w-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div className="flex text-sm text-gray-600 justify-center items-center gap-1">
                      <span className="font-semibold text-indigo-600 hover:text-indigo-500">
                        Click to browse file
                      </span>
                      <span>or drag and drop here</span>
                    </div>
                    <p className="text-xs text-gray-400">Supports .dcm, DICOM series .zip, PDF, up to 50MB</p>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      ref={fileInputRef}
                      className="sr-only"
                      onChange={handleFileChange}
                    />

                    {dicomFile && (
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-lg text-indigo-900 font-semibold text-sm shadow-sm">
                        <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span>{dicomFile.name}</span>
                        <span className="text-xs text-indigo-600">({(dicomFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDicomFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="ml-2 text-indigo-600 hover:text-red-600 font-bold"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Uploading Study...
                    </>
                  ) : (
                    'Upload X-Ray Case'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Recently Uploaded Cases */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden mb-12">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Recent Uploads</h2>
              <p className="text-sm text-gray-500 mt-1">Recently uploaded cases dispatched to doctors.</p>
            </div>
            <Link
              to="/admin"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View Full List &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Patient Details</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Uploaded Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Doctor</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(recentCases || []).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {c.status === 'uploaded' && <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Open Pool</span>}
                      {c.status === 'in_progress' && <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>}
                      {c.status === 'completed' && <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {c.doctor?.doctorProfile?.name || <span className="italic text-gray-400">Waiting for claim</span>}
                    </td>
                  </tr>
                ))}
                {(!recentCases || recentCases.length === 0) && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-400 text-sm">
                      No cases uploaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

