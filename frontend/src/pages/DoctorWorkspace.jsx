import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneMath from 'cornerstone-math';
import * as cornerstoneTools from 'cornerstone-tools';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import Hammer from 'hammerjs';
import { CT_TEMPLATES } from '../utils/ctTemplates';
import { MRI_TEMPLATES } from '../utils/mriTemplates';

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
  const [dicomMeta, setDicomMeta] = useState(null);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'viewer' | 'report'
  const [activeTool, setActiveTool] = useState('Wwwc');
  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [allImageIds, setAllImageIds] = useState([]);
  const [isCT, setIsCT] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isMRI, setIsMRI] = useState(false);
  const [selectedMriTemplateId, setSelectedMriTemplateId] = useState('');
  const [selectedTestName, setSelectedTestName] = useState('');
  const [selectedModality, setSelectedModality] = useState('');
  const [isSomethingWrong, setIsSomethingWrong] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cineFps, setCineFps] = useState(15);
  const [selectedWindowPreset, setSelectedWindowPreset] = useState('default');
  const [showOhifModal, setShowOhifModal] = useState(false);
  const [copiedOhifUrl, setCopiedOhifUrl] = useState(false);
  const [showTagInspector, setShowTagInspector] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [show3dMprModal, setShow3dMprModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCase = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/api/cases/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;
        setCaseDetails(res.data);

        if (res.data.report?.testName || res.data.testName) {
          setSelectedTestName(res.data.report?.testName || res.data.testName || '');
          setSelectedModality(res.data.report?.modality || res.data.modality || '');
        }
        
        if (res.data.report) {
          let combined = res.data.report.clinicalFindings || '';
          if (res.data.report.impression) {
            combined += `<br/><p><strong>IMPRESSION</strong></p>${res.data.report.impression}`;
          }
          if (res.data.report.recommendations) {
            combined += `<br/><p><strong>RECOMMENDATIONS</strong></p>${res.data.report.recommendations}`;
          }
          setFormData({
            clinicalFindings: combined,
            impression: '',
            recommendations: ''
          });
        }
        
        // Fetch metadata to see if it's a valid DICOM directory/file
        try {
          const metaRes = await axios.get(`${API_BASE_URL}/api/cases/${id}/dicom-metadata`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (metaRes.data && metaRes.data.slices && metaRes.data.slices.length > 0) {
            setIsDicom(true);
            setDicomMeta(metaRes.data.metadata || null);
            if (metaRes.data.modality) {
              setSelectedModality(prev => prev || metaRes.data.modality);
            }
            if (metaRes.data.testName) {
              setSelectedTestName(prev => prev || metaRes.data.testName);
            }
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
      if (viewerRef.current) {
        try {
          cornerstone.disable(viewerRef.current);
        } catch (e) {}
      }
    };
  }, [id]);

  useEffect(() => {
    if (viewerRef.current && isDicom && viewMode !== 'report') {
      const timer = setTimeout(() => {
        try {
          let isEnabled = false;
          try {
            isEnabled = Boolean(cornerstone.getEnabledElement(viewerRef.current));
          } catch (e) {
            isEnabled = false;
          }

          if (!isEnabled) {
            cornerstone.enable(viewerRef.current);
          }

          cornerstone.resize(viewerRef.current, true);

          if (allImageIds.length > 0) {
            const targetIndex = currentSlice >= 0 && currentSlice < allImageIds.length ? currentSlice : 0;
            cornerstone.loadAndCacheImage(allImageIds[targetIndex]).then(img => {
              try {
                cornerstone.displayImage(viewerRef.current, img);
                cornerstone.fitToWindow(viewerRef.current);
              } catch (e) {}
            }).catch(err => {
              console.warn("Failed to reload slice on mode change", err);
            });
          }
        } catch (e) {
          console.warn('Cornerstone resize error:', e);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [viewMode, isDicom, allImageIds, currentSlice]);

  // Keyboard navigation for DICOM slices (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable) {
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSliceChange(currentSlice - 1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleSliceChange(currentSlice + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlice, totalSlices, allImageIds]);

  const initCornerstone = async (token, slices) => {
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.Hammer = Hammer;
    cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
    cornerstoneTools.init();

    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    try {
      cornerstoneWADOImageLoader.webWorkerManager.initialize({
        maxWebWorkers: 0,
        startWebWorkersOnDemand: false,
        taskConfiguration: {
          decodeTask: { initializeCodecsOnStartup: true, usePDFJS: false }
        }
      });
    } catch (e) {
      console.warn("Web worker init failed, proceeding anyway", e);
    }
    
    if (viewerRef.current) cornerstone.enable(viewerRef.current);

    try {
      let imageIds = slices.map(s => `wadouri:${API_BASE_URL}/api/cases/${id}/dicom-stream?slice=${encodeURIComponent(s)}&token=${token}`);
      
      cornerstoneWADOImageLoader.configure({
        beforeSend: function(xhr) { xhr.setRequestHeader('Authorization', `Bearer ${token}`); }
      });

      const firstImage = await cornerstone.loadAndCacheImage(imageIds[0]);
      if (!firstImage) throw new Error("Failed to load first image");
      
      // Multiframe DICOM support
      const numFrames = firstImage.data ? firstImage.data.intString('x00280008') : null;
      if (numFrames && numFrames > 1 && imageIds.length === 1) {
          const multiFrames = [];
          for (let i = 0; i < numFrames; i++) {
              multiFrames.push(imageIds[0] + `&frame=${i}`);
          }
          imageIds = multiFrames;
      }

      setAllImageIds(imageIds);
      setTotalSlices(imageIds.length);
      setCurrentSlice(0);

      cornerstone.displayImage(viewerRef.current, firstImage);

      // Stack setup
      cornerstoneTools.addStackStateManager(viewerRef.current, ['stack']);
      cornerstoneTools.addToolState(viewerRef.current, 'stack', { currentImageIdIndex: 0, imageIds: imageIds });
      
      cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
      cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      cornerstoneTools.addTool(cornerstoneTools.PanTool);
      cornerstoneTools.addTool(cornerstoneTools.LengthTool);
      cornerstoneTools.addTool(cornerstoneTools.AngleTool);
      cornerstoneTools.addTool(cornerstoneTools.CobbAngleTool);
      cornerstoneTools.addTool(cornerstoneTools.EllipticalRoiTool);
      cornerstoneTools.addTool(cornerstoneTools.FreehandRoiTool);
      cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
      cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
      cornerstoneTools.addTool(cornerstoneTools.MagnifyTool);
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

  const AVAILABLE_TOOLS = ['Wwwc', 'Zoom', 'Pan', 'Length', 'Angle', 'CobbAngle', 'EllipticalRoi', 'FreehandRoi', 'RectangleRoi', 'Probe', 'Magnify'];

  const setTool = (toolName) => {
    setActiveTool(toolName);
    AVAILABLE_TOOLS.forEach(t => {
      try {
        cornerstoneTools.setToolPassive(t);
      } catch (e) {}
    });
    try {
      cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });
    } catch (e) {}
  };

  const handleReset = () => {
    if (viewerRef.current) {
      try {
        if (isPlaying) {
          cornerstoneTools.stopClip(viewerRef.current);
          setIsPlaying(false);
        }
        cornerstone.reset(viewerRef.current);
        setSelectedWindowPreset('default');
      } catch (e) {}
    }
  };

  const handleTogglePlay = () => {
    if (!viewerRef.current) return;
    if (isPlaying) {
      try {
        cornerstoneTools.stopClip(viewerRef.current);
      } catch (e) {}
      setIsPlaying(false);
    } else {
      try {
        cornerstoneTools.playClip(viewerRef.current, cineFps);
      } catch (e) {}
      setIsPlaying(true);
    }
  };

  const handleFpsChange = (newFps) => {
    setCineFps(newFps);
    if (isPlaying && viewerRef.current) {
      try {
        cornerstoneTools.stopClip(viewerRef.current);
        cornerstoneTools.playClip(viewerRef.current, newFps);
      } catch (e) {}
    }
  };

  const applyWindowPreset = (presetKey) => {
    setSelectedWindowPreset(presetKey);
    if (!viewerRef.current) return;
    const viewport = cornerstone.getViewport(viewerRef.current);
    if (!viewport) return;

    const PRESETS = {
      default: null,
      brain: { ww: 80, wc: 40 },
      bone: { ww: 2000, wc: 500 },
      lung: { ww: 1500, wc: -600 },
      soft: { ww: 350, wc: 50 },
      abdomen: { ww: 400, wc: 40 },
      mediastinum: { ww: 350, wc: 50 }
    };

    if (presetKey === 'default') {
      cornerstone.reset(viewerRef.current);
    } else if (PRESETS[presetKey]) {
      viewport.voi.windowWidth = PRESETS[presetKey].ww;
      viewport.voi.windowCenter = PRESETS[presetKey].wc;
      cornerstone.setViewport(viewerRef.current, viewport);
    }
  };

  const handleInvert = () => {
    if (!viewerRef.current) return;
    const viewport = cornerstone.getViewport(viewerRef.current);
    if (viewport) {
      viewport.invert = !viewport.invert;
      cornerstone.setViewport(viewerRef.current, viewport);
    }
  };

  const handleRotate = () => {
    if (!viewerRef.current) return;
    const viewport = cornerstone.getViewport(viewerRef.current);
    if (viewport) {
      viewport.rotation = ((viewport.rotation || 0) + 90) % 360;
      cornerstone.setViewport(viewerRef.current, viewport);
    }
  };

  const handleFlipH = () => {
    if (!viewerRef.current) return;
    const viewport = cornerstone.getViewport(viewerRef.current);
    if (viewport) {
      viewport.hflip = !viewport.hflip;
      cornerstone.setViewport(viewerRef.current, viewport);
    }
  };

  const handleClearAnnotations = () => {
    if (!viewerRef.current) return;
    ['Length', 'Angle', 'CobbAngle', 'EllipticalRoi', 'FreehandRoi', 'RectangleRoi', 'Probe'].forEach(tool => {
      try {
        cornerstoneTools.clearToolState(viewerRef.current, tool);
      } catch (e) {}
    });
    try {
      cornerstone.updateImage(viewerRef.current);
    } catch (e) {}
    toast.info('Annotations cleared');
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

  const displayTags = (dicomMeta?.tags && dicomMeta.tags.length > 0)
    ? dicomMeta.tags
    : [
        { tag: '(0010,0010)', name: 'Patient Name', vr: 'PN', value: caseDetails?.patientName || dicomMeta?.patientName || 'N/A' },
        { tag: '(0010,0020)', name: 'Patient ID', vr: 'LO', value: caseDetails?.patientId || dicomMeta?.patientId || 'N/A' },
        { tag: '(0010,1010)', name: 'Patient Age', vr: 'AS', value: caseDetails?.patientAge ? `${caseDetails.patientAge}Y` : (dicomMeta?.patientAge || 'N/A') },
        { tag: '(0010,0040)', name: 'Patient Sex', vr: 'CS', value: caseDetails?.patientGender || dicomMeta?.patientGender || 'N/A' },
        { tag: '(0008,0060)', name: 'Modality', vr: 'CS', value: caseDetails?.modality || dicomMeta?.modality || 'N/A' },
        { tag: '(0008,1030)', name: 'Study Description', vr: 'LO', value: caseDetails?.testName || dicomMeta?.testName || 'N/A' },
        { tag: '(0008,103E)', name: 'Series Description', vr: 'LO', value: dicomMeta?.seriesDescription || 'Axial' },
        { tag: '(0008,0020)', name: 'Study Date', vr: 'DA', value: dicomMeta?.studyDate || 'N/A' },
        { tag: '(0008,0070)', name: 'Manufacturer', vr: 'LO', value: dicomMeta?.manufacturer || 'N/A' },
        { tag: '(0008,1090)', name: "Manufacturer's Model Name", vr: 'LO', value: dicomMeta?.scannerModel || 'N/A' },
        { tag: '(0008,0080)', name: 'Institution Name', vr: 'LO', value: dicomMeta?.institutionName || 'Medical Center' },
        { tag: '(0018,0050)', name: 'Slice Thickness', vr: 'DS', value: dicomMeta?.sliceThickness ? `${dicomMeta.sliceThickness} mm` : 'N/A' },
        { tag: '(0018,0088)', name: 'Spacing Between Slices', vr: 'DS', value: dicomMeta?.spacingBetweenSlices ? `${dicomMeta.spacingBetweenSlices} mm` : 'N/A' },
        { tag: '(0028,0030)', name: 'Pixel Spacing', vr: 'DS', value: dicomMeta?.pixelSpacing || 'N/A' },
        { tag: '(0018,0060)', name: 'KVP', vr: 'DS', value: dicomMeta?.kvp ? `${dicomMeta.kvp} kV` : 'N/A' },
        { tag: '(0018,1151)', name: 'X-Ray Tube Current', vr: 'IS', value: dicomMeta?.tubeCurrent ? `${dicomMeta.tubeCurrent} mA` : 'N/A' },
        { tag: '(0018,0080)', name: 'Repetition Time (TR)', vr: 'DS', value: dicomMeta?.repetitionTime ? `${dicomMeta.repetitionTime} ms` : 'N/A' },
        { tag: '(0018,0081)', name: 'Echo Time (TE)', vr: 'DS', value: dicomMeta?.echoTime ? `${dicomMeta.echoTime} ms` : 'N/A' },
        { tag: '(0028,0010)', name: 'Rows', vr: 'US', value: String(dicomMeta?.rows || 512) },
        { tag: '(0028,0011)', name: 'Columns', vr: 'US', value: String(dicomMeta?.columns || 512) },
        { tag: '(0028,1050)', name: 'Window Center', vr: 'DS', value: dicomMeta?.windowCenter || 'N/A' },
        { tag: '(0028,1051)', name: 'Window Width', vr: 'DS', value: dicomMeta?.windowWidth || 'N/A' },
        { tag: '(0020,000D)', name: 'Study Instance UID', vr: 'UI', value: dicomMeta?.studyInstanceUid || `2.25.${id}` },
        { tag: '(0020,000E)', name: 'Series Instance UID', vr: 'UI', value: dicomMeta?.seriesInstanceUid || `2.25.${id}.1` }
      ];

  const filteredTags = displayTags.filter(t => {
    const q = (tagSearchQuery || '').toLowerCase();
    return (
      t.tag.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      String(t.value).toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        testName: selectedTestName || null,
        modality: selectedModality || (selectedTestName?.includes('MRI') ? 'MRI' : (selectedTestName?.includes('CT') ? 'CT' : null))
      };
      const res = await axios.post(`${API_BASE_URL}/api/cases/${id}/report`, payload, {
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

  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    if (id) {
      const template = CT_TEMPLATES.find(t => t.id === parseInt(id));
      if (template) {
        setSelectedTestName(template.name);
        setSelectedModality('CT');
        const combined = `${template.findings || ''}<br/><p><strong>IMPRESSION</strong></p>${template.impression || ''}`;
        setFormData({
          ...formData,
          clinicalFindings: combined,
          impression: '',
          recommendations: ''
        });
      }
    } else {
      setSelectedTestName('');
      setSelectedModality('');
    }
  };

  const handleMriTemplateChange = (e) => {
    const id = e.target.value;
    setSelectedMriTemplateId(id);
    if (id) {
      const template = MRI_TEMPLATES.find(t => t.id === parseInt(id));
      if (template) {
        setSelectedTestName(template.name);
        setSelectedModality('MRI');
        const combined = `${template.findings || ''}<br/><p><strong>IMPRESSION</strong></p>${template.impression || ''}`;
        setFormData({
          ...formData,
          clinicalFindings: combined,
          impression: '',
          recommendations: ''
        });
      }
    } else {
      setSelectedTestName('');
      setSelectedModality('');
    }
  };

  const handleReportIssue = async () => {
    if (!issueText.trim()) {
      toast.warning('Please describe the problem with the document before submitting.');
      return;
    }
    setSubmittingIssue(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/cases/${id}/report-issue`, {
        issueDescription: issueText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Document issue reported to center successfully! The case has been sent for re-upload.');
      navigate('/doctor');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit issue');
    } finally {
      setSubmittingIssue(false);
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

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
            <button
              type="button"
              onClick={() => setViewMode('viewer')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${viewMode === 'viewer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              title="Full screen DICOM Viewer"
            >
              🖼️ Viewer
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${viewMode === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              title="Split View: Viewer on Left, Report on Right"
            >
              🌓 Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('report')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${viewMode === 'report' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              title="Full screen Report Editor"
            >
              📝 Report
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShow3dMprModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
            title="3D Volume Rendering & Multi-Planar Reconstruction (MPR)"
          >
            <span>🧊</span> 3D / MPR Station
          </button>

          <button
            type="button"
            onClick={() => setShowOhifModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
            title="Open OHIF Viewer DICOM JSON Integration"
          >
            <span>🔬</span> OHIF Study Link
          </button>

          <a
            href={`${API_BASE_URL}/api/cases/${id}/download?token=${localStorage.getItem('token')}`}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition shadow-sm"
            title="Download complete study package for RadiAnt or MicroDicom"
          >
            <span>📥</span> Download (RadiAnt / MicroDicom)
          </a>

          {caseDetails?.isReportWrong ? (
            <span className="bg-red-500/25 text-red-300 border border-red-500/50 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              Something Wrong
            </span>
          ) : caseDetails?.isModified ? (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Modify
            </span>
          ) : null}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: DICOM Viewer Area */}
        <div className={`${viewMode === 'report' ? 'hidden' : viewMode === 'viewer' ? 'w-full' : 'w-1/2 lg:w-3/5'} flex flex-col bg-black border-r border-gray-800 relative z-10`}>
            {isDicom ? (
              <>
                {/* Viewer Tools Header */}
                <div className="bg-gray-950 px-3 py-2 border-b border-gray-800 flex flex-col gap-1.5 text-xs text-gray-300 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2 overflow-x-auto py-0.5">
                    {/* Primary Medical Tools */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTool('Wwwc')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Wwwc' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Window Width / Window Center (Contrast/Brightness)"
                      >
                        <span>☀️</span> WW/WC
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('Zoom')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Zoom' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Zoom in and out (Right click & drag)"
                      >
                        <span>🔍</span> Zoom
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('Pan')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Pan' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Pan / Move scan around"
                      >
                        <span>✋</span> Pan
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('Length')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Length' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Calibrated Measurement (mm)"
                      >
                        <span>📏</span> Length
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('Angle')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Angle' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Measure Standard Angle (Degrees)"
                      >
                        <span>📐</span> Angle
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('CobbAngle')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'CobbAngle' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Cobb Angle Tool (Spine Curvature & Orthopedic Alignment)"
                      >
                        <span>🦴</span> Cobb Angle
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('EllipticalRoi')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'EllipticalRoi' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Elliptical ROI (Mean HU, Area mm²)"
                      >
                        <span>⭕</span> Ellipse
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('FreehandRoi')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'FreehandRoi' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Freehand ROI (Irregular Tumor / Lesion Boundary, Area mm², HU)"
                      >
                        <span>✏️</span> Freehand
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('RectangleRoi')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'RectangleRoi' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Rectangle ROI"
                      >
                        <span>⏹️</span> Rect
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('Probe')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Probe' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Hounsfield Unit (HU) Pixel Probe"
                      >
                        <span>🎯</span> Probe
                      </button>
                      <button
                        type="button"
                        onClick={() => setTool('Magnify')}
                        className={`px-2 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1 ${activeTool === 'Magnify' ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}
                        title="Magnifying Glass Loupe"
                      >
                        <span>🔬</span> Magnify
                      </button>
                    </div>

                    {/* Window Presets Dropdown */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <select
                        value={selectedWindowPreset}
                        onChange={(e) => applyWindowPreset(e.target.value)}
                        className="bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-bold py-1 px-2 rounded border border-gray-700 cursor-pointer focus:outline-none"
                        title="Standard Medical Window Presets (WW/WC)"
                      >
                        <option value="default">🎚️ Window: Default</option>
                        <option value="brain">🧠 Brain (80/40)</option>
                        <option value="bone">🦴 Bone (2000/500)</option>
                        <option value="lung">🫁 Lung (1500/-600)</option>
                        <option value="soft">🥩 Soft Tissue (350/50)</option>
                        <option value="abdomen">🩺 Abdomen (400/40)</option>
                        <option value="mediastinum">❤️ Mediastinum (350/50)</option>
                      </select>
                    </div>
                  </div>

                  {/* Secondary Toolbar: Image Manipulation Actions */}
                  <div className="flex items-center justify-between border-t border-gray-800 pt-1 text-[11px]">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleInvert}
                        className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded font-bold transition cursor-pointer border border-gray-800"
                        title="Invert Image Contrast (Negative / Positive)"
                      >
                        🔄 Invert
                      </button>
                      <button
                        type="button"
                        onClick={handleRotate}
                        className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded font-bold transition cursor-pointer border border-gray-800"
                        title="Rotate 90 Degrees Clockwise"
                      >
                        🔃 Rotate 90°
                      </button>
                      <button
                        type="button"
                        onClick={handleFlipH}
                        className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded font-bold transition cursor-pointer border border-gray-800"
                        title="Flip Horizontally"
                      >
                        ↔ Flip H
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTagInspector(true)}
                        className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-cyan-400 rounded font-bold transition cursor-pointer border border-gray-800"
                        title="Inspect Complete DICOM Metadata & Acquisition Tags (TR/TE, kVp, Slice Thickness)"
                      >
                        🏷️ Tags
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAnnotations}
                        className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-amber-400 rounded font-bold transition cursor-pointer border border-gray-800"
                        title="Clear all drawings and annotations"
                      >
                        🗑️ Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-2 py-0.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded font-bold transition cursor-pointer border border-gray-800"
                        title="Reset image position, zoom, and contrast"
                      >
                        ↺ Reset
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/70 border border-cyan-800 px-2 py-0.5 rounded">
                        {caseDetails?.modality || dicomMeta?.modality || 'DICOM'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Viewport Canvas with Medical Overlays */}
                <div className="flex-1 w-full bg-black relative min-h-0 overflow-hidden flex items-center justify-center">
                  <div
                    ref={viewerRef}
                    className="w-full h-full bg-black relative"
                    style={{ minHeight: '300px' }}
                  />

                  {/* DICOM Info Overlays */}
                  <div className="absolute top-2.5 left-3 text-[11px] font-mono text-emerald-400 bg-black/70 px-2.5 py-1.5 rounded pointer-events-none space-y-0.5 border border-emerald-500/20 backdrop-blur-xs">
                    <p className="font-bold text-white">{caseDetails?.patientName || dicomMeta?.patientName || 'Patient'}</p>
                    <p className="text-gray-300 text-[10px]">ID: {caseDetails?.patientId || dicomMeta?.patientId || 'N/A'}</p>
                    <p className="text-gray-400 text-[10px]">{caseDetails?.patientAge ? `${caseDetails.patientAge}Y` : ''} {caseDetails?.patientGender || ''}</p>
                  </div>

                  <div className="absolute top-2.5 right-3 text-[11px] font-mono text-cyan-400 bg-black/70 px-2.5 py-1.5 rounded pointer-events-none text-right space-y-0.5 border border-cyan-500/20 backdrop-blur-xs">
                    <p className="font-bold">{dicomMeta?.manufacturer || 'Medical Scanner'}</p>
                    <p className="text-gray-300 text-[10px]">{dicomMeta?.scannerModel || caseDetails?.modality || 'CT/MRI'}</p>
                    {dicomMeta?.studyDate && <p className="text-gray-400 text-[10px]">{dicomMeta.studyDate}</p>}
                  </div>

                  <div className="absolute bottom-2.5 right-3 text-[11px] font-mono text-yellow-300 bg-black/80 px-2.5 py-1 rounded pointer-events-none border border-yellow-500/30">
                    Slice: <span className="font-bold text-white">{currentSlice + 1}</span> / {totalSlices || 1}
                    {dicomMeta?.sliceThickness ? ` (${dicomMeta.sliceThickness}mm)` : ''}
                  </div>
                </div>

                {/* Slice Navigation & Cine Player Bar */}
                {totalSlices > 1 && (
                  <div className="bg-gray-950 p-2.5 border-t border-gray-800 flex items-center gap-3 text-white text-xs flex-shrink-0">
                    {/* Cine Play/Pause */}
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className={`px-3 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                      title={isPlaying ? 'Pause Cine auto-playback' : 'Play Cine auto-playback through slices'}
                    >
                      <span>{isPlaying ? '⏸' : '▶'}</span>
                      <span>{isPlaying ? 'Pause' : 'Cine'}</span>
                    </button>

                    {/* FPS selector */}
                    <div className="hidden sm:flex items-center gap-1 bg-gray-900 p-0.5 rounded border border-gray-800 text-[10px]">
                      {[5, 15, 30].map(fps => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => handleFpsChange(fps)}
                          className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${cineFps === fps ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                          {fps}fps
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSliceChange(currentSlice - 1)}
                      disabled={currentSlice === 0 || isPlaying}
                      className={`px-2.5 py-1 rounded font-bold transition ${currentSlice === 0 || isPlaying ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'}`}
                    >
                      ◀ Prev
                    </button>

                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={totalSlices - 1}
                        value={currentSlice}
                        onChange={(e) => handleSliceChange(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <span className="text-[11px] font-mono text-gray-400 whitespace-nowrap">
                        {currentSlice + 1}/{totalSlices}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSliceChange(currentSlice + 1)}
                      disabled={currentSlice === totalSlices - 1 || isPlaying}
                      className={`px-2.5 py-1 rounded font-bold transition ${currentSlice === totalSlices - 1 || isPlaying ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'}`}
                    >
                      Next ▶
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-900 text-gray-300">
                <span className="text-5xl block mb-3">📁</span>
                <h3 className="text-base font-bold text-white">Study File Ready</h3>
                <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
                  This study is available as a full archive package. Download and open in RadiAnt DICOM Viewer or MicroDicom on your computer.
                </p>
                <a
                  href={`${API_BASE_URL}/api/cases/${id}/download?token=${localStorage.getItem('token')}`}
                  download
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>📥</span> Download Full Study Package (.zip)
                </a>
              </div>
            )}
        </div>

        {/* Right Side: Reporting Form Area */}
        <div className={`${viewMode === 'viewer' ? 'hidden' : viewMode === 'report' ? 'w-full max-w-5xl mx-auto' : 'w-1/2 lg:w-2/5'} bg-white p-6 sm:p-8 overflow-y-auto flex flex-col border-l border-gray-200`}>
          <div className="flex items-center justify-center mb-6 pb-4 border-b text-center">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-800">Diagnosis Report</h2>
              <p className="text-sm text-gray-500 mt-1">Record observations, impression, and recommendations in the editor below</p>
            </div>
          </div>

          {caseDetails?.isReportWrong && (
            <div className="bg-red-50 border-2 border-red-400 text-red-950 p-5 rounded-xl mb-6 shadow-md">
              <div className="flex items-start gap-3">
                <span className="px-3 py-1 bg-red-600 text-white font-black rounded-lg text-xs uppercase tracking-wider shadow-sm flex-shrink-0 mt-0.5">
                  ⚠️ Report Issue
                </span>
                <div className="flex-1">
                  <div className="font-extrabold text-red-900 text-sm">
                    Diagnostic Center Flagged an Issue With This Report:
                  </div>
                  <div className="mt-1.5 p-3 bg-white/90 border border-red-200 rounded-lg text-xs font-semibold text-red-800 shadow-inner">
                    "{caseDetails?.reportIssueDescription || 'Center requested a report correction.'}"
                  </div>
                  <p className="text-xs text-red-700 mt-2 font-medium">
                    Please correct the findings, impressions, or recommendations in the editor below and click <strong>Update & Save Report</strong> to finalize.
                  </p>
                </div>
              </div>
            </div>
          )}

          {caseDetails?.report && !caseDetails?.isReportWrong && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl mb-6 text-sm shadow-sm">
              <span className="font-bold flex items-center justify-center gap-1 mb-1">
                ✏️ Editing Mode Active
              </span>
              <p className="text-center text-amber-700">
                Loaded previously submitted diagnostic details. You can modify any findings below and save your edits.
              </p>
            </div>
          )}

          {message && <p className="mb-4 text-blue-600 text-center font-semibold">{message}</p>}
          
          {caseDetails?.isModified && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl mb-6 text-sm shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 bg-amber-500 text-white font-extrabold rounded-md text-xs uppercase tracking-wider shadow-sm">
                  Modify
                </span>
                <span className="font-semibold text-amber-900">
                  This study was re-uploaded and modified by the center. Please review the updated document and create the report.
                </span>
              </div>
              {caseDetails?.issueDescription && (
                <span className="text-xs text-amber-700 italic hidden sm:inline">
                  Previous issue: "{caseDetails.issueDescription}"
                </span>
              )}
            </div>
          )}

          {selectedTestName && (
            <div className="mb-4 px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase shadow-sm ${selectedModality === 'MRI' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'}`}>
                  {selectedModality || 'TEST'}
                </span>
                <span className="font-bold text-gray-800">Study: {selectedTestName}</span>
              </div>
              <span className="text-[11px] text-indigo-700 font-bold bg-white px-2.5 py-1 rounded-md shadow-xs border border-indigo-100">
                Rate configured by Admin
              </span>
            </div>
          )}

          {/* CT Templates Selection */}
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-center space-x-2 text-sm font-bold text-gray-800 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isCT} 
                onChange={(e) => {
                  setIsCT(e.target.checked);
                  if (!e.target.checked) setSelectedTemplateId('');
                  if (e.target.checked) {
                    setIsMRI(false);
                    setSelectedMriTemplateId('');
                  }
                }} 
                className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
              />
              <span>Use CT Report Templates</span>
            </label>
            
            {isCT && (
              <div className="mt-3">
                <select 
                  value={selectedTemplateId} 
                  onChange={handleTemplateChange}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                >
                  <option value="">-- Select CT Template Format --</option>
                  {CT_TEMPLATES.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-xs text-cyan-700 mt-2 font-medium bg-cyan-50 p-2 rounded border border-cyan-100 text-center">
                    Template loaded into editor below. You can now edit the contents.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* MRI Templates Selection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-center space-x-2 text-sm font-bold text-gray-800 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isMRI} 
                onChange={(e) => {
                  setIsMRI(e.target.checked);
                  if (!e.target.checked) setSelectedMriTemplateId('');
                  if (e.target.checked) {
                    setIsCT(false);
                    setSelectedTemplateId('');
                  }
                }} 
                className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span>Use MRI Report Templates</span>
            </label>
            
            {isMRI && (
              <div className="mt-3">
                <select 
                  value={selectedMriTemplateId} 
                  onChange={handleMriTemplateChange}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                >
                  <option value="">-- Select MRI Template Format --</option>
                  {MRI_TEMPLATES.map(template => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
                {selectedMriTemplateId && (
                  <p className="text-xs text-indigo-700 mt-2 font-medium bg-indigo-50 p-2 rounded border border-indigo-100 text-center">
                    Template loaded into editor below. You can now edit the contents.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Something Wrong Flagging */}
          <div className="mb-6 p-4 bg-red-50/50 rounded-xl border border-red-200">
            <label className="flex items-center space-x-2 text-sm font-bold text-red-900 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isSomethingWrong} 
                onChange={(e) => {
                  setIsSomethingWrong(e.target.checked);
                  if (!e.target.checked) setIssueText('');
                }} 
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Something Wrong
              </span>
            </label>

            {isSomethingWrong && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-red-700">
                  Describe what is wrong with the uploaded document/scan (e.g. wrong patient, missing slices, poor quality, wrong body part) to notify the center:
                </p>
                <textarea
                  rows="3"
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Explain what is wrong with the document..."
                  className="w-full p-3 border border-red-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleReportIssue}
                  disabled={submittingIssue}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {submittingIssue ? 'Submitting Issue...' : 'Submit Issue to Center'}
                </button>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 flex flex-col flex-1">
            <div className="flex-1 flex flex-col">
              <label className="block font-bold mb-2 text-lg text-gray-800">Report Editor</label>
              <SimpleEditor value={formData.clinicalFindings} onChange={(val) => setFormData({ ...formData, clinicalFindings: val })} minHeight="400px" />
            </div>
            
            <button
              type="submit"
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition transform hover:-translate-y-1 flex items-center justify-center gap-2 text-white ${
                caseDetails?.isReportWrong
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : caseDetails?.report
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {caseDetails?.isReportWrong
                ? 'Update & Resubmit Corrected Report'
                : caseDetails?.report
                  ? 'Update & Save Report'
                  : 'Submit & Sign Report'}
            </button>
          </form>
        </div>
      </div>

      {/* OHIF DICOM Integration Modal */}
      {showOhifModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔬</span>
                <div>
                  <h3 className="font-bold text-base text-white">OHIF DICOM v3 Integration</h3>
                  <p className="text-xs text-gray-400">Open Health Imaging Foundation JSON Manifest</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOhifModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              This case is formatted as an official <strong>OHIF v3 DICOM JSON Manifest</strong>. Any external or local OHIF Viewer can load this study directly with all slices, series, and DICOMweb streaming endpoints.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">OHIF Manifest URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${API_BASE_URL}/api/cases/${id}/ohif-manifest?token=${localStorage.getItem('token')}`}
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${API_BASE_URL}/api/cases/${id}/ohif-manifest?token=${localStorage.getItem('token')}`);
                    setCopiedOhifUrl(true);
                    setTimeout(() => setCopiedOhifUrl(false), 2000);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  {copiedOhifUrl ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Patient:</span>
                <span className="text-white font-bold">{caseDetails?.patientName || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Modality:</span>
                <span className="text-cyan-400 font-bold">{caseDetails?.modality || 'CT/MRI'}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Total Slices:</span>
                <span className="text-yellow-400 font-bold">{totalSlices} slices ready</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href={`https://viewer.ohif.org/viewer/dicomjson?url=${encodeURIComponent(`${API_BASE_URL}/api/cases/${id}/ohif-manifest?token=${localStorage.getItem('token')}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-center rounded-xl text-xs font-bold transition shadow-sm"
              >
                Open in Cloud OHIF Viewer ↗
              </a>
              <button
                type="button"
                onClick={() => setShowOhifModal(false)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DICOM Tag Inspector Modal */}
      {showTagInspector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏷️</span>
                <div>
                  <h3 className="font-bold text-base text-white">DICOM Tag Inspector</h3>
                  <p className="text-xs text-gray-400">Metadata, TR/TE, Slice Thickness, Tube Current & UIDs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTagInspector(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Filter Bar */}
            <div className="py-3 flex items-center gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Search tags by name, hex (e.g. 0018), or value (e.g. TR, mm, CT)..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                {tagSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTagSearchQuery('')}
                    className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800 px-2 py-1.5 rounded">
                {filteredTags.length} tags
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(displayTags, null, 2));
                  toast.success('Tags copied to clipboard as JSON!');
                }}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                📋 Copy All
              </button>
            </div>

            {/* Tags Table */}
            <div className="flex-1 overflow-y-auto border border-gray-800 rounded-xl min-h-0">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950 text-gray-400 border-b border-gray-800 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 font-mono">Tag</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-2 font-mono">VR</th>
                    <th className="py-2 px-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredTags.length > 0 ? (
                    filteredTags.map((t, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/50 transition">
                        <td className="py-2 px-3 font-mono text-cyan-400 font-bold whitespace-nowrap">{t.tag}</td>
                        <td className="py-2 px-3 text-gray-200 font-medium">{t.name}</td>
                        <td className="py-2 px-2 font-mono text-gray-500">{t.vr || '--'}</td>
                        <td className="py-2 px-3 font-mono text-yellow-300 break-all">{String(t.value)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500 italic">
                        No tags matching "{tagSearchQuery}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowTagInspector(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Volume Rendering & Multi-Planar Reconstruction (MPR) Modal */}
      {show3dMprModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧊</span>
                <div>
                  <h3 className="font-bold text-base text-white">3D Volume Rendering & Multi-Planar Reconstruction (MPR)</h3>
                  <p className="text-xs text-gray-400">High-Performance Volumetric Clinical Workstation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShow3dMprModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <span>📐</span>
                  <h4>Multi-Planar Reconstruction (MPR)</h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Converts 2D axial slices into simultaneous <strong>Axial, Sagittal, and Coronal</strong> views with 3D crosshairs and synchronized slice scrolling for spinal and thoracic pathology.
                </p>
              </div>

              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <span>🧊</span>
                  <h4>3D Volume Rendering</h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Interactive 3D transparent mesh & raycasting model of bone fractures, aortic aneurysms, and organ depths with 360° rotational inspection.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-800/40 rounded-xl p-3.5 text-xs text-blue-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-white">
                <span>⚡</span> Slices Status: {totalSlices} DICOM Slices Ready for Volumetric Raycasting
              </p>
              <p className="text-[11px] text-gray-300">
                You can launch the web-based OHIF 3D/MPR raycasting engine or open in dedicated desktop viewers (RadiAnt / MicroDicom) with full GPU acceleration.
              </p>
            </div>

            {API_BASE_URL.includes('localhost') && (
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 text-xs text-amber-200">
                <span className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>ℹ️</span> Localhost vs Cloud Viewer Notice:
                </span>
                <p className="mt-1 text-[11px] text-amber-200/90 leading-relaxed">
                  <strong>viewer.ohif.org</strong> is hosted on HTTPS in the cloud, so modern browsers block it from calling private <code>http://localhost:8000</code> (Mixed Content Security Block). For full 3D Volume Rendering & MPR right now on your computer, click <strong>RadiAnt 3D Archive</strong> below to open all {totalSlices} slices in RadiAnt or MicroDicom with full GPU acceleration! (In production on an HTTPS domain, OHIF Web Viewer connects automatically).
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <a
                href={`https://viewer.ohif.org/viewer/dicomjson?url=${encodeURIComponent(`${API_BASE_URL}/api/cases/${id}/ohif-manifest?token=${localStorage.getItem('token')}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-center rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>🔬</span> Launch in OHIF 3D / MPR Web Viewer ↗
              </a>
              <a
                href={`${API_BASE_URL}/api/cases/${id}/download?token=${localStorage.getItem('token')}`}
                download
                className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-center rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>📥</span> RadiAnt 3D Archive (.zip)
              </a>
              <button
                type="button"
                onClick={() => setShow3dMprModal(false)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
