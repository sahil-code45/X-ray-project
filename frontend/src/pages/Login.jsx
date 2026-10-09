import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [regRole, setRegRole] = useState('center');
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const fillDemo = (email, password) => {
    setFormData({ email, password });
    setIsLogin(true);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      if (isLogin) {
        const res = await axios.post('http://localhost:8000/api/auth/login', formData);
        localStorage.setItem('token', res.data.token);
        
        // Redirect based on role
        if (res.data.role === 'admin') navigate('/admin');
        else if (res.data.role === 'doctor') navigate('/doctor');
        else if (res.data.role === 'center' || res.data.role === 'vendor') navigate('/center');
        else navigate('/admin');
      } else {
        if (regRole === 'center') {
          await axios.post('http://localhost:8000/api/auth/register/center', formData);
          setMessage('Diagnostic Center registered successfully! Please sign in.');
        } else {
          await axios.post('http://localhost:8000/api/auth/register/admin', formData);
          setMessage('Admin registered successfully! Please sign in.');
        }
        setIsLogin(true);
        setFormData({ email: '', password: '' });
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 absolute top-0 left-0 z-50">
      {/* Left Side - Banner */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-12">
        <div className="bg-white px-8 py-5 rounded-2xl shadow-2xl mb-8 flex items-center justify-center space-x-4">
          <img src="/logo.png" alt="ANNRAD Tele-Radiology" className="h-16 w-auto object-contain" />
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">Tele-Radiology</h1>
        </div>
        <p className="text-lg text-blue-100 max-w-md text-center leading-relaxed">
          Streamlining medical diagnosis with advanced DICOM viewing, atomic case claiming, and automated settlements.
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl border border-gray-100">
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-6 lg:hidden">
              <img src="/logo.png" alt="ANNRAD Logo" className="h-10 w-auto object-contain" />
              <h1 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">Tele-Radiology</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">
              {isLogin ? 'Sign In to Portal' : (regRole === 'center' ? 'Register Diagnostic Center' : 'Create Admin Account')}
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {isLogin ? 'Sign in to access Diagnostic Center, Doctor, or Admin dashboard' : 'Create your account to start managing studies'}
            </p>
          </div>

          {!isLogin && (
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setRegRole('center')}
                className={`flex-1 py-2 rounded-md transition ${regRole === 'center' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                Diagnostic Center
              </button>
              <button
                type="button"
                onClick={() => setRegRole('admin')}
                className={`flex-1 py-2 rounded-md transition ${regRole === 'admin' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                Admin
              </button>
            </div>
          )}

          {message && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                name="email" 
                required 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                placeholder={regRole === 'center' ? 'center@diagnostics.com' : 'admin@example.com'}
                value={formData.email} 
                onChange={handleChange} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                name="password" 
                required 
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                placeholder="••••••••"
                value={formData.password} 
                onChange={handleChange} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : (regRole === 'center' ? 'Register Diagnostic Center' : 'Register Admin'))}
            </button>
          </form>

          {/* Quick Demo Login Pills */}
          {isLogin && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">Quick Demo Accounts</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('center@teleradiology.com', 'center123')}
                  className="px-2 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-semibold border border-blue-200 transition"
                >
                  🏥 Center
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('doctor@teleradiology.com', 'doctor123')}
                  className="px-2 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md font-semibold border border-emerald-200 transition"
                >
                  🩺 Doctor
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('admin@teleradiology.com', 'admin123')}
                  className="px-2 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md font-semibold border border-purple-200 transition"
                >
                  ⚙️ Admin
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Need a Center or Admin account? " : "Already have an account? "}
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                className="text-blue-600 hover:text-blue-800 font-semibold focus:outline-none"
              >
                {isLogin ? 'Register here' : 'Sign in here'}
              </button>
            </p>
          </div>

          {isLogin && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-2">Are you a Radiologist / Doctor?</p>
              <Link to="/register/doctor" className="inline-block text-xs text-indigo-600 hover:text-indigo-800 font-bold">
                Apply for Doctor KYC Verification &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
