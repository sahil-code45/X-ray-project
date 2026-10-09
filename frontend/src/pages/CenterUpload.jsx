import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ReportViewer from '../components/ReportViewer';
import { downloadReportPdf, openReportPdfInNewTab } from '../utils/downloadPdf';

export default function CenterUpload() {
  const [caseForm, setCaseForm] = useState({ 
    patientId: '', 
    patientName: '', 
    patientAge: '', 
    patientGender: 'Male', 
    studyNotes: '' 
  });
  const [dicomFile, setDicomFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [recentCases, setRecentCases] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const fileInputRef = useRef(null);
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

  const fetchRecentCases = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/cases/center/cases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentCases(res.data || []);
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
      toast.warning('Please select a DICOM or ZIP study file.');
      return setMessage('Please select a DICOM or ZIP study file.');
    }
    setLoading(true);
    setUploadProgress(0);
    setMessage('');

    const data = new FormData();
    Object.keys(caseForm).forEach(key => data.append(key, caseForm[key]));
    data.append('dicomFile', dicomFile);

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/cases/upload', data, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      toast.success('Patient case submitted successfully to the Radiologist pool!');
      setMessage('Patient case submitted successfully!');
      setCaseForm({ patientId: '', patientName: '', patientAge: '', patientGender: 'Male', studyNotes: '' });
      setDicomFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRecentCases();
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to submit case.';
      toast.error(errMsg);
      setMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const totalSubmitted = recentCases.length;
  const inProgressCount = recentCases.filter(c => c.status === 'in_progress').length;
  const completedCount = recentCases.filter(c => c.status === 'completed').length;

  return (
    <div className="bg-transparent h-full flex flex-col space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Diagnostic Center Portal
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Patient Case Registration</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the patient's information and upload DICOM/X-Ray files for radiologist interpretation.
          </p>
        </div>
        <Link
          to="/center/cases"
          className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-lg transition-colors shadow-sm"
        >
          View All Cases & Reports ({totalSubmitted}) &rarr;
        </Link>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Cases Submitted</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">{totalSubmitted}</p>
          </div>
          <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">In Doctor Review</p>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">{inProgressCount}</p>
          </div>
          <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Reports Ready</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{completedCount}</p>
          </div>
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        </div>
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
              <Link to="/center/cases" className="underline font-bold hover:text-green-900 ml-4">
                View in Cases Directory &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Upload Form Card */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Patient & Case Details Form</h2>
            <p className="text-sm text-gray-600 mt-1">Please provide accurate patient demographics and clinical history.</p>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Direct Radiologist Pipeline
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
                  placeholder="e.g. PID-2026-01"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
                  value={caseForm.patientId}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  name="patientName"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
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
                  min="0"
                  max="130"
                  placeholder="e.g. 42"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
                  value={caseForm.patientAge}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Patient Gender *</label>
                <select
                  name="patientGender"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition bg-white"
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Clinical History / Study Notes *
              </label>
              <textarea
                name="studyNotes"
                required
                rows="3"
                placeholder="e.g. Chest PA View - Patient presents with dry cough, fever for 4 days. Rule out pneumonia."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition"
                value={caseForm.studyNotes}
                onChange={handleChange}
              />
            </div>

            {/* Drag and Drop Zone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                DICOM / X-Ray Study File * <span className="text-xs text-gray-400 font-normal">(.dcm or .zip containing slices)</span>
              </label>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                    : dicomFile
                    ? 'border-green-400 bg-green-50/30'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".dcm,.zip,application/zip,application/octet-stream"
                  className="hidden"
                />

                {dicomFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-base font-bold text-gray-800">{dicomFile.name}</span>
                    <span className="text-xs text-gray-500 mt-1">
                      {(dicomFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-700">
                      Drag and drop your DICOM or ZIP file here, or <span className="text-blue-600 underline">browse</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supports standalone DICOM (.dcm) files or multi-slice ZIP archives.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    {uploadProgress < 100 ? `Uploading... (${uploadProgress}%)` : 'Extracting & Submitting... Please wait'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Submit Case to Radiologist Pool
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Recent Cases Section */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden mb-12">
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Recent Case Submissions</h3>
            <p className="text-xs text-gray-500">Live diagnosis status of recently registered patients</p>
          </div>
          <Link to="/center/cases" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
            View All ({recentCases.length}) &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient Details</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Clinical Notes</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted On</th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Report Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentCases.slice(0, 6).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">{c.patientName}</div>
                    <div className="text-xs text-gray-500">
                      ID: <span className="font-mono">{c.patientId || `CASE-${c.id}`}</span> • {c.patientAge}y / {c.patientGender}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {c.studyNotes || 'Routine X-Ray Examination'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                    {new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {c.status === 'completed' ? (
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
                    {c.status === 'completed' && c.report ? (
                      <button
                        onClick={() => setSelectedReport(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View / Print Report
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Processing</span>
                    )}
                  </td>
                </tr>
              ))}
              {recentCases.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No cases submitted yet. Register your first patient case above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Diagnostic Radiology Report</h3>
                <p className="text-xs text-gray-300">
                  Patient: {selectedReport.patientName} (ID: {selectedReport.patientId || selectedReport.id})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Open PDF directly in browser"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Browser
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <ReportViewer reportData={selectedReport} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

