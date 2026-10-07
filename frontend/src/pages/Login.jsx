import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
      } else {
        await axios.post('http://localhost:8000/api/auth/register/admin', formData);
        setMessage('Admin registered successfully! Please login.');
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
        <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Tele-Radiology<br/>Platform</h1>
        <p className="text-lg text-blue-100 max-w-md text-center leading-relaxed">
          Streamlining medical diagnosis with advanced DICOM viewing, atomic case claiming, and automated settlements.
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              {isLogin ? 'Welcome Back' : 'Create Admin Account'}
            </h2>
            <p className="text-gray-500 mt-2">
              {isLogin ? 'Sign in to access your dashboard' : 'Register as a system administrator'}
            </p>
          </div>

          {message && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                name="email" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin@example.com"
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
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                value={formData.password} 
                onChange={handleChange} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register Admin')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an admin account? " : "Already have an account? "}
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
            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-3">Are you a Doctor?</p>
              <Link to="/register/doctor" className="inline-block text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                Apply for Doctor KYC &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
