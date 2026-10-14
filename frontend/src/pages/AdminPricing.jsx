import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import { API_BASE_URL } from '../config';
import { toast } from 'react-toastify';

// Modern Custom Select Component with Search, Icons, and Smooth Popover
function ModernSelect({
  label,
  required,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchPlaceholder = 'Search option...',
  showSearch = true,
  helperText,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter(
    (o) =>
      !search.trim() ||
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-left text-sm transition flex items-center justify-between gap-2 cursor-pointer shadow-2xs ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
            : 'border-gray-300 bg-gray-50 hover:bg-white hover:border-gray-400'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption?.icon && (
            <span className="text-base shrink-0">{selectedOption.icon}</span>
          )}
          <span
            className={`truncate ${
              selectedOption
                ? 'text-gray-900 font-semibold'
                : 'text-gray-400 font-normal'
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {helperText && !isOpen && (
        <p className="text-[11px] text-gray-400 mt-1">{helperText}</p>
      )}

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search inside popover */}
          {showSearch && options.length > 5 && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/80">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 text-xs pointer-events-none">
                  🔍
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold border-l-4 border-indigo-600'
                        : 'text-gray-700 hover:bg-indigo-50/60 hover:text-gray-900'
                    } ${
                      opt.isCustom
                        ? 'border-t border-dashed border-gray-200 mt-1 pt-2 font-semibold text-indigo-600 hover:bg-indigo-50/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.icon && (
                        <span className="text-base shrink-0">{opt.icon}</span>
                      )}
                      <div className="truncate">
                        <p className="truncate leading-snug">{opt.label}</p>
                        {opt.sublabel && (
                          <p className="text-[10px] text-gray-400 font-normal truncate mt-0.5">
                            {opt.sublabel}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-indigo-600 text-sm font-black shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPricing() {
  const [pricings, setPricings] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [standardTests, setStandardTests] = useState({ CT: [], MRI: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add Rate Form State
  const [selectedDoctorId, setSelectedDoctorId] = useState(''); // '' means All Doctors (default)
  const [selectedModality, setSelectedModality] = useState('CT');
  const [selectedTestName, setSelectedTestName] = useState('');
  const [customTestName, setCustomTestName] = useState('');
  const [priceInput, setPriceInput] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [modalDoctorId, setModalDoctorId] = useState('');
  const [modalModality, setModalModality] = useState('CT');
  const [modalTestName, setModalTestName] = useState('');
  const [modalCustomTest, setModalCustomTest] = useState('');
  const [modalPrice, setModalPrice] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterModality, setFilterModality] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [pricingRes, docsRes, testsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/pricing`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/approved-users`, { headers }),
        axios.get(`${API_BASE_URL}/api/pricing/tests`, { headers })
      ]);

      setPricings(pricingRes.data || []);
      const docList = docsRes.data || [];
      setDoctors(docList);
      setStandardTests(testsRes.data?.tests || { CT: [], MRI: [] });

      // Automatically select first doctor if available and none selected yet
      if (docList.length > 0) {
        setSelectedDoctorId((prev) => prev || String(docList[0].id));
      } else {
        setSelectedDoctorId('');
      }

      // Default select first test if not selected
      if (testsRes.data?.tests?.CT?.length > 0 && !selectedTestName) {
        setSelectedTestName(testsRes.data.tests.CT[0]);
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
      } else {
        toast.error('Failed to load pricing configurations.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEditModalOpen) {
        setIsEditModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen]);

  const handleModalityChange = (modality) => {
    setSelectedModality(modality);
    const list = standardTests[modality] || [];
    if (list.length > 0) {
      setSelectedTestName(list[0]);
    } else {
      setSelectedTestName('');
    }
    setCustomTestName('');
  };

  const handleModalModalityChange = (modality) => {
    setModalModality(modality);
    const list = standardTests[modality] || [];
    if (list.length > 0) {
      setModalTestName(list[0]);
    } else {
      setModalTestName('');
    }
    setModalCustomTest('');
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      toast.warning('Please select an approved doctor.');
      return;
    }
    const finalTest = selectedTestName === '__custom__' ? customTestName.trim() : selectedTestName.trim();
    if (!finalTest) {
      toast.warning('Please select or specify a test name.');
      return;
    }
    if (!priceInput || isNaN(parseFloat(priceInput)) || parseFloat(priceInput) < 0) {
      toast.warning('Please enter a valid positive price amount.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(`${API_BASE_URL}/api/pricing`, {
        doctorId: parseInt(selectedDoctorId),
        modality: selectedModality,
        testName: finalTest,
        price: parseFloat(priceInput)
      }, { headers });
      toast.success('Test price saved successfully!');

      setPriceInput('');
      setCustomTestName('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save test price');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p) => {
    setEditItem(p);
    setModalDoctorId(p.doctorId ? String(p.doctorId) : (doctors[0] ? String(doctors[0].id) : ''));
    const modality = p.modality || 'CT';
    setModalModality(modality);
    setModalPrice(String(p.price));

    const standardList = standardTests[modality] || [];
    if (standardList.includes(p.testName)) {
      setModalTestName(p.testName);
      setModalCustomTest('');
    } else {
      setModalTestName('__custom__');
      setModalCustomTest(p.testName);
    }

    setIsEditModalOpen(true);
  };

  const handleModalUpdate = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    if (!modalDoctorId) {
      toast.warning('Please select an approved doctor.');
      return;
    }

    const finalTest = modalTestName === '__custom__' ? modalCustomTest.trim() : modalTestName.trim();
    if (!finalTest) {
      toast.warning('Please select or enter a test name.');
      return;
    }
    if (!modalPrice || isNaN(parseFloat(modalPrice)) || parseFloat(modalPrice) < 0) {
      toast.warning('Please enter a valid positive price amount.');
      return;
    }

    setModalSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.put(`${API_BASE_URL}/api/pricing/${editItem.id}`, {
        doctorId: parseInt(modalDoctorId),
        modality: modalModality,
        testName: finalTest,
        price: parseFloat(modalPrice)
      }, { headers });

      toast.success('Test price updated successfully!');
      setIsEditModalOpen(false);
      setEditItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update test price');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDelete = async (id, testTitle) => {
    if (!window.confirm(`Are you sure you want to delete the price for "${testTitle}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/pricing/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Price deleted successfully.');
      if (editItem && editItem.id === id) {
        setIsEditModalOpen(false);
        setEditItem(null);
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete price.');
    }
  };

  // Filtered pricing records
  const filteredPricings = pricings.filter((p) => {
    const q = searchTerm.toLowerCase().trim();
    const docName = p.doctor?.doctorProfile?.name?.toLowerCase() || '';
    const docEmail = p.doctor?.email?.toLowerCase() || '';
    const matchesSearch = !q || p.testName.toLowerCase().includes(q) || docName.includes(q) || docEmail.includes(q);

    let matchesDoc = true;
    if (filterDoctor !== 'all') {
      matchesDoc = String(p.doctorId) === filterDoctor;
    }

    const matchesModality = filterModality === 'all' || p.modality === filterModality;

    return matchesSearch && matchesDoc && matchesModality;
  });

  const totalPages = Math.ceil(filteredPricings.length / pageSize) || 1;
  const paginatedPricings = filteredPricings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Metrics
  const totalRates = pricings.length;
  const ctCount = pricings.filter(p => p.modality === 'CT').length;
  const mriCount = pricings.filter(p => p.modality === 'MRI').length;
  const customDocCount = new Set(pricings.filter(p => p.doctorId !== null).map(p => p.doctorId)).size;

  // Dropdown options - strictly approved doctors
  const doctorOptions = doctors.map(d => ({
    value: String(d.id),
    label: d.doctorProfile?.name ? `Dr. ${d.doctorProfile.name}` : d.email,
    sublabel: d.doctorProfile?.phoneNumber ? `Phone: ${d.doctorProfile.phoneNumber} • ${d.email}` : d.email,
    icon: '👨‍⚕️'
  }));

  const modalTestOptions = [
    ...(standardTests[modalModality] || []).map(t => ({
      value: t,
      label: t,
      icon: modalModality === 'MRI' ? '🧲' : '🔬'
    })),
    {
      value: '__custom__',
      label: '➕ Other / Custom Test Name...',
      sublabel: 'Type custom study name',
      isCustom: true
    }
  ];

  const formTestOptions = [
    ...(standardTests[selectedModality] || []).map(t => ({
      value: t,
      label: t,
      icon: selectedModality === 'MRI' ? '🧲' : '🔬'
    })),
    {
      value: '__custom__',
      label: '➕ Other / Custom Test Name...',
      sublabel: 'Type custom study name',
      isCustom: true
    }
  ];

  return (
    <div className="bg-transparent h-full flex flex-col">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <span>💳</span> Doctor Payment & Test Pricing Setup
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure per-test payouts for registered and approved doctors. When a doctor completes a report, their payout reflects these exact rates.
            </p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Test Rates</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalRates}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">CT Scan Tests</p>
            <p className="text-2xl font-black text-cyan-700 mt-1">{ctCount}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">MRI Scan Tests</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{mriCount}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Doctors Configured</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{customDocCount}</p>
          </div>
        </div>

        {/* Add Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <span>➕ Configure Test Price</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Set individual test rates for registered & approved doctors.
              </p>
            </div>
          </div>

          {doctors.length === 0 ? (
            <div className="p-8 text-center bg-amber-50/80 border border-amber-200 rounded-2xl shadow-xs">
              <span className="text-4xl block mb-2">👨‍⚕️</span>
              <h3 className="text-base font-extrabold text-amber-900">No Approved Doctors Found</h3>
              <p className="text-xs text-amber-700 max-w-lg mx-auto mt-1 leading-relaxed">
                Prices can only be configured for registered and approved doctors. Once a doctor registers and is approved in <strong>KYC Approvals</strong>, they will automatically appear here so you can set their test rates.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSavePrice} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Doctor Selector */}
                <div>
                  <ModernSelect
                    label="Target Doctor"
                    required
                    value={selectedDoctorId}
                    onChange={(val) => setSelectedDoctorId(val)}
                    options={doctorOptions}
                    placeholder="Select Approved Doctor..."
                    searchPlaceholder="Search doctor..."
                    helperText="Rate applies to the selected approved doctor"
                  />
                </div>

                {/* Modality Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Modality <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleModalityChange('CT')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        selectedModality === 'CT'
                          ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>🔬</span> CT Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModalityChange('MRI')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                        selectedModality === 'MRI'
                          ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>🧲</span> MRI Scan
                    </button>
                  </div>
                </div>

                {/* Test Name Selector */}
                <div>
                  <ModernSelect
                    label="Test / Study Name"
                    required
                    value={selectedTestName}
                    onChange={(val) => setSelectedTestName(val)}
                    options={formTestOptions}
                    placeholder="Select Test / Study..."
                    searchPlaceholder="Search study name..."
                  />

                  {selectedTestName === '__custom__' && (
                    <input
                      type="text"
                      required
                      placeholder="Enter custom test name e.g. CT Cardiac"
                      value={customTestName}
                      onChange={(e) => setCustomTestName(e.target.value)}
                      className="w-full mt-2.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Price Input & Submit */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Doctor Fee (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1"
                        placeholder="e.g. 500"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-gray-300 bg-gray-50 focus:bg-white text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Pricing List Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden">
          {/* Table Header & Search Filter */}
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <h3 className="text-base font-extrabold text-gray-900 tracking-tight whitespace-nowrap">
                Configured Rates
              </h3>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {filteredPricings.length} {filteredPricings.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  placeholder="Search test or doctor..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
              </div>

              {/* Filter Doctor */}
              <select
                value={filterDoctor}
                onChange={(e) => {
                  setFilterDoctor(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="all">All Approved Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={String(d.id)}>
                    👨‍⚕️ {d.doctorProfile?.name ? `Dr. ${d.doctorProfile.name}` : d.email}
                  </option>
                ))}
              </select>

              {/* Filter Modality */}
              <select
                value={filterModality}
                onChange={(e) => {
                  setFilterModality(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="all">All Modalities</option>
                <option value="CT">CT Scan Only</option>
                <option value="MRI">MRI Scan Only</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Doctor</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Modality</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Test / Study Name</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Doctor Rate</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Updated</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-sm">
                {paginatedPricings.map((p) => {
                  const docName = p.doctor?.doctorProfile?.name;

                  return (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Doctor */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {docName ? docName.charAt(0).toUpperCase() : 'D'}
                          </span>
                          <div className="truncate">
                            <p className="font-bold text-gray-900 text-xs truncate">
                              {docName ? `Dr. ${docName}` : 'Doctor'}
                            </p>
                            <p className="text-[11px] text-gray-400 truncate">{p.doctor?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Modality */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          p.modality === 'MRI'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                        }`}>
                          {p.modality}
                        </span>
                      </td>

                      {/* Test Name */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 text-sm">{p.testName}</p>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          ₹{Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Updated */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(p)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-semibold text-xs border border-indigo-200 transition cursor-pointer"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.testName)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md font-semibold text-xs border border-red-200 transition cursor-pointer"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredPricings.length === 0 && !loading && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <span className="text-3xl block mb-2">📋</span>
                      <p className="text-base font-bold text-gray-700">No test pricing configured</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        {doctors.length === 0
                          ? 'Once doctors register and are approved, you can set custom pricing for each CT and MRI study.'
                          : 'Select an approved doctor from the form above to configure their test rates.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Test Price Modal (Popup) */}
      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          {/* Backdrop overlay click */}
          <div 
            className="fixed inset-0" 
            onClick={() => !modalSubmitting && setIsEditModalOpen(false)} 
          />

          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full z-10 overflow-visible transform transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4.5 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  ✏️
                </span>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Edit Test Rate</h3>
                  <p className="text-xs text-indigo-100">
                    {editItem.doctor?.doctorProfile?.name 
                      ? `Rate for Dr. ${editItem.doctor.doctorProfile.name}`
                      : (editItem.doctor?.email || 'Doctor Rate')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={modalSubmitting}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleModalUpdate} className="p-6 space-y-4 rounded-b-2xl">
              {/* Doctor Selection */}
              <div>
                <ModernSelect
                  label="Target Doctor"
                  required
                  value={modalDoctorId}
                  onChange={(val) => setModalDoctorId(val)}
                  options={doctorOptions}
                  placeholder="Select Approved Doctor..."
                  searchPlaceholder="Search doctor..."
                  helperText="Rate applies specifically to this approved doctor"
                />
              </div>

              {/* Modality Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Modality <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleModalModalityChange('CT')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                      modalModality === 'CT'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-800 shadow-xs ring-2 ring-cyan-400/20'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>🔬</span> CT Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModalModalityChange('MRI')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 border ${
                      modalModality === 'MRI'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-xs ring-2 ring-purple-400/20'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>🧲</span> MRI Scan
                  </button>
                </div>
              </div>

              {/* Test / Study Name */}
              <div>
                <ModernSelect
                  label="Test / Study Name"
                  required
                  value={modalTestName}
                  onChange={(val) => setModalTestName(val)}
                  options={modalTestOptions}
                  placeholder="Select Test / Study..."
                  searchPlaceholder="Search study name..."
                />

                {modalTestName === '__custom__' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom study name"
                    value={modalCustomTest}
                    onChange={(e) => setModalCustomTest(e.target.value)}
                    className="w-full mt-2.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              {/* Doctor Fee (₹) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Doctor Fee (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold text-base">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 500"
                    value={modalPrice}
                    onChange={(e) => setModalPrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-extrabold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={modalSubmitting}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <span>💾</span> Update Price
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

