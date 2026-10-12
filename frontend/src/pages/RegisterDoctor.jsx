import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function RegisterDoctor() {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', age: '', gender: 'Male', registrationNumber: '', panCard: '', aadhaarCard: '', address: '', phoneNumber: '', reportFee: ''
  });
  const [mbbsDegreeFile, setMbbsDegreeFile] = useState(null);
  const [pgDegreeFile, setPgDegreeFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    setSignatureFile(file);
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setSignaturePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setSignaturePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      if (isLogin) {
        // Doctor Login
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email: formData.email, password: formData.password });
        localStorage.setItem('token', res.data.token);
        if (res.data.role === 'doctor') {
            navigate('/doctor');
        } else {
            navigate('/admin'); // Just in case admin logs in here
        }
      } else {
        // Doctor Registration
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (mbbsDegreeFile) {
          data.append('mbbsDegreeFile', mbbsDegreeFile);
          data.append('degreeFile', mbbsDegreeFile); // For compatibility
        }
        if (pgDegreeFile) data.append('pgDegreeFile', pgDegreeFile);
        if (signatureFile) data.append('signatureFile', signatureFile);

        await axios.post(`${API_BASE_URL}/api/auth/register/doctor`, data);
        setMessage('Registration successful! Please wait for Admin approval.');
        setTimeout(() => setIsLogin(true), 3000);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50 absolute top-0 left-0 z-50 overflow-y-auto">
      {/* Centered Form */}
      <div className="w-full flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-2xl bg-white p-8 sm:p-10 rounded-2xl shadow-2xl border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              {isLogin ? 'Doctor Login' : 'Doctor KYC Registration'}
            </h2>
            <p className="text-gray-500 mt-2">
              {isLogin ? 'Welcome back! Please enter your credentials.' : 'Submit your details and credentials for verification.'}
            </p>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('successful') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isLogin ? (
              // Login Form Fields
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" name="email" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="doctor@example.com" value={formData.email} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" name="password" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                </div>
              </div>
            ) : (
              // Registration Form Fields
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" name="name" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="Dr. John Doe" value={formData.name} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input type="email" name="email" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="doctor@example.com" value={formData.email} onChange={handleChange} />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                    <input type="password" name="password" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="••••••••" value={formData.password} onChange={handleChange} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input type="number" name="age" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="35" value={formData.age} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select name="gender" value={formData.gender} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" onChange={handleChange}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Number (MCI / State Council) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="registrationNumber" 
                      required 
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white font-medium" 
                      placeholder="e.g. MCI-123456 or DMC/R/9876" 
                      value={formData.registrationNumber} 
                      onChange={handleChange} 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card Number</label>
                    <input type="text" name="panCard" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="ABCDE1234F" value={formData.panCard} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Card Number</label>
                    <input type="text" name="aadhaarCard" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="1234 5678 9012" value={formData.aadhaarCard} onChange={handleChange} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input type="text" name="phoneNumber" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="+91 9876543210" value={formData.phoneNumber} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Fee (₹)</label>
                    <input type="number" name="reportFee" required className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="e.g. 500" value={formData.reportFee} onChange={handleChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Clinic / Home Address</label>
                  <textarea name="address" required rows="2" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" placeholder="Enter your full address" value={formData.address} onChange={handleChange}></textarea>
                </div>

                {/* Medical Qualifications & Signature Uploads */}
                <div className="pt-4 border-t border-gray-200 space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📑</span> Medical Credentials & Documents
                  </h3>

                  {/* MBBS Degree Certificate */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="block text-sm font-bold text-gray-800 mb-1">
                      MBBS Degree Certificate (Image / PDF) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Upload your official MBBS degree or pass certificate.</p>
                    <input 
                      type="file" 
                      name="mbbsDegreeFile" 
                      required 
                      accept=".pdf,image/*" 
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      onChange={(e) => setMbbsDegreeFile(e.target.files[0])} 
                    />
                    {mbbsDegreeFile && (
                      <span className="text-xs text-emerald-600 font-semibold mt-1.5 inline-block">
                        ✓ Selected: {mbbsDegreeFile.name}
                      </span>
                    )}
                  </div>

                  {/* PG Degree Certificate */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-gray-800">
                        PG Degree / Diploma Certificate (MD / DNB / DMRD)
                      </label>
                      <span className="text-[11px] text-gray-500 font-medium bg-gray-200/80 px-2 py-0.5 rounded">Optional</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Upload your MD, DNB, DMRD or relevant radiology specialization certificate.</p>
                    <input 
                      type="file" 
                      name="pgDegreeFile" 
                      accept=".pdf,image/*" 
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      onChange={(e) => setPgDegreeFile(e.target.files[0])} 
                    />
                    {pgDegreeFile && (
                      <span className="text-xs text-emerald-600 font-semibold mt-1.5 inline-block">
                        ✓ Selected: {pgDegreeFile.name}
                      </span>
                    )}
                  </div>

                  {/* Signature Image Upload */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-gray-800">
                        Doctor Digital Signature (PNG / JPG) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">For Report PDF</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Upload a clear photo or scan of your signature on white paper.</p>
                    <input 
                      type="file" 
                      name="signatureFile" 
                      required 
                      accept="image/png,image/jpeg,image/jpg" 
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" 
                      onChange={handleSignatureChange} 
                    />
                    {signaturePreview && (
                      <div className="mt-3 p-2.5 bg-white rounded-lg border border-gray-200 inline-block shadow-sm">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Signature Preview:</p>
                        <img src={signaturePreview} alt="Signature Preview" className="h-14 max-w-[200px] object-contain border border-dashed border-gray-300 p-1 rounded bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 px-4 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all disabled:opacity-50 text-lg"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Submit Application')}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already verified? "}
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                className="text-indigo-600 hover:text-indigo-800 font-semibold focus:outline-none"
              >
                {isLogin ? 'Register Here' : 'Login Here'}
              </button>
            </p>
            {isLogin && (
              <p className="text-sm text-gray-600 mt-2">
                <Link to="/login" className="text-gray-500 hover:text-gray-800 focus:outline-none underline">
                  Admin Login
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
