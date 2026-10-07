import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneTools from 'cornerstone-tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import Hammer from 'hammerjs';

const SimpleEditor = ({ value, onChange, minHeight = '120px' }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || '')) {
      if (document.activeElement !== editorRef.current || !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = () => {
    onChange(editorRef.current.innerHTML);
  };

  const exec = (e, command) => {
    e.preventDefault();
    document.execCommand(command, false, null);
    handleInput();
  };

  return (
    <div className="border border-gray-300 rounded bg-white overflow-hidden flex flex-col shadow-sm mb-6">
      <div className="bg-gray-50 p-1 border-b flex gap-1">
        <button type="button" onClick={(e) => exec(e, 'bold')} className="px-3 py-1 font-bold text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors">B</button>
        <button type="button" onClick={(e) => exec(e, 'italic')} className="px-3 py-1 italic text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors">I</button>
        <button type="button" onClick={(e) => exec(e, 'underline')} className="px-3 py-1 underline text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors">U</button>
        <button type="button" onClick={(e) => exec(e, 'insertUnorderedList')} className="px-3 py-1 text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          Bullet List
        </button>
      </div>
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="p-3 focus:outline-none overflow-y-auto prose max-w-none text-sm"
        style={{ minHeight }}
      ></div>
    </div>
  );
};

export default function DoctorWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const viewerRef = useRef(null);
  
  const [formData, setFormData] = useState({
    clinicalFindings: '', impression: '', recommendations: ''
  });
  const [message, setMessage] = useState('');
  const [caseDetails, setCaseDetails] = useState(null);
  const [isDicom, setIsDicom] = useState(true);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [allImageIds, setAllImageIds] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchCase = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:8000/api/cases/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;
        setCaseDetails(res.data);
        
        if (res.data.report) {
          setFormData({
            clinicalFindings: res.data.report.clinicalFindings || '',
            impression: res.data.report.impression || '',
            recommendations: res.data.report.recommendations || ''
          });
        }
        
        // Fetch metadata to see if it's a valid DICOM directory/file
        try {
          const metaRes = await axios.get(`http://localhost:8000/api/cases/${id}/dicom-metadata`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (metaRes.data && metaRes.data.slices && metaRes.data.slices.length > 0) {
            setIsDicom(true);
            initCornerstone(token, metaRes.data.slices);
          } else {
            setIsDicom(false);
          }
        } catch (metaErr) {
          setIsDicom(false); // Metadata failed, so it's not a valid DICOM/ZIP
        }
      } catch (error) {
        console.error('Failed to fetch case details', error);
      }
    };
    
    fetchCase();

    return () => {
      isMounted = false;
      if (viewerRef.current) cornerstone.disable(viewerRef.current);
    };
  }, [id]);

  const initCornerstone = async (token, slices) => {
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.Hammer = Hammer;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneTools.init();

    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    try {
      cornerstoneWADOImageLoader.webWorkerManager.initialize({
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        startWebWorkersOnDemand: true,
        taskConfiguration: {
          decodeTask: { initializeCodecsOnStartup: false, usePDFJS: false }
        }
      });
    } catch (e) {
      console.warn("Web worker init failed, proceeding anyway", e);
    }
    
    if (viewerRef.current) cornerstone.enable(viewerRef.current);

    try {
      const imageIds = slices.map(s => `wadouri:http://localhost:8000/api/cases/${id}/dicom-stream?slice=${encodeURIComponent(s)}&token=${token}`);
      
      setAllImageIds(imageIds);
      setTotalSlices(imageIds.length);
      setCurrentSlice(0);

      cornerstoneWADOImageLoader.configure({
        beforeSend: function(xhr) { xhr.setRequestHeader('Authorization', `Bearer ${token}`); }
      });

      const firstImage = await cornerstone.loadAndCacheImage(imageIds[0]);
      if (!firstImage) throw new Error("Failed to load first image");
      
      cornerstone.displayImage(viewerRef.current, firstImage);

      // Stack setup
      cornerstoneTools.addStackStateManager(viewerRef.current, ['stack']);
      cornerstoneTools.addToolState(viewerRef.current, 'stack', { currentImageIdIndex: 0, imageIds: imageIds });
      
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.LengthTool);
      cornerstoneTools.addTool(cornerstoneTools.StackScrollMouseWheelTool);
      
      cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
      cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 });
      cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 4 });
      cornerstoneTools.setToolActive('StackScrollMouseWheel', { });

      // Listen for slice changes from mouse wheel
      viewerRef.current.addEventListener('cornerstonenewimage', () => {
        const stackToolState = cornerstoneTools.getToolState(viewerRef.current, 'stack');
        if (stackToolState && stackToolState.data && stackToolState.data[0]) {
          setCurrentSlice(stackToolState.data[0].currentImageIdIndex);
        }
      });

    } catch (err) {
      console.error("Error loading DICOM:", err);
      setMessage(`Error: ${err.message || 'Invalid DICOM file or file is corrupted.'}`);
    }
  };

  const setTool = (toolName) => {
    cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
  };

  const handleSliceChange = async (newIndex) => {
    if (newIndex < 0 || newIndex >= totalSlices) return;
    setCurrentSlice(newIndex);
    
    if (viewerRef.current && allImageIds.length > 0) {
      const stackToolState = cornerstoneTools.getToolState(viewerRef.current, 'stack');
      if (stackToolState && stackToolState.data && stackToolState.data[0]) {
        stackToolState.data[0].currentImageIdIndex = newIndex;
        try {
          const image = await cornerstone.loadAndCacheImage(allImageIds[newIndex]);
          cornerstone.displayImage(viewerRef.current, image);
        } catch (e) {
          console.error("Error changing slice", e);
        }
      }
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:8000/api/cases/${id}/report`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const isEdit = Boolean(caseDetails?.report);
      toast.success(isEdit ? 'Report updated successfully!' : 'Report submitted and signed successfully!');
      navigate('/doctor/completed-reports');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Report submission failed');
      setMessage(error.response?.data?.message || 'Report submission failed');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      {/* Top Workspace Header Bar */}
      <header className="bg-gray-950 text-white px-5 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor/completed-reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg border border-gray-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          
          <div className="h-5 w-px bg-gray-700 mx-1"></div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">
                {caseDetails?.patientName || 'Loading Patient...'}
              </h1>
              {caseDetails?.patientId && (
                <span className="text-[11px] font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded">
                  {caseDetails.patientId}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400">
              {caseDetails?.patientAge ? `${caseDetails.patientAge} Yrs / ${caseDetails.patientGender}` : ''}
              {caseDetails?.studyNotes && ` • Notes: ${caseDetails.studyNotes}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {caseDetails?.report ? (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              Editing Existing Report
            </span>
          ) : (
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Initial Diagnosis
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Viewer / Download Area */}
        <div className={`w-2/3 flex flex-col p-2 ${isDicom ? 'bg-black' : 'bg-gray-100 items-center justify-center'}`}>
          {isDicom ? (
            <>
              <div className="flex space-x-2 mb-2 text-white text-sm">
                <button onClick={() => setTool('Wwwc')} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">WW/WC (Contrast)</button>
                <button onClick={() => setTool('Zoom')} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">Zoom</button>
                <button onClick={() => setTool('Pan')} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">Pan</button>
                <button onClick={() => setTool('Length')} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">Measure</button>
                <button onClick={() => cornerstone.reset(viewerRef.current)} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 ml-auto">Reset</button>
              </div>
              <div ref={viewerRef} className="flex-1 w-full bg-black border border-gray-600 relative oncontextmenu-false">
              </div>
              
              {/* Slice Slider UI */}
              {totalSlices > 1 && (
                <div className="bg-gray-800 p-3 flex items-center gap-4 text-white text-sm">
                  <button 
                    onClick={() => handleSliceChange(currentSlice - 1)}
                    disabled={currentSlice === 0}
                    className={`px-3 py-1 rounded font-bold ${currentSlice === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                  >
                    Prev
                  </button>
                  <div className="flex-1 flex flex-col items-center">
                    <input 
                      type="range" 
                      min="0" 
                      max={totalSlices - 1} 
                      value={currentSlice}
                      onChange={(e) => handleSliceChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="mt-1 text-gray-400">Slice: {currentSlice + 1} / {totalSlices}</span>
                  </div>
                  <button 
                    onClick={() => handleSliceChange(currentSlice + 1)}
                    disabled={currentSlice === totalSlices - 1}
                    className={`px-3 py-1 rounded font-bold ${currentSlice === totalSlices - 1 ? 'bg-gray-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Non-DICOM File Attached</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">This study contains a custom file or nested folder instead of standard DICOM (.dcm) images. Please download it to view locally on your computer.</p>
              <a href={`http://localhost:8000/api/cases/${id}/dicom-stream?token=${localStorage.getItem('token')}`} download className="inline-block bg-indigo-600 text-white font-bold py-3 px-8 rounded hover:bg-indigo-700 shadow-md transition-colors">
                Download File
              </a>
            </div>
          )}
        </div>

        {/* Reporting Form Area */}
        <div className="w-1/3 bg-white p-6 overflow-y-auto border-l flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Diagnosis Report</h2>
              <p className="text-xs text-gray-500">Record observations, impression, and recommendations</p>
            </div>
          </div>

          {caseDetails?.report && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl mb-4 text-xs shadow-sm">
              <span className="font-bold flex items-center gap-1 mb-0.5">
                ✏️ Editing Mode Active
              </span>
              <p className="text-[11px] text-amber-700">
                Loaded previously submitted diagnostic details. You can modify any findings below and save your edits.
              </p>
            </div>
          )}

          {message && <p className="mb-4 text-blue-600 text-sm font-semibold">{message}</p>}
          
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col flex-1 overflow-y-auto pr-1">
            <div>
              <label className="block font-semibold mb-1 text-sm text-gray-700">Clinical Findings / Observations</label>
              <SimpleEditor value={formData.clinicalFindings} onChange={(val) => setFormData({ ...formData, clinicalFindings: val })} minHeight="180px" />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-sm text-gray-700">Impression</label>
              <SimpleEditor value={formData.impression} onChange={(val) => setFormData({ ...formData, impression: val })} minHeight="120px" />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-sm text-gray-700">Recommendations</label>
              <SimpleEditor value={formData.recommendations} onChange={(val) => setFormData({ ...formData, recommendations: val })} minHeight="120px" />
            </div>
            <button
              type="submit"
              className={`w-full py-3 px-4 rounded-xl font-bold shadow-md transition transform hover:-translate-y-0.5 mt-auto sticky bottom-0 z-10 flex items-center justify-center gap-2 text-white ${
                caseDetails?.report
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {caseDetails?.report ? 'Update & Save Report' : 'Submit & Sign Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
