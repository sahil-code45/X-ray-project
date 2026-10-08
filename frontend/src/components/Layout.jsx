import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Layout({ children, role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openPoolCount, setOpenPoolCount] = useState(0);
  const [adminPendingCount, setAdminPendingCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        if (role === 'doctor') {
          const res = await axios.get('http://localhost:8000/api/cases/available', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setOpenPoolCount(res.data.availableCases?.length || 0);
        } else if (role === 'admin') {
          const res = await axios.get('http://localhost:8000/api/admin/pending-users', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAdminPendingCount(res.data?.length || 0);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 8000);
    return () => clearInterval(interval);
  }, [role, location.pathname]);

  const adminLinks = [
    { name: 'Overview', path: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Upload Data', path: '/admin-upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { name: 'All Doctors', path: '/admin-doctors', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'KYC Approvals', path: '/admin-approvals', badge: adminPendingCount, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { name: 'Doctor Payouts', path: '/admin-payouts', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  const doctorLinks = [
    { 
      name: 'Dashboard', 
      path: '/doctor', 
      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' 
    },
    {
      name: 'Open Pool Requests',
      path: '/doctor/open-pool',
      badge: openPoolCount,
      icon: 'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z'
    },
    {
      name: 'Completed Reports',
      path: '/doctor/completed-reports',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ];

  const links = role === 'admin' ? adminLinks : doctorLinks;

  // The Doctor Workspace is a special full-screen view.
  const isWorkspace = location.pathname.includes('/workspace/');

  if (isWorkspace) {
    return <div className="h-screen w-screen overflow-hidden bg-gray-50">{children}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shadow-sm flex-shrink-0 relative">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Tele-Radiology</h1>
          <p className="text-xs text-gray-500 font-medium uppercase mt-1">{role === 'admin' ? 'Admin Portal' : 'Doctor Portal'}</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {links.map((link) => {
            const isActive = link.path === '/admin' 
              ? location.pathname === '/admin' 
              : link.path === '/doctor'
                ? location.pathname === '/doctor'
                : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center min-w-0">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={link.icon}></path>
                  </svg>
                  <span className="truncate">{link.name}</span>
                </div>
                {link.badge !== undefined && (
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? 'bg-white text-blue-700'
                      : link.badge > 0
                        ? 'bg-cyan-500 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 flex flex-col items-center">
          <div className="flex items-center mb-4 text-blue-800">
            <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12.99H5V7.4l7-3.11v8.7z" />
            </svg>
            <div className="flex flex-col border-l-2 border-blue-800 pl-2 leading-none">
              <span className="text-xs font-bold tracking-widest">HIPAA</span>
              <span className="text-[10px] font-semibold tracking-wider">COMPLIANT</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 text-center mb-4 leading-tight">
            © Copyright 2016 - 2026 by 5C Network.<br/>
            All Rights Reserved.
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-gray-100">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
