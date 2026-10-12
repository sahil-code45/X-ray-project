import React, { useState, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';

async function ensureHtml2Pdf() {
  if (typeof window.html2pdf === 'function') return true;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="html2pdf"]');
    if (existing) {
      if (typeof window.html2pdf === 'function') return resolve(true);
      existing.onload = () => resolve(true);
      existing.onerror = reject;
      return;
    }
    const script = document.createElement('script');
    script.src = '/html2pdf.bundle.min.js';
    script.onload = () => resolve(true);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function SomethingWrongModal({ caseData, onClose, onSuccess }) {
  const [reuploadFile, setReuploadFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  const [patientForm, setPatientForm] = useState({
    patientName: caseData?.patientName || '',
    patientId: caseData?.patientId || '',
    patientAge: caseData?.patientAge !== null && caseData?.patientAge !== undefined ? caseData.patientAge : '',
    patientGender: caseData?.patientGender || 'Male',
    studyNotes: caseData?.studyNotes || ''
  });

  if (!caseData) return null;

  const doctorName = caseData.doctor?.doctorProfile?.name || caseData.doctor?.email || 'Reporting Radiologist';

  const handleDownloadPdf = async () => {
    const element = document.getElementById('issue-notice-document');
    if (!element) {
      window.print();
      return;
    }
    try {
      setDownloadingPdf(true);
      await ensureHtml2Pdf();
      if (typeof window.html2pdf !== 'function') {
        window.print();
        return;
      }
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Issue_Notice_${(patientForm.patientName || 'Patient').replace(/\s+/g, '_')}_${patientForm.patientId || caseData.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await window.html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Download PDF error:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenPdf = async () => {
    const element = document.getElementById('issue-notice-document');
    if (!element) {
      window.print();
      return;
    }
    try {
      setDownloadingPdf(true);
      await ensureHtml2Pdf();
      if (typeof window.html2pdf !== 'function') {
        window.print();
        return;
      }
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Issue_Notice_${(patientForm.patientName || 'Patient').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      const pdfBlob = await window.html2pdf().set(opt).from(element).output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Open PDF error:', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReuploadFile(e.target.files[0]);
    }
  };

  const handleReuploadSubmit = async (e) => {
    e.preventDefault();
    if (!patientForm.patientName.trim()) {
      toast.warning('Patient Name is required.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('patientName', patientForm.patientName.trim());
    formData.append('patientId', patientForm.patientId.trim());
    formData.append('patientAge', patientForm.patientAge);
    formData.append('patientGender', patientForm.patientGender);
    formData.append('studyNotes', patientForm.studyNotes);

    if (reuploadFile) {
      formData.append('dicomFile', reuploadFile);
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/cases/${caseData.id}/reupload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      toast.success('Patient details and study updated successfully! Returned to doctor pool with "Modify" status.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Re-upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to update study.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in border border-red-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-900 to-rose-900 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-800/80 rounded-lg text-white">
              <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div>
              <h3 className="text-lg font-bold">Document Issue / Discrepancy Notice</h3>
              <p className="text-xs text-red-200">
                Patient: {patientForm.patientName || caseData.patientName} (ID: {patientForm.patientId || caseData.patientId || caseData.id})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Download PDF Notice"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadingPdf ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button
              onClick={handleOpenPdf}
              disabled={downloadingPdf}
              className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Open Notice directly in browser"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Browser
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={onClose}
              className="text-red-200 hover:text-white p-1 rounded hover:bg-red-800 transition cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-6">
          
          {/* Official Document View (for PDF generation & on-screen preview) */}
          <div 
            id="issue-notice-document" 
            className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-6 text-gray-800 font-sans"
          >
            {/* Header / Brand */}
            <div className="border-b-2 border-red-600 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <span className="text-red-600">TELE-RADIOLOGY</span> NETWORK
                </h1>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
                  Clinical Imaging Quality Assurance & Discrepancy Notice
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 font-extrabold text-xs uppercase tracking-wider rounded-full border border-red-200">
                  ACTION REQUIRED: RE-UPLOAD / UPDATE
                </span>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Patient & Case Meta Grid (reflects current or edited values) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Patient Name</span>
                <span className="font-bold text-gray-900 text-sm">{patientForm.patientName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Patient ID</span>
                <span className="font-mono font-bold text-gray-900">{patientForm.patientId || `CASE-${caseData.id}`}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Age / Gender</span>
                <span className="font-semibold text-gray-900">{patientForm.patientAge ? `${patientForm.patientAge} Yrs` : 'N/A'} / {patientForm.patientGender}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block uppercase text-[10px]">Exam Notes</span>
                <span className="font-semibold text-gray-900 truncate block">{patientForm.studyNotes || 'Routine Study'}</span>
              </div>
            </div>

            {/* Doctor Note */}
            <div className="text-xs text-gray-600 flex items-center justify-between border-b pb-2">
              <span><strong>Flagged by Radiologist:</strong> {doctorName}</span>
              <span className="font-mono text-gray-400">Case Ref #{caseData.id}</span>
            </div>

            {/* The Reported Issue / Problem Statement Box */}
            <div className="border-2 border-red-300 bg-red-50/80 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm uppercase tracking-wide">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Doctor's Observation & Problem Reported:
              </div>
              <div className="text-red-950 font-medium text-sm leading-relaxed whitespace-pre-wrap pl-7">
                {caseData.issueDescription || 'The uploaded file is incorrect, incomplete, or corrupted. Please verify and re-upload the correct DICOM / scan files.'}
              </div>
            </div>

            {/* Instruction Checklist */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <p className="font-bold">Required Action for Center:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>Check and correct patient personal information (Name, Age, Gender, Notes) if inaccurate.</li>
                <li>Verify DICOM scan files and attach a replacement file if the scan was incorrect or corrupted.</li>
                <li>Click "Update Details & Send to Doctor" below to return the case for radiologist diagnosis.</li>
              </ul>
            </div>

            {/* Signature / Footer */}
            <div className="pt-4 border-t flex justify-between items-center text-[11px] text-gray-400 font-mono">
              <span>Tele-Radiology Automated Quality Verification Service</span>
              <span>Notice Generated: {new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Correction & Update Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b pb-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                ✏️
              </span>
              <div>
                <h4 className="text-base font-bold text-gray-900">Correct Patient Demographics & Re-upload Study</h4>
                <p className="text-xs text-gray-500">
                  Update any wrong patient personal details below and/or select a replacement DICOM/ZIP archive.
                </p>
              </div>
            </div>

            <form onSubmit={handleReuploadSubmit} className="space-y-6">
              
              {/* Personal Details Inputs */}
              <div>
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-3 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patient Personal Details (Edit if wrong)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Patient Full Name *</label>
                    <input
                      type="text"
                      required
                      value={patientForm.patientName}
                      onChange={(e) => setPatientForm({ ...patientForm, patientName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Patient ID</label>
                    <input
                      type="text"
                      value={patientForm.patientId}
                      onChange={(e) => setPatientForm({ ...patientForm, patientId: e.target.value })}
                      placeholder="e.g. PID-101"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Age *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="130"
                      value={patientForm.patientAge}
                      onChange={(e) => setPatientForm({ ...patientForm, patientAge: e.target.value })}
                      placeholder="e.g. 35"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Gender *</label>
                    <select
                      value={patientForm.patientGender}
                      onChange={(e) => setPatientForm({ ...patientForm, patientGender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Exam Notes / Study Symptoms</label>
                    <textarea
                      rows="2"
                      value={patientForm.studyNotes}
                      onChange={(e) => setPatientForm({ ...patientForm, studyNotes: e.target.value })}
                      placeholder="e.g. Chest PA View, rule out infection"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload Zone */}
              <div>
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Replacement DICOM / ZIP File
                  </span>
                  <span className="text-[11px] text-gray-400 font-normal lowercase">
                    (optional if only updating personal details)
                  </span>
                </h5>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setReuploadFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
                      : reuploadFile
                      ? 'border-green-400 bg-green-50/40'
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

                  {reuploadFile ? (
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1 shadow-inner">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{reuploadFile.name}</span>
                      <span className="text-xs text-gray-500">
                        {(reuploadFile.size / (1024 * 1024)).toFixed(2)} MB • Click to replace file
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="w-7 h-7 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-700">
                        Click or drag to upload new DICOM / ZIP study file
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Leave empty if only personal details need to be corrected.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Uploading updates...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-7 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Saving & Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Update Details & Send to Doctor
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
